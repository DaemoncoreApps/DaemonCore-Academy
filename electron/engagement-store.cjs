const dnsPromises = require('dns/promises')
const { lookup } = dnsPromises
const { mkdir, readFile, rename, writeFile } = require('fs/promises')
const http = require('http')
const https = require('https')
const net = require('net')
const path = require('path')
const tls = require('tls')
const { createHash, randomUUID } = require('crypto')

const cleanState = () => ({ schemaVersion: 3, engagements: [], chaosRuns: [], captures: [], findings: [], audit: [] })
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
    this.lastRunAt=0
    this.running=false
    this.chaosAbort=new Set()
    this.writeQueue=Promise.resolve()
  }

  async initialize(){await mkdir(this.directory,{recursive:true});try{this.state={...cleanState(),...JSON.parse(await readFile(this.file,'utf8')),schemaVersion:3};this.state.chaosRuns||=[];this.state.captures||=[];this.state.findings||=[];for(const run of this.state.chaosRuns){if(['queued','running','recovering','aborting'].includes(run.status)){run.status='interrupted';run.finishedAt=this.now().toISOString();run.outcome='The desktop process ended before the experiment completed.'}}}catch{this.state=cleanState()}await this.persist();return this.snapshot()}
  snapshot(){return {...clone(this.state),auditIntegrity:this.verifyAudit(),captureIntegrity:this.verifyCaptures()}}
  assertEntitled(){if(!this.entitlement().fieldOps)throw new Error('FieldOps Pro entitlement required')}

  async create(input){
    this.assertEntitled()
    const name=String(input?.name||'').trim().slice(0,100),client=String(input?.client||'').trim().slice(0,100),authorizationReference=String(input?.authorizationReference||'').trim().slice(0,160)
    if(name.length<3||client.length<2)throw new Error('Engagement name and client are required')
    if(authorizationReference.length<4)throw new Error('Add the authorization or rules-of-engagement reference')
    if(input?.attested!==true)throw new Error('Explicit authorization attestation is required')
    const targets=[...new Set(String(input.targets||'').split(/[\s,]+/).filter(Boolean).map(normalizeTarget))]
    const ports=[...new Set(String(input.ports||'').split(/[\s,]+/).filter(Boolean).map(Number))].sort((a,b)=>a-b)
    if(!targets.length||targets.length>50)throw new Error('Add between 1 and 50 exact targets')
    if(!ports.length||ports.length>30||ports.some(port=>!Number.isInteger(port)||port<1||port>65535))throw new Error('Add between 1 and 30 valid TCP ports')
    const validFrom=new Date(input.validFrom),validUntil=new Date(input.validUntil),now=this.now()
    if(Number.isNaN(validFrom.getTime())||Number.isNaN(validUntil.getTime())||validUntil<=validFrom)throw new Error('Enter a valid testing window')
    if(validUntil.getTime()-validFrom.getTime()>366*86_400_000)throw new Error('Testing windows cannot exceed one year')
    const engagement={id:randomUUID(),name,client,authorizationReference,targets,ports,validFrom:validFrom.toISOString(),validUntil:validUntil.toISOString(),attestedAt:now.toISOString(),status:'active',createdAt:now.toISOString()}
    this.state.engagements.unshift(engagement);this.audit(engagement.id,'engagement','created','Authorization boundary recorded');await this.persist();return this.snapshot()
  }

  async close(id){
    this.assertEntitled()
    const engagement=this.state.engagements.find(item=>item.id===id)
    if(!engagement||engagement.status!=='active')throw new Error('Active engagement not found')
    if(this.state.chaosRuns.some(item=>item.engagementId===id&&['queued','running','recovering','aborting'].includes(item.status)))throw new Error('Stop the active Chaos Engine experiment before closing its authorization boundary')
    engagement.status='closed';engagement.closedAt=this.now().toISOString();this.audit(id,'engagement','closed','Authorization boundary closed by operator');await this.persist();return this.snapshot()
  }

  getActive(id){
    this.assertEntitled();const engagement=this.state.engagements.find(item=>item.id===id)
    if(!engagement||engagement.status!=='active')throw new Error('Active engagement not found')
    const now=this.now().getTime();if(now<Date.parse(engagement.validFrom)||now>Date.parse(engagement.validUntil))throw new Error('The authorized testing window is closed')
    return engagement
  }

  async resolvePublic(target){
    if(net.isIP(target)){if(!isPublicAddress(target))throw new Error('FieldOps external mode blocks private, loopback, link-local, and reserved addresses');return [{address:target,family:net.isIPv4(target)?4:6}]}
    const addresses=await this.lookup(target,{all:true,verbatim:true})
    if(!addresses.length||addresses.some(item=>!isPublicAddress(item.address)))throw new Error('Target resolution is empty or crosses a non-public network boundary')
    return addresses
  }

  async run(input){
    if(this.running)throw new Error('Another diagnostic is already running')
    if(this.state.chaosRuns.some(item=>['queued','running','recovering','aborting'].includes(item.status)))throw new Error('A Chaos Engine experiment is active')
    const wait=750-(Date.now()-this.lastRunAt);if(wait>0)throw new Error('FieldOps rate limit: wait before the next diagnostic')
    this.running=true;this.lastRunAt=Date.now()
    let engagement,target,type,port,requestPath
    try{
      engagement=this.getActive(input?.engagementId);target=normalizeTarget(input?.target);type=String(input?.type||'')
      if(!engagement.targets.includes(target))throw new Error('Target is outside the signed engagement allowlist')
      const targetOnly=['dns','dns-profile','ports','surface'].includes(type)
      port=targetOnly?null:Number(input?.port||({http:80,'http-posture':443,baseline:443,tls:443}[type]))
      if(!targetOnly&&!engagement.ports.includes(port))throw new Error('Port is outside the engagement allowlist')
      if(!['dns','dns-profile','tcp','ports','surface','http','http-posture','baseline','tls'].includes(type))throw new Error('Unsupported diagnostic')
      requestPath=['http','http-posture','baseline'].includes(type)?normalizeHttpPath(input?.path):null
      const addresses=await this.resolvePublic(target),started=Date.now()
      let result
      if(type==='dns')result={addresses}
      if(type==='dns-profile')result=await this.dnsProfile(target,addresses)
      if(type==='tcp')result=await this.tcp(addresses[0].address,port)
      if(type==='ports')result=await this.portSurvey(addresses[0].address,engagement.ports)
      if(type==='surface')result=await this.surfaceBaseline(target,addresses[0].address,engagement,addresses)
      if(type==='http')result=await this.head(target,addresses[0].address,port,Boolean(input?.tls),requestPath)
      if(type==='http-posture')result=await this.httpPosture(target,addresses[0].address,port,Boolean(input?.tls),requestPath)
      if(type==='baseline')result=await this.baseline(target,addresses[0].address,port,Boolean(input?.tls),requestPath)
      if(type==='tls')result=await this.certificate(target,addresses[0].address,port)
      const output={id:randomUUID(),engagementId:engagement.id,type,target,port:targetOnly?null:port,path:requestPath,addresses:addresses.map(item=>item.address),durationMs:Date.now()-started,result,at:this.now().toISOString()}
      output.digest=captureDigest(output)
      this.state.captures.unshift(output);this.state.captures=this.state.captures.slice(0,2000)
      this.audit(engagement.id,type,'completed',`${target}${port?`:${port}`:''}${requestPath||''}`,output);await this.persist();return output
    }catch(error){if(engagement)this.audit(engagement.id,type||'diagnostic','blocked',error.message,{target,port});await this.persist().catch(()=>{});throw error}finally{this.running=false}
  }

  tcp(address,port,timeoutMs=5000){return new Promise((resolve,reject)=>{const started=Date.now(),socket=net.createConnection({host:address,port});socket.setTimeout(timeoutMs);socket.once('connect',()=>{const latencyMs=Date.now()-started;socket.destroy();resolve({connected:true,latencyMs})});socket.once('timeout',()=>{socket.destroy();reject(new Error('TCP connection timed out'))});socket.once('error',error=>reject(new Error(`TCP connection failed: ${error.code||error.message}`)))})}

  async portSurvey(address,ports){const observations=[];for(const port of ports){const started=Date.now();try{const result=await this.tcp(address,port,1500);observations.push({port,state:'open',latencyMs:result.latencyMs})}catch(error){observations.push({port,state:error.message.includes('timed out')?'filtered-or-unresponsive':'closed-or-rejected',latencyMs:Date.now()-started})}await this.pause(100)}return{tested:observations.length,hardCap:30,observations}}

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
    const dns=await this.dnsProfile(target,addresses),portSurvey=await this.portSurvey(address,engagement.ports),open=portSurvey.observations.filter(item=>item.state==='open'),webPorts=open.filter(item=>[80,443,3000,5000,8000,8080,8081,8443,9443].includes(item.port)).slice(0,4),web=[]
    for(const item of webPorts){const secure=[443,8443,9443].includes(item.port);try{web.push({port:item.port,secure,...await this.httpPosture(target,address,item.port,secure,'/')})}catch(error){web.push({port:item.port,secure,error:error.message})}}
    return{dns,portSurvey,web,summary:{authorizedPorts:engagement.ports.length,openPorts:open.map(item=>item.port),webServicesTested:web.length},hardCaps:{ports:30,webServices:4,redirects:0}}
  }

  head(target,address,port,secure,requestPath='/'){return new Promise((resolve,reject)=>{const client=secure?https:http,request=client.request({method:'HEAD',host:address,port,path:requestPath,servername:secure&&!net.isIP(target)?target:undefined,headers:{Host:target,'User-Agent':'DaemonCore-FieldOps/1.1'},timeout:7000,rejectUnauthorized:true},response=>{const headers=Object.fromEntries(Object.entries(response.headers).slice(0,30).map(([key,value])=>[key,String(value).slice(0,500)]));response.resume();resolve({statusCode:response.statusCode,statusMessage:response.statusMessage,headers})});request.once('timeout',()=>request.destroy(new Error('HTTP request timed out')));request.once('error',error=>reject(new Error(`HTTP HEAD failed: ${error.message}`)));request.end()})}

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
    if(this.running)throw new Error('Wait for the active FieldOps diagnostic to finish')
    if(this.state.chaosRuns.some(item=>['queued','running','recovering','aborting'].includes(item.status)))throw new Error('Another Chaos Engine experiment is already active')
    if(!engagement.targets.includes(target))throw new Error('Target is outside the signed engagement allowlist')
    if(!engagement.ports.includes(port))throw new Error('Port is outside the engagement allowlist')
    if(!['baseline','ramp','spike','soak'].includes(profile))throw new Error('Unsupported load profile')
    if(input?.attested!==true)throw new Error('Run-specific authorization confirmation is required')
    const durationSeconds=Math.max(10,Math.min(60,Math.round(Number(input?.durationSeconds)||20))),requestsPerSecond=Math.max(1,Math.min(4,Math.round(Number(input?.requestsPerSecond)||2)))
    const p95LimitMs=Math.max(250,Math.min(10_000,Math.round(Number(input?.p95LimitMs)||2000))),errorRateLimit=Math.max(1,Math.min(80,Math.round(Number(input?.errorRateLimit)||20)))
    const addresses=await this.resolvePublic(target),now=this.now().toISOString()
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

  audit(engagementId,operation,status,summary,evidence=null){const previous=this.state.audit.find(item=>item.engagementId===engagementId),entry={id:randomUUID(),engagementId,operation,status,summary,evidence,at:this.now().toISOString(),previousHash:previous?.hash||null};entry.hash=createHash('sha256').update(JSON.stringify(entry)).digest('hex');this.state.audit.unshift(entry);this.state.audit=this.state.audit.slice(0,1000)}
  verifyCaptures(){return this.state.captures.every(capture=>capture.digest===captureDigest(capture))}
  verifyAudit(){return this.state.audit.every((entry,index)=>{const {hash,...unsigned}=entry;const expected=createHash('sha256').update(JSON.stringify(unsigned)).digest('hex'),next=this.state.audit.slice(index+1).find(item=>item.engagementId===entry.engagementId);return hash===expected&&(!next||entry.previousHash===next.hash)})}
  persist(){const serialized=`${JSON.stringify(this.state,null,2)}\n`;this.writeQueue=this.writeQueue.then(async()=>{const temporary=`${this.file}.tmp`;await writeFile(temporary,serialized,'utf8');await rename(temporary,this.file)});return this.writeQueue}
}

module.exports={EngagementStore,isPublicAddress,normalizeTarget,normalizeHttpPath}
