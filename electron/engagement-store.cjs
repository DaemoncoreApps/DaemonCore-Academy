const dnsPromises = require('dns/promises')
const { lookup } = dnsPromises
const { mkdir, readFile, rename, writeFile } = require('fs/promises')
const http = require('http')
const https = require('https')
const net = require('net')
const path = require('path')
const tls = require('tls')
const { createHash, randomUUID } = require('crypto')
const { ToolBridge, TOOL_CATALOG } = require('./tool-bridge.cjs')
const { TrustAuthority } = require('./trust-authority.cjs')
const { executionPolicy, publicExecutionProfiles } = require('./execution-policy.cjs')

const cleanState = () => ({ schemaVersion: 8, engagements: [], operatorJobs: [], campaigns: [], chaosRuns: [], captures: [], findings: [], audit: [] })
const clone = value => JSON.parse(JSON.stringify(value))
const captureDigest = capture => { const { digest: _digest, ...unsigned }=capture;return createHash('sha256').update(JSON.stringify(unsigned)).digest('hex') }
const hostnamePattern = /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

function isPublicAddress(address) {
  if (net.isIPv4(address)) {
    const [a,b,c] = address.split('.').map(Number)
    return !(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===192&&b===0&&c===0)||(a===192&&b===0&&c===2)||(a===198&&(b===18||b===19))||(a===198&&b===51&&c===100)||(a===203&&b===0&&c===113)||(a===100&&b>=64&&b<=127))
  }
  if (net.isIPv6(address)) {
    const value=address.toLowerCase()
    return !(value==='::'||value==='::1'||value.startsWith('::ffff:')||value.startsWith('fc')||value.startsWith('fd')||value.startsWith('fe8')||value.startsWith('fe9')||value.startsWith('fea')||value.startsWith('feb')||value.startsWith('ff')||value.startsWith('2001:db8'))
  }
  return false
}

function isPrivateAddress(address) {
  if(net.isIPv4(address)){const [a,b]=address.split('.').map(Number);return a===10||(a===172&&b>=16&&b<=31)||(a===192&&b===168)}
  if(net.isIPv6(address)){const value=address.toLowerCase();return value.startsWith('fc')||value.startsWith('fd')}
  return false
}

function normalizeTarget(value) {
  const target=String(value||'').trim().toLowerCase().replace(/\.$/,'')
  if (!net.isIP(target) && !hostnamePattern.test(target)) throw new Error(`Invalid target: ${value}`)
  return target
}

function normalizeHttpPath(value) {
  const requestPath=String(value||'/').trim()
  if(!requestPath.startsWith('/')||requestPath.length>500||/[\r\n]/.test(requestPath))throw new Error('HTTP path must start with / and contain no control characters')
  return requestPath
}

const pause=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds))
const stableValues=values=>[...new Set((values||[]).map(value=>String(value)))].sort()
const delta=(before,after)=>({added:after.filter(value=>!before.includes(value)),removed:before.filter(value=>!after.includes(value))})
const webPorts=new Set([80,443,3000,5000,8000,8080,8081,8443,8888,9443])
const serviceByPort={21:'ftp',22:'ssh',25:'smtp',53:'dns',80:'http',110:'pop3',143:'imap',389:'ldap',443:'https',445:'smb',465:'smtps',587:'smtp-submission',636:'ldaps',993:'imaps',995:'pop3s',1433:'mssql',1521:'oracle',2049:'nfs',2375:'docker',2376:'docker-tls',3000:'http-alt',3306:'mysql',3389:'rdp',5000:'http-alt',5432:'postgresql',5672:'amqp',6379:'redis',8000:'http-alt',8080:'http-alt',8081:'http-alt',8443:'https-alt',8888:'http-alt',9200:'elasticsearch',9443:'https-alt',27017:'mongodb'}
const campaignProfiles={inventory:['deep-inventory'],surface:['dns-profile','surface'],complete:['dns-profile','deep-inventory','surface']}
const activeCampaignStatuses=new Set(['queued','running','pause-requested','paused','cancelling'])
const activeJobStatuses=new Set(['queued','starting','running','cancelling'])
const observedOperations=new Set(['dns','tcp','http','tls','http-posture','service-profile'])
const safeExecutionPolicy=value=>{try{return executionPolicy(value)}catch{return executionPolicy('guarded')}}
const executionCapacity=(profile,input,targets,ports)=>{
  const policy=executionPolicy(profile)
  const requested=input&&typeof input==='object'?input:{}
  const professional=policy.id==='professional'
  const maxTargets=professional?targets.length:policy.maxTargets
  const maxPorts=professional?ports.length:policy.maxPorts
  const workers=Number(requested.portConcurrency??policy.portConcurrency)
  const timeoutMs=Number(requested.nmapTimeoutMs??policy.nmapTimeoutMs)
  const maxWorkers=professional?64:8,maxTimeout=professional?3_600_000:900_000
  if(!Number.isInteger(workers)||workers<1||workers>maxWorkers)throw new Error(`Port survey workers must be between 1 and ${maxWorkers}`)
  if(!Number.isInteger(timeoutMs)||timeoutMs<60_000||timeoutMs>maxTimeout)throw new Error(`Native tool window must be between 1 and ${maxTimeout/60_000} minutes`)
  return {...policy,maxTargets,maxPorts,portConcurrency:workers,nmapTimeoutMs:timeoutMs,maxPortConcurrency:maxWorkers,maxNmapTimeoutMs:maxTimeout}
}

class EngagementStore {
  constructor(directory, options={}) {
    this.directory=directory
    this.file=path.join(directory,'fieldops-engagements.json')
    this.state=cleanState()
    this.entitlement=options.entitlement||(()=>({fieldOps:false}))
    this.now=options.now||(()=>new Date())
    this.lookup=options.lookup||lookup
    this.dns=options.dns||dnsPromises
    this.pause=options.pause||pause
    this.toolBridge=options.toolBridge||new ToolBridge()
    this.trust=options.trust||null
    this.lastRunAt=0
    this.running=false
    this.chaosAbort=new Set()
    this.campaignAbort=new Set()
    this.campaignPause=new Set()
    this.jobControls=new Map()
    this.writeQueue=Promise.resolve()
  }

  async initialize(){await mkdir(this.directory,{recursive:true});try{this.state={...cleanState(),...JSON.parse(await readFile(this.file,'utf8')),schemaVersion:8};this.state.operatorJobs||=[];this.state.campaigns||=[];this.state.chaosRuns||=[];this.state.captures||=[];this.state.findings||=[];for(const engagement of this.state.engagements){engagement.networkMode||='external';engagement.policyLevel||=engagement.permit?.policyLevel||'legacy';const policy=safeExecutionPolicy(engagement.executionProfile||engagement.permit?.executionProfile);engagement.executionProfile=policy.id;engagement.executionCapacity||={...policy}}for(const job of this.state.operatorJobs){if(activeJobStatuses.has(job.status)){job.status='interrupted';job.finishedAt=this.now().toISOString();job.outcome='The desktop process ended before the native tool completed.'}}for(const campaign of this.state.campaigns){if(activeCampaignStatuses.has(campaign.status)){campaign.status='interrupted';campaign.finishedAt=this.now().toISOString();campaign.outcome='The desktop process ended before the campaign completed. Resume to continue pending work.';for(const task of campaign.tasks||[])if(task.status==='running')task.status='pending'}}for(const run of this.state.chaosRuns){if(['queued','running','recovering','aborting'].includes(run.status)){run.status='interrupted';run.finishedAt=this.now().toISOString();run.outcome='The desktop process ended before the experiment completed.'}}}catch{this.state=cleanState()}await this.persist();return this.snapshot()}
  snapshot(){return {...clone(this.state),auditIntegrity:this.verifyAudit(),captureIntegrity:this.verifyCaptures(),signatureIntegrity:this.verifySignatures()}}
  assertEntitled(){if(!this.entitlement().fieldOps)throw new Error('FieldOps Pro entitlement required')}

  async create(input){
    this.assertEntitled()
    const name=String(input?.name||'').trim().slice(0,100),client=String(input?.client||'').trim().slice(0,100),authorizationReference=String(input?.authorizationReference||'').trim().slice(0,160)
    if(name.length<3||client.length<2)throw new Error('Engagement name and client are required')
    if(authorizationReference.length<4)throw new Error('Add the authorization or rules-of-engagement reference')
    if(input?.attested!==true)throw new Error('Explicit authorization attestation is required')
    const networkMode=String(input?.networkMode||'external').toLowerCase()
    if(!['external','internal'].includes(networkMode))throw new Error('Choose external or internal network authorization')
    const profile=input?.executionProfile||'guarded',policy=executionPolicy(profile)
    const targets=[...new Set(String(input.targets||'').split(/[\s,]+/).filter(Boolean).map(normalizeTarget))]
    const ports=[...new Set(String(input.ports||'').split(/[\s,]+/).filter(Boolean).map(Number))].sort((a,b)=>a-b)
    if(!targets.length)throw new Error('Add at least one exact target')
    if(!ports.length||ports.some(port=>!Number.isInteger(port)||port<1||port>65535))throw new Error('Add at least one valid TCP port')
    if(policy.id==='guarded'&&targets.length>policy.maxTargets)throw new Error(`Add between 1 and ${policy.maxTargets} exact targets`)
    if(policy.id==='guarded'&&ports.length>policy.maxPorts)throw new Error(`Add between 1 and ${policy.maxPorts} valid TCP ports`)
    const capacity=executionCapacity(profile,input?.executionCapacity,targets,ports)
    const validFrom=new Date(input.validFrom),validUntil=new Date(input.validUntil),now=this.now()
    if(Number.isNaN(validFrom.getTime())||Number.isNaN(validUntil.getTime())||validUntil<=validFrom)throw new Error('Enter a valid testing window')
    if(validUntil.getTime()-validFrom.getTime()>366*86_400_000)throw new Error('Testing windows cannot exceed one year')
    const policyLevel=String(input?.policyLevel||'validate').toLowerCase(),engagement={id:randomUUID(),name,client,authorizationReference,networkMode,targets,ports,policyLevel,executionProfile:policy.id,executionCapacity:capacity,capacityChallenge:randomUUID(),capacityGrants:[],validFrom:validFrom.toISOString(),validUntil:validUntil.toISOString(),attestedAt:now.toISOString(),status:'active',createdAt:now.toISOString()}
    if(this.trust){const approverName=String(input?.approverName||'').trim().replace(/\s+/g,' ').slice(0,100),approverEmail=String(input?.approverEmail||'').trim().toLowerCase().slice(0,160);if(approverName.length<3||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(approverEmail))throw new Error('Add the approving authority name and professional email');engagement.permit=this.trust.issuePermit({...engagement,approverName,approverEmail})}
    this.state.engagements.unshift(engagement);this.audit(engagement.id,'engagement','created',`${networkMode.toUpperCase()} ${policyLevel.toUpperCase()} ${policy.label.toUpperCase()} authorization boundary recorded`,{permitId:engagement.permit?.id||null,executionProfile:policy.id,executionCapacity:engagement.executionCapacity});await this.persist();return this.snapshot()
  }

  async close(id){
    this.assertEntitled()
    const engagement=this.state.engagements.find(item=>item.id===id)
    if(!engagement||engagement.status!=='active')throw new Error('Active engagement not found')
    if(this.state.chaosRuns.some(item=>item.engagementId===id&&['queued','running','recovering','aborting'].includes(item.status)))throw new Error('Stop the active Chaos Engine experiment before closing its authorization boundary')
    if(this.state.campaigns.some(item=>item.engagementId===id&&activeCampaignStatuses.has(item.status)))throw new Error('Stop the active assessment campaign before closing its authorization boundary')
    if(this.state.operatorJobs.some(item=>item.engagementId===id&&activeJobStatuses.has(item.status)))throw new Error('Stop the active native tool job before closing its authorization boundary')
    engagement.status='closed';engagement.closedAt=this.now().toISOString();this.audit(id,'engagement','closed','Authorization boundary closed by operator');await this.persist();return this.snapshot()
  }

  async capabilities(refresh=false){
    this.assertEntitled()
    return { profiles: publicExecutionProfiles(), ...await this.toolBridge.capabilities({refresh}) }
  }

  async createExecutionManifest(input){
    const engagement=this.getActive(input?.engagementId)
    this.assertOperation(engagement,'validate')
    if(!this.trust)throw new Error('A protected operator identity is required to export an execution manifest')
    const tool=TOOL_CATALOG.find(item=>item.id===String(input?.toolId||''))
    if(!tool)throw new Error('Choose a supported execution capability')
    const policy=engagement.executionCapacity||executionPolicy(engagement.executionProfile)
    const workloadTool=['k6','locust'].includes(tool.id)
    const workload=workloadTool?this.authorizedWorkload(engagement,input):null
    const issuedAt=this.now().toISOString()
    const manifest={
      schemaVersion:1,
      manifestId:randomUUID(),
      kind:'daemoncore-scoped-execution',
      tool:{id:tool.id,label:tool.label,integration:tool.integration},
      engagement:{id:engagement.id,name:engagement.name,client:engagement.client,authorizationReference:engagement.authorizationReference},
      scope:{networkMode:engagement.networkMode,targets:[...engagement.targets],ports:[...engagement.ports]},
      execution:{profile:policy.id,capacity:{...engagement.executionCapacity}},
      permit:{id:engagement.permit?.id||null,policyLevel:engagement.policyLevel,operatorFingerprint:engagement.permit?.attestation?.operator?.fingerprint||null},
      issuedAt,
      validUntil:engagement.validUntil,
      instructions:'A customer-controlled runner must independently enforce this exact signed scope and return its output for evidence sealing.',
    }
    if(workload)manifest.workload=workload
    const bundle={bundleVersion:1,manifest,attestation:this.trust.sign('fieldops-execution-manifest',manifest)}
    this.audit(engagement.id,'execution-manifest','exported',`${tool.label} // ${policy.label} // ${engagement.targets.length} targets`,{manifestId:manifest.manifestId,toolId:tool.id,executionProfile:policy.id});await this.persist()
    return bundle
  }

  authorizedWorkload(engagement,input){
    const target=normalizeTarget(input?.target)
    const grant=(engagement.capacityGrants||[]).find(item=>item.target===target&&Date.parse(item.validUntil)>=this.now().getTime())
    if(!grant)throw new Error('Verify a current target-issued capacity grant before exporting a workload plan')
    const requestsPerSecond=Math.round(Number(input?.requestsPerSecond)),durationSeconds=Math.round(Number(input?.durationSeconds)),concurrency=Math.round(Number(input?.concurrency))
    if(!Number.isInteger(requestsPerSecond)||requestsPerSecond<1||requestsPerSecond>grant.maxRequestsPerSecond)throw new Error(`Arrival rate must be between 1 and the verified ${grant.maxRequestsPerSecond} req/s grant`)
    if(!Number.isInteger(durationSeconds)||durationSeconds<10||durationSeconds>grant.maxDurationSeconds)throw new Error(`Duration must be between 10 and the verified ${grant.maxDurationSeconds} second grant`)
    if(!Number.isInteger(concurrency)||concurrency<1||concurrency>grant.maxConcurrency)throw new Error(`Concurrency must be between 1 and the verified ${grant.maxConcurrency} worker grant`)
    return {mode:'customer-controlled-load',target,path:normalizeHttpPath(input?.path),secure:Boolean(input?.secure),requestsPerSecond,durationSeconds,concurrency,emergencyStopRequired:true,capacityGrant:{id:grant.id,digest:grant.digest,verifiedAt:grant.verifiedAt,validUntil:grant.validUntil}}
  }

  async verifyCapacityGrant(input){
    const engagement=this.getActive(input?.engagementId),target=normalizeTarget(input?.target),port=Number(input?.port),secure=Boolean(input?.secure)
    this.assertOperation(engagement,'resilience')
    if(!engagement.capacityChallenge)throw new Error('Reissue this engagement to create a target-verification challenge')
    if(!engagement.targets.includes(target)||!engagement.ports.includes(port))throw new Error('Capacity verification must use an exact permitted target and port')
    if(engagement.networkMode==='external'&&!secure)throw new Error('External capacity grants must be retrieved over verified TLS')
    const addresses=await this.resolveAuthorized(target,engagement.networkMode||'external')
    const requestPath=`/.well-known/daemoncore-capacity/${encodeURIComponent(engagement.capacityChallenge)}.json`
    const document=await this.getJson(target,addresses[0].address,port,secure,requestPath)
    const maxRequestsPerSecond=Math.round(Number(document?.maxRequestsPerSecond)),maxDurationSeconds=Math.round(Number(document?.maxDurationSeconds)),maxConcurrency=Math.round(Number(document?.maxConcurrency)),validUntil=new Date(document?.validUntil)
    if(document?.challenge!==engagement.capacityChallenge||normalizeTarget(document?.target)!==target||document?.authorizationReference!==engagement.authorizationReference)throw new Error('Target-issued grant does not match this signed engagement challenge')
    if(!Number.isInteger(maxRequestsPerSecond)||maxRequestsPerSecond<1||!Number.isInteger(maxDurationSeconds)||maxDurationSeconds<10||!Number.isInteger(maxConcurrency)||maxConcurrency<1)throw new Error('Capacity grant limits are missing or invalid')
    if(Number.isNaN(validUntil.getTime())||validUntil<=this.now()||validUntil>Date.parse(engagement.validUntil))throw new Error('Capacity grant validity must end inside the signed engagement window')
    const normalized={id:randomUUID(),target,port,secure,requestPath,maxRequestsPerSecond,maxDurationSeconds,maxConcurrency,validUntil:validUntil.toISOString(),verifiedAt:this.now().toISOString(),sourceAddress:addresses[0].address,authorizationReference:engagement.authorizationReference}
    normalized.digest=createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
    engagement.capacityGrants=[normalized,...(engagement.capacityGrants||[]).filter(item=>item.target!==target)].slice(0,engagement.targets.length)
    this.audit(engagement.id,'capacity-grant','verified',`${target} // ${maxRequestsPerSecond} req/s // ${maxConcurrency} workers // ${maxDurationSeconds}s`,{grantId:normalized.id,digest:normalized.digest});await this.persist()
    return this.snapshot()
  }

  async importToolEvidence(input){
    const engagement=this.getActive(input?.engagementId)
    this.assertOperation(engagement,'validate')
    const target=normalizeTarget(input?.target)
    if(!engagement.targets.includes(target))throw new Error('Imported evidence target is outside the signed engagement allowlist')
    const tool=TOOL_CATALOG.find(item=>item.id===String(input?.toolId||''))
    if(!tool)throw new Error('Choose a supported evidence source')
    const serialized=JSON.stringify(input?.document)
    if(!serialized||Buffer.byteLength(serialized)>2*1024*1024)throw new Error('Evidence document must be valid JSON and no larger than 2 MB')
    const format=String(input?.format||'json').toLowerCase()
    if(!['json','sarif'].includes(format))throw new Error('Evidence format must be JSON or SARIF')
    const sourceDigest=/^[a-f0-9]{64}$/.test(input?.sourceDigest||'')?input.sourceDigest:createHash('sha256').update(serialized).digest('hex')
    const sarifRuns=format==='sarif'&&Array.isArray(input.document?.runs)?input.document.runs:[]
    const result={
      tool:{id:tool.id,label:tool.label},
      fileName:String(input?.fileName||'evidence.json').replace(/[\r\n]/g,'').slice(0,180),
      format,
      sourceDigest,
      summary:{runs:sarifRuns.length,results:sarifRuns.reduce((total,run)=>total+(Array.isArray(run.results)?run.results.length:0),0)},
      document:input.document,
    }
    const capture={id:randomUUID(),engagementId:engagement.id,networkMode:engagement.networkMode,executionProfile:engagement.executionProfile,type:'tool-evidence',target,port:null,path:null,addresses:[],durationMs:0,result,at:this.now().toISOString()}
    capture.digest=captureDigest(capture)
    this.state.captures.unshift(capture);this.state.captures=this.state.captures.slice(0,2000)
    this.audit(engagement.id,'tool-evidence','imported',`${tool.label} // ${target} // ${result.fileName}`,{captureId:capture.id,sourceDigest,format});await this.persist()
    return capture
  }

  appendJobOutput(job, event){
    const text=String(event?.text||'').replace(/\u0000/g,'')
    if(!text)return
    job.output=(job.output||'')+text
    if(job.output.length>60_000)job.output=`[earlier output truncated]\n${job.output.slice(-50_000)}`
    job.lastOutputAt=event?.at||this.now().toISOString()
  }

  async startToolJob(input){
    const engagement=this.getActive(input?.engagementId)
    this.assertOperation(engagement,'validate')
    if(String(input?.toolId||'')!=='nmap')throw new Error('This release executes Nmap natively. Other discovered tools remain evidence bridges.')
    if(input?.attested!==true)throw new Error('Confirm this native execution remains inside the signed engagement')
    if(this.running)throw new Error('Wait for the active FieldOps diagnostic to finish')
    if(this.state.operatorJobs.some(item=>activeJobStatuses.has(item.status)))throw new Error('Another native tool job is already active')
    if(this.state.campaigns.some(item=>activeCampaignStatuses.has(item.status)))throw new Error('Stop the active assessment campaign first')
    if(this.state.chaosRuns.some(item=>['queued','running','recovering','aborting'].includes(item.status)))throw new Error('Stop the active Chaos Engine experiment first')
    const target=normalizeTarget(input?.target)
    if(!engagement.targets.includes(target))throw new Error('Target is outside the signed engagement allowlist')
    const policy=engagement.executionCapacity||executionPolicy(engagement.executionProfile),addresses=await this.resolveAuthorized(target,engagement.networkMode||'external'),address=addresses[0].address,now=this.now().toISOString()
    const job={id:randomUUID(),engagementId:engagement.id,toolId:'nmap',toolLabel:'Nmap',target,address,ports:[...engagement.ports],status:'queued',pid:null,engine:null,engineVersion:null,output:'',lastOutputAt:null,createdAt:now,startedAt:null,finishedAt:null,captureId:null,outcome:'Native execution queued inside the signed scope.',authorizationReference:engagement.authorizationReference,permitId:engagement.permit?.id||null}
    this.state.operatorJobs.unshift(job);this.state.operatorJobs=this.state.operatorJobs.slice(0,100)
    this.audit(engagement.id,'native-tool','queued',`Nmap // ${target} (${address}) // ${job.ports.length} ports`,{jobId:job.id,permitId:job.permitId});await this.persist()
    this.executeToolJob(job.id,policy).catch(()=>{})
    return this.snapshot()
  }

  async executeToolJob(id,policy){
    const job=this.state.operatorJobs.find(item=>item.id===id)
    if(!job)return
    try{
      job.status='starting';job.startedAt=this.now().toISOString();job.outcome='Starting the native adapter.';await this.persist()
      const execution=await this.toolBridge.startInventory({address:job.address,ports:job.ports,maxPorts:policy.maxPorts,timeoutMs:policy.nmapTimeoutMs,onOutput:event=>this.appendJobOutput(job,event)})
      this.jobControls.set(id,execution);job.pid=execution.pid||null;job.engine=execution.engine;job.engineVersion=execution.engineVersion
      if(job.status==='cancelling')execution.cancel()
      else{job.status='running';job.outcome='Native tool is running. Output is streaming below.'}
      await this.persist()
      const result=await execution.completion
      const capture={id:randomUUID(),engagementId:job.engagementId,networkMode:this.state.engagements.find(item=>item.id===job.engagementId)?.networkMode||'external',executionProfile:this.state.engagements.find(item=>item.id===job.engagementId)?.executionProfile||'guarded',type:'native-tool-run',target:job.target,port:null,path:null,addresses:[{address:job.address}],durationMs:Date.parse(this.now().toISOString())-Date.parse(job.startedAt),result:{tool:{id:'nmap',label:'Nmap'},jobId:job.id,source:'managed-native-execution',...result},at:this.now().toISOString()}
      capture.digest=captureDigest(capture);this.state.captures.unshift(capture);this.state.captures=this.state.captures.slice(0,2000)
      job.status='completed';job.captureId=capture.id;job.finishedAt=this.now().toISOString();job.outcome=`Completed and sealed ${result.summary?.open||0} open service(s) into evidence.`
      this.audit(job.engagementId,'native-tool','completed',`Nmap // ${job.target} // ${result.summary?.open||0} open`,{jobId:job.id,captureId:capture.id,engine:job.engine});await this.persist()
    }catch(error){
      const interrupted=job.status==='interrupted',cancelled=job.status==='cancelling';job.status=interrupted?'interrupted':cancelled?'cancelled':'failed';job.finishedAt=this.now().toISOString();job.outcome=interrupted?job.outcome:cancelled?'Stopped by the operator. Partial output was retained but not sealed as evidence.':String(error.stderr||error.message||'Native tool failed').trim().slice(0,700);this.audit(job.engagementId,'native-tool',job.status,job.outcome,{jobId:job.id});await this.persist().catch(()=>{})
    }finally{this.jobControls.delete(id)}
  }

  async cancelToolJob(id){
    this.assertEntitled()
    const job=this.state.operatorJobs.find(item=>item.id===id)
    if(!job||!activeJobStatuses.has(job.status))throw new Error('Active native tool job not found')
    job.status='cancelling';job.outcome='Stop requested. Terminating the managed process.';this.audit(job.engagementId,'native-tool','cancel-requested',`${job.toolLabel} // ${job.target}`,{jobId:id});this.jobControls.get(id)?.cancel();await this.persist();return this.snapshot()
  }

  async shutdown(){
    for(const [id,execution] of this.jobControls){
      execution.cancel()
      const job=this.state.operatorJobs.find(item=>item.id===id)
      if(job&&activeJobStatuses.has(job.status)){job.status='interrupted';job.finishedAt=this.now().toISOString();job.outcome='DaemonCore closed before the native tool completed. The managed process was terminated.'}
    }
    this.jobControls.clear()
    await this.persist()
  }

  getActive(id){
    this.assertEntitled();const engagement=this.state.engagements.find(item=>item.id===id)
    if(!engagement||engagement.status!=='active')throw new Error('Active engagement not found')
    const now=this.now().getTime();if(now<Date.parse(engagement.validFrom)||now>Date.parse(engagement.validUntil))throw new Error('The authorized testing window is closed')
    return engagement
  }

  assertOperation(engagement,requiredOperation){if(!this.trust)return;if(!engagement.permit)throw new Error('This engagement must be reissued with a signed operation permit');const permit=this.trust.assertPermit(engagement.permit,requiredOperation),permitProfile=permit.executionProfile||'guarded',bound=permit.engagementId===engagement.id&&permit.client===engagement.client&&permit.authorizationReference===engagement.authorizationReference&&permit.networkMode===engagement.networkMode&&permit.policyLevel===engagement.policyLevel&&permitProfile===(engagement.executionProfile||'guarded')&&permit.validFrom===engagement.validFrom&&permit.validUntil===engagement.validUntil&&permit.capacityChallenge===(engagement.capacityChallenge||null)&&JSON.stringify(permit.targets)===JSON.stringify(engagement.targets)&&JSON.stringify(permit.ports)===JSON.stringify(engagement.ports)&&JSON.stringify(permit.executionCapacity||null)===JSON.stringify(engagement.executionCapacity||null);if(!bound)throw new Error('Engagement record no longer matches its signed operation permit')}

  async resolvePublic(target){
    if(net.isIP(target)){if(!isPublicAddress(target))throw new Error('FieldOps external mode blocks private, loopback, link-local, and reserved addresses');return [{address:target,family:net.isIPv4(target)?4:6}]}
    const addresses=await this.lookup(target,{all:true,verbatim:true})
    if(!addresses.length||addresses.some(item=>!isPublicAddress(item.address)))throw new Error('Target resolution is empty or crosses a non-public network boundary')
    return addresses
  }

  async resolveAuthorized(target,networkMode='external'){
    if(networkMode==='external')return this.resolvePublic(target)
    if(networkMode!=='internal')throw new Error('Engagement network authorization is invalid')
    const addresses=net.isIP(target)?[{address:target,family:net.isIPv4(target)?4:6}]:await this.lookup(target,{all:true,verbatim:true})
    if(!addresses.length||addresses.some(item=>!isPrivateAddress(item.address)))throw new Error('Target resolution is empty or crosses the authorized internal network boundary')
    return addresses
  }

  async run(input,context={}){
    if(this.running)throw new Error('Another diagnostic is already running')
    if(this.state.operatorJobs.some(item=>activeJobStatuses.has(item.status)))throw new Error('A native tool job is active')
    if(this.state.chaosRuns.some(item=>['queued','running','recovering','aborting'].includes(item.status)))throw new Error('A Chaos Engine experiment is active')
    const activeCampaign=this.state.campaigns.find(item=>activeCampaignStatuses.has(item.status));if(activeCampaign&&activeCampaign.id!==context.campaignId)throw new Error('An assessment campaign is active')
    this.running=true
    let engagement,target,type,port,requestPath,previousSurface
    try{
      engagement=this.getActive(input?.engagementId);target=normalizeTarget(input?.target);type=String(input?.type||'')
      const policy=engagement.executionCapacity||executionPolicy(engagement.executionProfile)
      const wait=policy.diagnosticCooldownMs-(Date.now()-this.lastRunAt);if(!context.campaignId&&wait>0)throw new Error('FieldOps rate limit: wait before the next diagnostic');this.lastRunAt=Date.now()
      if(!engagement.targets.includes(target))throw new Error('Target is outside the signed engagement allowlist')
      const targetOnly=['dns','dns-profile','ports','surface','deep-inventory'].includes(type)
      port=targetOnly?null:Number(input?.port||({http:80,'http-posture':443,baseline:443,tls:443,'service-profile':443,'web-map':443}[type]))
      if(!targetOnly&&!engagement.ports.includes(port))throw new Error('Port is outside the engagement allowlist')
      if(!['dns','dns-profile','tcp','ports','surface','deep-inventory','http','http-posture','baseline','tls','service-profile','web-map'].includes(type))throw new Error('Unsupported diagnostic')
      this.assertOperation(engagement,observedOperations.has(type)?'observe':'validate')
      requestPath=['http','http-posture','baseline','web-map'].includes(type)?normalizeHttpPath(input?.path):null
      if(type==='surface'){
        previousSurface=this.state.captures.find(item=>item.engagementId===engagement.id&&item.target===target&&item.type==='surface')
        if(previousSurface&&previousSurface.digest!==captureDigest(previousSurface))throw new Error('Previous surface baseline failed integrity verification')
      }
      const addresses=await this.resolveAuthorized(target,engagement.networkMode||'external'),started=Date.now()
      let result
      if(type==='dns')result={addresses}
      if(type==='dns-profile')result=await this.dnsProfile(target,addresses)
      if(type==='tcp')result=await this.tcp(addresses[0].address,port)
      if(type==='ports')result=await this.portSurvey(addresses[0].address,engagement.ports,policy.portConcurrency,policy.maxPorts)
      if(type==='surface')result=await this.surfaceBaseline(target,addresses[0].address,engagement,addresses)
      if(type==='deep-inventory')result=await this.deepInventory(target,addresses[0].address,engagement)
      if(type==='http')result=await this.head(target,addresses[0].address,port,Boolean(input?.tls),requestPath)
      if(type==='http-posture')result=await this.httpPosture(target,addresses[0].address,port,Boolean(input?.tls),requestPath)
      if(type==='baseline')result=await this.baseline(target,addresses[0].address,port,Boolean(input?.tls),requestPath)
      if(type==='tls')result=await this.certificate(target,addresses[0].address,port)
      if(type==='service-profile')result=await this.serviceProfile(target,addresses[0].address,port,Boolean(input?.tls))
      if(type==='web-map')result=await this.webMap(target,addresses[0].address,port,Boolean(input?.tls),requestPath)
      const output={id:randomUUID(),engagementId:engagement.id,networkMode:engagement.networkMode||'external',executionProfile:policy.id,type,target,port:targetOnly?null:port,path:requestPath,addresses:addresses.map(item=>item.address),durationMs:Date.now()-started,result,at:this.now().toISOString()}
      if(type==='surface')output.result.comparison=this.compareSurface(previousSurface,output)
      output.digest=captureDigest(output)
      this.state.captures.unshift(output);this.state.captures=this.state.captures.slice(0,2000)
      this.audit(engagement.id,type,'completed',`${target}${port?`:${port}`:''}${requestPath||''}`,output);await this.persist();return output
    }catch(error){if(engagement)this.audit(engagement.id,type||'diagnostic','blocked',error.message,{target,port});await this.persist().catch(()=>{});throw error}finally{this.running=false}
  }

  tcp(address,port,timeoutMs=5000){return new Promise((resolve,reject)=>{const started=Date.now(),socket=net.createConnection({host:address,port});socket.setTimeout(timeoutMs);socket.once('connect',()=>{const latencyMs=Date.now()-started;socket.destroy();resolve({connected:true,latencyMs})});socket.once('timeout',()=>{socket.destroy();reject(new Error('TCP connection timed out'))});socket.once('error',error=>reject(new Error(`TCP connection failed: ${error.code||error.message}`)))})}

  readBanner(address,port,timeoutMs=1500,maxBytes=2048){return new Promise((resolve,reject)=>{const started=Date.now(),chunks=[];let connected=false,connectLatencyMs=null,bytes=0,settled=false,deadline;const socket=net.createConnection({host:address,port}),finish=()=>{if(settled)return;settled=true;clearTimeout(deadline);socket.destroy();const banner=Buffer.concat(chunks).toString('utf8').replace(/[^\x20-\x7e\r\n\t]/g,'.').slice(0,maxBytes);resolve({connected:true,connectLatencyMs,banner,bannerBytes:Buffer.byteLength(banner),receivedBytes:bytes,truncated:bytes>maxBytes})},fail=error=>{if(settled)return;settled=true;clearTimeout(deadline);socket.destroy();reject(error)};socket.once('connect',()=>{connected=true;connectLatencyMs=Date.now()-started});socket.on('data',chunk=>{const remaining=maxBytes-chunks.reduce((sum,item)=>sum+item.length,0);if(remaining>0)chunks.push(chunk.subarray(0,remaining));bytes+=chunk.length;if(bytes>=maxBytes)finish()});socket.once('end',finish);socket.once('close',()=>{if(connected)finish()});socket.once('error',error=>connected?finish():fail(new Error(`TCP connection failed: ${error.code||error.message}`)));deadline=setTimeout(()=>connected?finish():fail(new Error('TCP connection timed out')),timeoutMs)})}

  identifyService(port,banner,httpEvidence,tlsEvidence){
    let service=serviceByPort[port]||'unknown',signal='port convention'
    if(/^SSH-/i.test(banner)){service='ssh';signal='server banner'}
    else if(/^220[ -].*\b(?:smtp|esmtp)\b/im.test(banner)){service='smtp';signal='server banner'}
    else if(/^220[ -].*\bftp\b/im.test(banner)){service='ftp';signal='server banner'}
    else if(/^\+OK/im.test(banner)){service='pop3';signal='server banner'}
    else if(/^\*\s+OK/im.test(banner)){service='imap';signal='server banner'}
    if(httpEvidence){service=tlsEvidence?'https':'http';signal='HTTP response'}
    else if(tlsEvidence){service=service==='unknown'?'tls':service;signal='TLS handshake'}
    return{service,confidence:signal==='port convention'?'inferred':'observed',signal}
  }

  async serviceProfile(target,address,port,secure){
    const transport=await this.readBanner(address,port),profile={transport,http:null,tls:null}
    if(webPorts.has(port)){try{profile.http=await this.httpPosture(target,address,port,secure,'/')}catch(error){profile.http={error:error.message}}}
    if(secure){try{profile.tls=await this.certificate(target,address,port)}catch(error){profile.tls={error:error.message}}}
    profile.identity=this.identifyService(port,transport.banner,profile.http&&!profile.http.error,profile.tls&&!profile.tls.error)
    profile.hardCaps={connections:1+(webPorts.has(port)?1:0)+(secure?1:0),bannerBytes:2048,httpRequests:webPorts.has(port)?1:0,tlsHandshakes:secure?1:0,redirects:0}
    return profile
  }

  async webMap(target,address,port,secure,basePath='/'){
    const candidates=[basePath,'/.well-known/security.txt','/robots.txt','/sitemap.xml','/health','/status','/api','/openapi.json'].map(normalizeHttpPath),paths=[...new Set(candidates)].slice(0,8),observations=[]
    for(const requestPath of paths){const started=Date.now();try{const response=await this.head(target,address,port,secure,requestPath);observations.push({path:requestPath,statusCode:response.statusCode,durationMs:Date.now()-started,present:response.statusCode!==404&&response.statusCode<500,contentType:response.headers['content-type']||null,contentLength:response.headers['content-length']||null})}catch(error){observations.push({path:requestPath,error:error.message,durationMs:Date.now()-started,present:false})}if(requestPath!==paths.at(-1))await this.pause(250)}
    return{mode:'bounded-head-map',requestCount:observations.length,present:observations.filter(item=>item.present).length,observations,hardCaps:{requests:8,concurrency:1,minimumIntervalMs:250,redirects:0,responseBodyBytes:0}}
  }

  async portSurvey(address,ports,concurrency=4,maxPorts=128){const observations=[];for(let index=0;index<ports.length;index+=concurrency){const batch=ports.slice(index,index+concurrency),results=await Promise.all(batch.map(async port=>{const started=Date.now();try{const result=await this.tcp(address,port,1500);return{port,state:'open',latencyMs:result.latencyMs}}catch(error){return{port,state:error.message.includes('timed out')?'filtered-or-unresponsive':'closed-or-rejected',latencyMs:Date.now()-started}}}));observations.push(...results);if(index+concurrency<ports.length)await this.pause(100)}return{tested:observations.length,hardCap:maxPorts,concurrency,observations}}

  async deepInventory(target,address,engagement){
    const policy=engagement.executionCapacity||executionPolicy(engagement.executionProfile)
    try{return await this.toolBridge.inventory({target,address,ports:engagement.ports,maxPorts:policy.maxPorts,timeoutMs:policy.nmapTimeoutMs})}catch(toolError){
      const survey=await this.portSurvey(address,engagement.ports,policy.portConcurrency,policy.maxPorts),open=survey.observations.filter(item=>item.state==='open'),services=[]
      for(let index=0;index<open.length;index+=policy.portConcurrency){const batch=open.slice(index,index+policy.portConcurrency),profiles=await Promise.all(batch.map(async item=>{const secure=[443,465,636,993,995,2376,8443,9443].includes(item.port);try{return{port:item.port,state:item.state,...await this.serviceProfile(target,address,item.port,secure)}}catch(error){return{port:item.port,state:item.state,error:error.message}}}));services.push(...profiles)}
      return{engine:'daemoncore-native',engineVersion:'built-in passive profiler',profile:'authorized-service-inventory',adapterNotice:toolError.message,host:{address,state:open.length?'up':'no-open-services-observed'},portSurvey:survey,ports:services,summary:{tested:survey.tested,open:open.length,profiled:services.length},hardCaps:{ports:policy.maxPorts,portConcurrency:policy.portConcurrency,profileConcurrency:policy.portConcurrency,bannerBytesPerService:2048,redirects:0}}
    }
  }

  campaignSummary(campaign){
    const tasks=campaign.tasks||[],count=status=>tasks.filter(task=>task.status===status).length
    return{total:tasks.length,pending:count('pending'),running:count('running'),completed:count('completed'),failed:count('failed'),progress:tasks.length?Math.round((count('completed')+count('failed'))/tasks.length*100):0}
  }

  launchCampaign(id){this.executeCampaign(id).catch(async error=>{const active=this.state.campaigns.find(item=>item.id===id);if(active&&activeCampaignStatuses.has(active.status)){active.status='failed';active.finishedAt=this.now().toISOString();active.outcome=error.message;active.summary=this.campaignSummary(active);this.audit(active.engagementId,'campaign','failed',error.message,{campaignId:active.id});await this.persist().catch(()=>{})}})}

  async startCampaign(input){
    const engagement=this.getActive(input?.engagementId)
    this.assertOperation(engagement,'validate')
    if(this.running)throw new Error('Wait for the active diagnostic to finish')
    if(this.state.chaosRuns.some(item=>['queued','running','recovering','aborting'].includes(item.status)))throw new Error('Stop the active Chaos Engine experiment first')
    if(this.state.campaigns.some(item=>activeCampaignStatuses.has(item.status)))throw new Error('Another assessment campaign is active')
    if(input?.attested!==true)throw new Error('Confirm this campaign remains inside the signed engagement')
    const profile=String(input?.profile||'complete'),modules=campaignProfiles[profile]
    if(!modules)throw new Error('Choose a supported campaign profile')
    const requested=Array.isArray(input?.targets)?input.targets:engagement.targets,targets=[...new Set(requested.map(normalizeTarget))]
    const policy=engagement.executionCapacity||executionPolicy(engagement.executionProfile)
    if(!targets.length||((policy.maxTargets!=null)&&targets.length>policy.maxTargets)||targets.some(target=>!engagement.targets.includes(target)))throw new Error('Campaign targets must be inside the engagement allowlist')
    const tasks=targets.flatMap(target=>modules.map(module=>({id:randomUUID(),target,module,status:'pending',captureId:null,startedAt:null,finishedAt:null,error:null})))
    const now=this.now().toISOString(),campaign={id:randomUUID(),engagementId:engagement.id,name:String(input?.name||`${engagement.name} campaign`).trim().slice(0,120),profile,modules:[...modules],targets,status:'queued',tasks,summary:null,createdAt:now,startedAt:null,finishedAt:null,outcome:'Campaign queued inside the signed authorization boundary.'}
    if(campaign.name.length<3)throw new Error('Add a campaign name')
    campaign.summary=this.campaignSummary(campaign);this.state.campaigns.unshift(campaign);this.state.campaigns=this.state.campaigns.slice(0,200)
    this.audit(engagement.id,'campaign','queued',`${campaign.name} // ${targets.length} targets // ${tasks.length} tasks`,{campaignId:campaign.id,profile,modules,targets});await this.persist()
    this.launchCampaign(campaign.id)
    return this.snapshot()
  }

  async executeCampaign(id){
    const campaign=this.state.campaigns.find(item=>item.id===id)
    if(!campaign)throw new Error('Assessment campaign not found')
    campaign.status='running';campaign.startedAt||=this.now().toISOString();campaign.finishedAt=null;campaign.outcome='Assessment modules are running.';await this.persist()
    for(const task of campaign.tasks){
      if(!['pending','failed'].includes(task.status))continue
      if(this.campaignAbort.has(id))break
      while(this.campaignPause.has(id)&&!this.campaignAbort.has(id)){campaign.status='paused';campaign.outcome='Paused by the operator. Resume to continue the remaining modules.';campaign.summary=this.campaignSummary(campaign);await this.persist();await this.pause(250)}
      if(this.campaignAbort.has(id))break
      this.getActive(campaign.engagementId);campaign.status='running';task.status='running';task.startedAt=this.now().toISOString();task.finishedAt=null;task.error=null;campaign.summary=this.campaignSummary(campaign);await this.persist()
      try{const capture=await this.run({engagementId:campaign.engagementId,type:task.module,target:task.target},{campaignId:id});task.status='completed';task.captureId=capture.id}
      catch(error){task.status='failed';task.error=error.message.slice(0,500)}
      task.finishedAt=this.now().toISOString();campaign.summary=this.campaignSummary(campaign);await this.persist()
    }
    const cancelled=this.campaignAbort.has(id),summary=this.campaignSummary(campaign);campaign.status=cancelled?'cancelled':summary.failed?'completed-with-errors':'completed';campaign.finishedAt=this.now().toISOString();campaign.summary=summary;campaign.outcome=cancelled?'Cancelled by the operator after the active module settled.':summary.failed?`${summary.completed} tasks completed and ${summary.failed} failed.`:`All ${summary.completed} assessment tasks completed.`
    this.campaignAbort.delete(id);this.campaignPause.delete(id);this.audit(campaign.engagementId,'campaign',campaign.status,campaign.outcome,{campaignId:id,summary});await this.persist();return this.snapshot()
  }

  async pauseCampaign(id){const campaign=this.state.campaigns.find(item=>item.id===id);if(!campaign||!['queued','running'].includes(campaign.status))throw new Error('Running assessment campaign not found');this.campaignPause.add(id);campaign.status='pause-requested';campaign.outcome='Pause requested. The active module will finish first.';this.audit(campaign.engagementId,'campaign','pause-requested',campaign.name,{campaignId:id});await this.persist();return this.snapshot()}
  async resumeCampaign(id){const campaign=this.state.campaigns.find(item=>item.id===id);if(!campaign||!['paused','pause-requested','interrupted','completed-with-errors'].includes(campaign.status))throw new Error('Resumable assessment campaign not found');if(this.state.campaigns.some(item=>item.id!==id&&activeCampaignStatuses.has(item.status)))throw new Error('Another assessment campaign is active');this.getActive(campaign.engagementId);const restart=['interrupted','completed-with-errors'].includes(campaign.status);this.campaignPause.delete(id);if(restart)for(const task of campaign.tasks)if(task.status==='failed')task.status='pending';campaign.status=restart?'queued':'running';campaign.outcome=restart?'Resume queued.':'Campaign resumed by the operator.';this.audit(campaign.engagementId,'campaign','resumed',campaign.name,{campaignId:id});await this.persist();if(restart)this.launchCampaign(id);return this.snapshot()}
  async cancelCampaign(id){const campaign=this.state.campaigns.find(item=>item.id===id);if(!campaign||!activeCampaignStatuses.has(campaign.status))throw new Error('Active assessment campaign not found');this.campaignAbort.add(id);this.campaignPause.delete(id);campaign.status='cancelling';campaign.outcome='Cancellation requested. The active module will finish before shutdown.';this.audit(campaign.engagementId,'campaign','cancel-requested',campaign.name,{campaignId:id});await this.persist();return this.snapshot()}

  async optionalDns(method,...args){try{return await this.dns[method](...args)}catch(error){if(['ENODATA','ENOTFOUND','ESERVFAIL','EREFUSED','ETIMEOUT'].includes(error.code))return[];throw error}}

  async dnsProfile(target,addresses){
    const [mx,nameservers,txt,caa,soa]=await Promise.all([this.optionalDns('resolveMx',target),this.optionalDns('resolveNs',target),this.optionalDns('resolveTxt',target),this.optionalDns('resolveCaa',target),this.optionalDns('resolveSoa',target)])
    return{addresses:addresses.slice(0,20),mailExchangers:mx.slice(0,20),nameservers:nameservers.slice(0,20),txt:txt.slice(0,25).map(parts=>parts.join('').slice(0,500)),caa:caa.slice(0,20),soa:soa||null,recordCaps:{addresses:20,mailExchangers:20,nameservers:20,txt:25,caa:20}}
  }

  analyzeHttp(response,secure){
    const headers=response.headers||{},controls=['content-security-policy','x-content-type-options','referrer-policy','permissions-policy','cross-origin-opener-policy','cross-origin-resource-policy'],required=secure?['strict-transport-security',...controls]:controls,present=required.filter(name=>Boolean(headers[name])),missing=required.filter(name=>!headers[name])
    const cookieSource=String(headers['set-cookie']||''),cookies=cookieSource?{observed:true,secure:/;\s*secure\b/i.test(cookieSource),httpOnly:/;\s*httponly\b/i.test(cookieSource),sameSite:/;\s*samesite=/i.test(cookieSource)}:{observed:false}
    const observations=[]
    if(missing.length)observations.push(`${missing.length} recommended response controls were not observed`)
    if(cookies.observed&&!cookies.secure&&secure)observations.push('A response cookie did not declare Secure')
    if(cookies.observed&&!cookies.httpOnly)observations.push('A response cookie did not declare HttpOnly')
    if(headers.server||headers['x-powered-by'])observations.push('The response exposes server implementation metadata')
    return{score:Math.round(present.length/required.length*100),present,missing,cookies,disclosure:{server:headers.server||null,poweredBy:headers['x-powered-by']||null},observations}
  }

  async httpPosture(target,address,port,secure,requestPath){const response=await this.head(target,address,port,secure,requestPath);return{response,posture:this.analyzeHttp(response,secure)}}

  async surfaceBaseline(target,address,engagement,addresses){
    const policy=engagement.executionCapacity||executionPolicy(engagement.executionProfile),dns=await this.dnsProfile(target,addresses),portSurvey=await this.portSurvey(address,engagement.ports,policy.portConcurrency,policy.maxPorts),open=portSurvey.observations.filter(item=>item.state==='open'),observedWebPorts=open.filter(item=>webPorts.has(item.port)).slice(0,8),web=[]
    for(const item of observedWebPorts){const secure=[443,8443,9443].includes(item.port);try{const service={port:item.port,secure,...await this.httpPosture(target,address,item.port,secure,'/')};if(secure){try{service.tls=await this.certificate(target,address,item.port)}catch(error){service.tls={error:error.message}}}web.push(service)}catch(error){web.push({port:item.port,secure,error:error.message})}}
    return{dns,portSurvey,web,summary:{authorizedPorts:engagement.ports.length,openPorts:open.map(item=>item.port),webServicesTested:web.length},hardCaps:{ports:policy.maxPorts,portConcurrency:policy.portConcurrency,webServices:8,tlsHandshakes:8,redirects:0}}
  }

  compareSurface(previous,current){
    if(!previous)return{status:'baseline-established',baselineCaptureId:null,baselineAt:null,changeCount:0,highestSeverity:null,changes:[]}
    const changes=[],record=(kind,severity,title,before,after)=>changes.push({kind,severity,title,before,after})
    const compareSet=(kind,severity,title,beforeValues,afterValues)=>{const before=stableValues(beforeValues),after=stableValues(afterValues),change=delta(before,after);if(change.added.length||change.removed.length)record(kind,severity,title,before,after)}
    compareSet('address','medium','Resolved address set changed',previous.addresses,current.addresses)
    const beforePorts=stableValues(previous.result?.summary?.openPorts),afterPorts=stableValues(current.result?.summary?.openPorts),portDelta=delta(beforePorts,afterPorts)
    if(portDelta.added.length)record('port','high','New TCP service exposure observed',beforePorts,afterPorts)
    if(portDelta.removed.length)record('port','informational','Previously observed TCP service is no longer exposed',beforePorts,afterPorts)
    compareSet('nameserver','low','Authoritative nameserver set changed',previous.result?.dns?.nameservers,current.result?.dns?.nameservers)
    compareSet('mail','low','Mail exchanger set changed',(previous.result?.dns?.mailExchangers||[]).map(item=>item.exchange),(current.result?.dns?.mailExchangers||[]).map(item=>item.exchange))
    const beforeWeb=new Map((previous.result?.web||[]).map(item=>[Number(item.port),item])),afterWeb=new Map((current.result?.web||[]).map(item=>[Number(item.port),item]))
    for(const [port,after] of afterWeb){const before=beforeWeb.get(port);if(!before)continue
      const beforeScore=before.posture?.score??null,afterScore=after.posture?.score??null
      if(beforeScore!==afterScore)record('http-posture',afterScore<beforeScore?'medium':'informational',`HTTP posture changed on port ${port}`,beforeScore,afterScore)
      const beforeStatus=before.response?.statusCode??null,afterStatus=after.response?.statusCode??null
      if(beforeStatus!==afterStatus)record('http-status','low',`HTTP status changed on port ${port}`,beforeStatus,afterStatus)
      const beforeServer=before.posture?.disclosure?.server??null,afterServer=after.posture?.disclosure?.server??null
      if(beforeServer!==afterServer)record('server','low',`Server disclosure changed on port ${port}`,beforeServer,afterServer)
      const beforeFingerprint=before.tls?.fingerprint256??null,afterFingerprint=after.tls?.fingerprint256??null
      if(beforeFingerprint!==afterFingerprint)record('certificate','informational',`TLS certificate changed on port ${port}`,beforeFingerprint,afterFingerprint)
    }
    const rank={high:3,medium:2,low:1,informational:0},highest=changes.reduce((value,item)=>rank[item.severity]>(rank[value]??-1)?item.severity:value,null)
    return{status:changes.length?'drift-detected':'no-change',baselineCaptureId:previous.id,baselineAt:previous.at,changeCount:changes.length,highestSeverity:highest,changes}
  }

  head(target,address,port,secure,requestPath='/'){return new Promise((resolve,reject)=>{const client=secure?https:http,request=client.request({method:'HEAD',host:address,port,path:requestPath,servername:secure&&!net.isIP(target)?target:undefined,headers:{Host:target,'User-Agent':'DaemonCore-FieldOps/1.1'},timeout:7000,rejectUnauthorized:true},response=>{const headers=Object.fromEntries(Object.entries(response.headers).slice(0,30).map(([key,value])=>[key,String(value).slice(0,500)]));response.resume();resolve({statusCode:response.statusCode,statusMessage:response.statusMessage,headers})});request.once('timeout',()=>request.destroy(new Error('HTTP request timed out')));request.once('error',error=>reject(new Error(`HTTP HEAD failed: ${error.message}`)));request.end()})}
  getJson(target,address,port,secure,requestPath){return new Promise((resolve,reject)=>{const client=secure?https:http,request=client.request({method:'GET',host:address,port,path:requestPath,servername:secure&&!net.isIP(target)?target:undefined,headers:{Host:target,Accept:'application/json','User-Agent':'DaemonCore-FieldOps/1.1'},timeout:7000,rejectUnauthorized:true},response=>{if(response.statusCode!==200){response.resume();reject(new Error(`Capacity endpoint returned HTTP ${response.statusCode}`));return}let body='';response.setEncoding('utf8');response.on('data',chunk=>{body+=chunk;if(body.length>16_384)request.destroy(new Error('Capacity grant exceeds 16 KB'))});response.on('end',()=>{try{resolve(JSON.parse(body))}catch{reject(new Error('Capacity endpoint did not return valid JSON'))}})});request.once('timeout',()=>request.destroy(new Error('Capacity verification timed out')));request.once('error',error=>reject(new Error(`Capacity verification failed: ${error.message}`)));request.end()})}

  async baseline(target,address,port,secure,requestPath){const samples=[];for(let index=0;index<10;index+=1){const started=Date.now();try{const response=await this.head(target,address,port,secure,requestPath);samples.push({sequence:index+1,statusCode:response.statusCode,durationMs:Date.now()-started})}catch(error){samples.push({sequence:index+1,error:error.message,durationMs:Date.now()-started})}if(index<9)await this.pause(500)}const successful=samples.filter(item=>item.statusCode),durations=successful.map(item=>item.durationMs);return{mode:'bounded-head-baseline',requestCount:10,concurrency:1,minimumIntervalMs:500,successful:successful.length,averageMs:durations.length?Math.round(durations.reduce((sum,value)=>sum+value,0)/durations.length):null,samples}}

  chaosRate(profile, ceiling, second, duration){
    if(profile==='baseline')return 1
    if(profile==='ramp')return Math.max(1,Math.ceil(ceiling*((second+1)/duration)))
    if(profile==='spike'){const position=(second+1)/duration;return position>=.35&&position<=.65?ceiling:1}
    return ceiling
  }

  chaosMetrics(samples){
    const durations=samples.map(item=>item.durationMs).sort((a,b)=>a-b),errors=samples.filter(item=>item.error||!item.statusCode||item.statusCode>=500).length
    return {requests:samples.length,successful:samples.length-errors,errors,errorRate:samples.length?Math.round(errors/samples.length*1000)/10:0,averageMs:durations.length?Math.round(durations.reduce((sum,value)=>sum+value,0)/durations.length):0,p95Ms:durations.length?durations[Math.min(durations.length-1,Math.ceil(durations.length*.95)-1)]:0}
  }

  async startChaos(input){
    const engagement=this.getActive(input?.engagementId),target=normalizeTarget(input?.target),port=Number(input?.port),requestPath=normalizeHttpPath(input?.path),profile=String(input?.profile||'ramp')
    this.assertOperation(engagement,'resilience')
    if(this.running)throw new Error('Wait for the active FieldOps diagnostic to finish')
    if(this.state.chaosRuns.some(item=>['queued','running','recovering','aborting'].includes(item.status)))throw new Error('Another Chaos Engine experiment is already active')
    if(this.state.campaigns.some(item=>activeCampaignStatuses.has(item.status)))throw new Error('Stop the active assessment campaign first')
    if(!engagement.targets.includes(target))throw new Error('Target is outside the signed engagement allowlist')
    if(!engagement.ports.includes(port))throw new Error('Port is outside the engagement allowlist')
    if(!['baseline','ramp','spike','soak'].includes(profile))throw new Error('Unsupported load profile')
    if(input?.attested!==true)throw new Error('Run-specific authorization confirmation is required')
    const durationSeconds=Math.max(10,Math.min(60,Math.round(Number(input?.durationSeconds)||20))),requestsPerSecond=Math.max(1,Math.min(4,Math.round(Number(input?.requestsPerSecond)||2)))
    const p95LimitMs=Math.max(250,Math.min(10_000,Math.round(Number(input?.p95LimitMs)||2000))),errorRateLimit=Math.max(1,Math.min(80,Math.round(Number(input?.errorRateLimit)||20)))
    const addresses=await this.resolveAuthorized(target,engagement.networkMode||'external'),now=this.now().toISOString()
    const run={id:randomUUID(),engagementId:engagement.id,name:String(input?.name||`${profile} resilience proof`).trim().slice(0,100),profile,target,port,path:requestPath,secure:Boolean(input?.secure),address:addresses[0].address,durationSeconds,requestsPerSecond,p95LimitMs,errorRateLimit,hardCaps:{maxDurationSeconds:60,maxRequestsPerSecond:4,maxRequests:240,maxConcurrency:4},status:'queued',phase:'preflight',samples:[],recoverySamples:[],metrics:this.chaosMetrics([]),progress:0,startedAt:now,finishedAt:null,abortReason:null,resilienceScore:null,outcome:'Preflight passed. Worker queued.',authorizationReference:engagement.authorizationReference}
    this.state.chaosRuns.unshift(run);this.state.chaosRuns=this.state.chaosRuns.slice(0,100);this.audit(engagement.id,'chaos-engine','started',`${run.name} // ${target}:${port}`,{runId:run.id,profile,durationSeconds,requestsPerSecond,p95LimitMs,errorRateLimit});await this.persist()
    this.executeChaos(run.id).catch(async error=>{const active=this.state.chaosRuns.find(item=>item.id===run.id);if(active&&['queued','running','recovering','aborting'].includes(active.status)){active.status='failed';active.outcome=error.message;active.finishedAt=this.now().toISOString();this.audit(active.engagementId,'chaos-engine','failed',error.message,{runId:active.id});await this.persist().catch(()=>{})}})
    return this.snapshot()
  }

  async executeChaos(id){
    const run=this.state.chaosRuns.find(item=>item.id===id)
    if(!run)return
    run.status='running';run.phase='load';run.outcome='Experiment active. SLO guardrails are watching every probe.';await this.persist()
    for(let second=0;second<run.durationSeconds;second+=1){
      if(this.chaosAbort.has(id))break
      const rate=this.chaosRate(run.profile,run.requestsPerSecond,second,run.durationSeconds)
      const sequenceBase=run.samples.length
      const batch=Array.from({length:Math.min(rate,run.hardCaps.maxConcurrency)},async(_,index)=>{const started=Date.now();try{const response=await this.head(run.target,run.address,run.port,run.secure,run.path);return{sequence:sequenceBase+index+1,second:second+1,statusCode:response.statusCode,durationMs:Date.now()-started,at:this.now().toISOString()}}catch(error){return{sequence:sequenceBase+index+1,second:second+1,error:error.message,durationMs:Date.now()-started,at:this.now().toISOString()}}})
      run.samples.push(...await Promise.all(batch));run.metrics=this.chaosMetrics(run.samples);run.progress=Math.min(90,Math.round((second+1)/run.durationSeconds*90))
      if(run.samples.length>=5&&(run.metrics.errorRate>run.errorRateLimit||run.metrics.p95Ms>run.p95LimitMs)){run.abortReason=run.metrics.errorRate>run.errorRateLimit?`Error rate ${run.metrics.errorRate}% crossed ${run.errorRateLimit}%`:`P95 ${run.metrics.p95Ms} ms crossed ${run.p95LimitMs} ms`;this.chaosAbort.add(id);run.status='aborting';run.outcome=`Automatic abort: ${run.abortReason}`}
      await this.persist();if(!this.chaosAbort.has(id)&&second<run.durationSeconds-1)await this.pause(1000)
    }
    const manuallyAborted=this.chaosAbort.has(id)&&!run.abortReason
    if(run.abortReason)this.chaosAbort.delete(id)
    if(!manuallyAborted){run.status='recovering';run.phase='recovery';run.progress=92;run.outcome=run.abortReason?'Guardrail fired. Measuring recovery.':'Load phase complete. Measuring recovery.';await this.persist();await this.pause(1000)
      for(let index=0;index<5&&!this.chaosAbort.has(id);index+=1){const started=Date.now();try{const response=await this.head(run.target,run.address,run.port,run.secure,run.path);run.recoverySamples.push({sequence:index+1,statusCode:response.statusCode,durationMs:Date.now()-started,at:this.now().toISOString()})}catch(error){run.recoverySamples.push({sequence:index+1,error:error.message,durationMs:Date.now()-started,at:this.now().toISOString()})}run.progress=92+(index+1);await this.persist();if(index<4)await this.pause(500)}
    }
    const stopped=manuallyAborted||(this.chaosAbort.has(id)&&!run.abortReason),recovery=this.chaosMetrics(run.recoverySamples),thresholdAbort=Boolean(run.abortReason),recovered=recovery.requests===5&&recovery.errorRate===0&&recovery.p95Ms<=run.p95LimitMs
    run.recovery=recovery;run.finishedAt=this.now().toISOString();run.progress=100;run.phase='complete'
    run.status=stopped?'aborted':thresholdAbort?'degraded':'completed';run.resilienceScore=stopped?null:Math.max(0,Math.min(100,Math.round(100-run.metrics.errorRate-(run.metrics.p95Ms>run.p95LimitMs?25:0)-(recovered?0:20))))
    run.outcome=stopped?'Emergency stop completed. No further probes were sent.':thresholdAbort?(recovered?'Guardrail fired; the target recovered inside the validation window.':'Guardrail fired and recovery validation failed.'):(recovered?'SLO held and recovery validation passed.':'Load completed but recovery validation failed.')
    this.chaosAbort.delete(id);this.audit(run.engagementId,'chaos-engine',run.status,`${run.name} // ${run.outcome}`,{runId:run.id,metrics:run.metrics,recovery:run.recovery,resilienceScore:run.resilienceScore});await this.persist()
  }

  async abortChaos(id){
    this.assertEntitled();const run=this.state.chaosRuns.find(item=>item.id===id)
    if(!run||!['queued','running','recovering','aborting'].includes(run.status))throw new Error('Active Chaos Engine run not found')
    this.chaosAbort.add(id);run.status='aborting';run.outcome='Emergency stop requested. Waiting for the active bounded probe to settle.';this.audit(run.engagementId,'chaos-engine','abort-requested',run.name,{runId:id});await this.persist();return this.snapshot()
  }

  async createFinding(input){
    this.assertEntitled()
    const engagement=this.state.engagements.find(item=>item.id===input?.engagementId)
    if(!engagement)throw new Error('Engagement not found')
    const capture=this.state.captures.find(item=>item.id===input?.captureId&&item.engagementId===engagement.id)
    if(!capture)throw new Error('Select evidence captured inside this engagement')
    if(capture.digest!==captureDigest(capture))throw new Error('Evidence integrity verification failed')
    const title=String(input?.title||'').trim().slice(0,140),description=String(input?.description||'').trim().slice(0,4000),impact=String(input?.impact||'').trim().slice(0,3000),remediation=String(input?.remediation||'').trim().slice(0,3000)
    const severity=String(input?.severity||'informational').toLowerCase()
    if(title.length<5||description.length<20)throw new Error('Add a specific title and evidence-backed description')
    if(!['informational','low','medium','high','critical'].includes(severity))throw new Error('Invalid finding severity')
    const now=this.now().toISOString(),finding={id:randomUUID(),engagementId:engagement.id,title,severity,status:'open',target:capture.target,description,impact,remediation,evidenceIds:[capture.id],retests:[],history:[{status:'open',at:now,note:'Finding created from sealed diagnostic evidence'}],createdAt:now,updatedAt:now}
    this.state.findings.unshift(finding);this.state.findings=this.state.findings.slice(0,1000)
    this.audit(engagement.id,'finding','created',`${severity.toUpperCase()} // ${title}`,{findingId:finding.id,captureId:capture.id});await this.persist();return this.snapshot()
  }

  async updateFinding(id,input){
    this.assertEntitled()
    const finding=this.state.findings.find(item=>item.id===id)
    if(!finding)throw new Error('Finding not found')
    const allowedStatuses=['open','accepted-risk','resolved','false-positive'],nextStatus=String(input?.status||finding.status)
    if(!allowedStatuses.includes(nextStatus))throw new Error('Invalid finding status')
    const note=String(input?.note||'').trim().slice(0,500)
    if(nextStatus!==finding.status){finding.status=nextStatus;finding.history.unshift({status:nextStatus,at:this.now().toISOString(),note:note||'Disposition updated by operator'})}
    finding.updatedAt=this.now().toISOString();this.audit(finding.engagementId,'finding','updated',`${finding.title} // ${finding.status.toUpperCase()}`,{findingId:finding.id,note});await this.persist();return this.snapshot()
  }

  async retestFinding(id,input){
    this.assertEntitled()
    const finding=this.state.findings.find(item=>item.id===id)
    if(!finding)throw new Error('Finding not found')
    const capture=this.state.captures.find(item=>item.id===input?.captureId&&item.engagementId===finding.engagementId)
    if(!capture)throw new Error('Select a retest capture from this engagement')
    if(capture.digest!==captureDigest(capture))throw new Error('Evidence integrity verification failed')
    const verdict=String(input?.verdict||'')
    if(!['fixed','still-present'].includes(verdict))throw new Error('Choose a supported retest verdict')
    const at=this.now().toISOString(),note=String(input?.note||'').trim().slice(0,500)
    finding.retests.unshift({id:randomUUID(),captureId:capture.id,verdict,note,at})
    finding.evidenceIds=[...new Set([...finding.evidenceIds,capture.id])]
    finding.status=verdict==='fixed'?'resolved':'open';finding.updatedAt=at;finding.history.unshift({status:finding.status,at,note:note||`Retest verdict: ${verdict}`})
    this.audit(finding.engagementId,'retest','completed',`${finding.title} // ${verdict.toUpperCase()}`,{findingId:finding.id,captureId:capture.id,verdict,note});await this.persist();return this.snapshot()
  }

  certificate(target,address,port){return new Promise((resolve,reject)=>{const socket=tls.connect({host:address,port,servername:net.isIP(target)?undefined:target,rejectUnauthorized:false,timeout:7000},()=>{const cert=socket.getPeerCertificate(),authorized=socket.authorized,authorizationError=socket.authorizationError,protocol=socket.getProtocol()||null,cipher=socket.getCipher()||null,alpnProtocol=socket.alpnProtocol||null,validTo=cert.valid_to||null,daysRemaining=validTo?Math.floor((Date.parse(validTo)-this.now().getTime())/86_400_000):null;socket.end();resolve({authorized,authorizationError:authorizationError||null,protocol,cipher,alpnProtocol,subject:cert.subject||null,subjectAlternativeName:cert.subjectaltname||null,issuer:cert.issuer||null,validFrom:cert.valid_from||null,validTo,fingerprint256:cert.fingerprint256||null,serialNumber:cert.serialNumber||null,daysRemaining})});socket.once('timeout',()=>{socket.destroy();reject(new Error('TLS handshake timed out'))});socket.once('error',error=>reject(new Error(`TLS handshake failed: ${error.message}`)))})}

  audit(engagementId,operation,status,summary,evidence=null){const previous=this.state.audit.find(item=>item.engagementId===engagementId),entry={id:randomUUID(),engagementId,operation,status,summary,evidence,at:this.now().toISOString(),previousHash:previous?.hash||null};if(this.trust?.snapshot().configured)entry.attestation=this.trust.sign('fieldops-operation-receipt',entry);entry.hash=createHash('sha256').update(JSON.stringify(entry)).digest('hex');this.state.audit.unshift(entry);this.state.audit=this.state.audit.slice(0,1000)}
  verifyCaptures(){return this.state.captures.every(capture=>capture.digest===captureDigest(capture))}
  verifyAudit(){return this.state.audit.every((entry,index)=>{const {hash,...unsigned}=entry;const expected=createHash('sha256').update(JSON.stringify(unsigned)).digest('hex'),next=this.state.audit.slice(index+1).find(item=>item.engagementId===entry.engagementId);return hash===expected&&(!next||entry.previousHash===next.hash)})}
  verifySignatures(){return this.state.engagements.every(item=>item.policyLevel==='legacy'&&!item.permit||Boolean(item.permit&&TrustAuthority.verify(item.permit.attestation,TrustAuthority.unsignedPermit(item.permit))))&&this.state.audit.every(entry=>{if(!entry.attestation)return true;const {hash:_hash,attestation,...unsigned}=entry;return TrustAuthority.verify(attestation,unsigned)})}
  persist(){const serialized=`${JSON.stringify(this.state,null,2)}\n`;this.writeQueue=this.writeQueue.then(async()=>{const temporary=`${this.file}.tmp`;await writeFile(temporary,serialized,'utf8');await rename(temporary,this.file)});return this.writeQueue}
}

module.exports={EngagementStore,isPublicAddress,isPrivateAddress,normalizeTarget,normalizeHttpPath}
