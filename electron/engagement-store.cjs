const { lookup } = require('dns/promises')
const { mkdir, readFile, rename, writeFile } = require('fs/promises')
const http = require('http')
const https = require('https')
const net = require('net')
const path = require('path')
const tls = require('tls')
const { createHash, randomUUID } = require('crypto')

const cleanState = () => ({ schemaVersion: 2, engagements: [], chaosRuns: [], audit: [] })
const clone = value => JSON.parse(JSON.stringify(value))
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
    this.pause=options.pause||pause
    this.lastRunAt=0
    this.running=false
    this.chaosAbort=new Set()
    this.writeQueue=Promise.resolve()
  }

  async initialize(){await mkdir(this.directory,{recursive:true});try{this.state={...cleanState(),...JSON.parse(await readFile(this.file,'utf8'))};this.state.chaosRuns||=[];for(const run of this.state.chaosRuns){if(['queued','running','recovering','aborting'].includes(run.status)){run.status='interrupted';run.finishedAt=this.now().toISOString();run.outcome='The desktop process ended before the experiment completed.'}}}catch{this.state=cleanState()}await this.persist();return this.snapshot()}
  snapshot(){return {...clone(this.state),auditIntegrity:this.verifyAudit()}}
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
      port=type==='ports'?null:Number(input?.port||({dns:53,http:80,baseline:443,tls:443}[type]))
      if(!['dns','ports'].includes(type)&&!engagement.ports.includes(port))throw new Error('Port is outside the engagement allowlist')
      if(!['dns','tcp','ports','http','baseline','tls'].includes(type))throw new Error('Unsupported diagnostic')
      requestPath=['http','baseline'].includes(type)?normalizeHttpPath(input?.path):null
      const addresses=await this.resolvePublic(target),started=Date.now()
      let result
      if(type==='dns')result={addresses}
      if(type==='tcp')result=await this.tcp(addresses[0].address,port)
      if(type==='ports')result=await this.portSurvey(addresses[0].address,engagement.ports)
      if(type==='http')result=await this.head(target,addresses[0].address,port,Boolean(input?.tls),requestPath)
      if(type==='baseline')result=await this.baseline(target,addresses[0].address,port,Boolean(input?.tls),requestPath)
      if(type==='tls')result=await this.certificate(target,addresses[0].address,port)
      const output={id:randomUUID(),engagementId:engagement.id,type,target,port:['dns','ports'].includes(type)?null:port,path:requestPath,addresses:addresses.map(item=>item.address),durationMs:Date.now()-started,result,at:this.now().toISOString()}
      this.audit(engagement.id,type,'completed',`${target}${port?`:${port}`:''}${requestPath||''}`,output);await this.persist();return output
    }catch(error){if(engagement)this.audit(engagement.id,type||'diagnostic','blocked',error.message,{target,port});await this.persist().catch(()=>{});throw error}finally{this.running=false}
  }

  tcp(address,port,timeoutMs=5000){return new Promise((resolve,reject)=>{const started=Date.now(),socket=net.createConnection({host:address,port});socket.setTimeout(timeoutMs);socket.once('connect',()=>{const latencyMs=Date.now()-started;socket.destroy();resolve({connected:true,latencyMs})});socket.once('timeout',()=>{socket.destroy();reject(new Error('TCP connection timed out'))});socket.once('error',error=>reject(new Error(`TCP connection failed: ${error.code||error.message}`)))})}

  async portSurvey(address,ports){const observations=[];for(const port of ports){const started=Date.now();try{const result=await this.tcp(address,port,1500);observations.push({port,state:'open',latencyMs:result.latencyMs})}catch(error){observations.push({port,state:error.message.includes('timed out')?'filtered-or-unresponsive':'closed-or-rejected',latencyMs:Date.now()-started})}await this.pause(100)}return{tested:observations.length,hardCap:30,observations}}

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

  certificate(target,address,port){return new Promise((resolve,reject)=>{const socket=tls.connect({host:address,port,servername:net.isIP(target)?undefined:target,rejectUnauthorized:false,timeout:7000},()=>{const cert=socket.getPeerCertificate(),authorized=socket.authorized,authorizationError=socket.authorizationError;socket.end();resolve({authorized,authorizationError:authorizationError||null,subject:cert.subject||null,issuer:cert.issuer||null,validFrom:cert.valid_from||null,validTo:cert.valid_to||null,fingerprint256:cert.fingerprint256||null,serialNumber:cert.serialNumber||null})});socket.once('timeout',()=>{socket.destroy();reject(new Error('TLS handshake timed out'))});socket.once('error',error=>reject(new Error(`TLS handshake failed: ${error.message}`)))})}

  audit(engagementId,operation,status,summary,evidence=null){const previous=this.state.audit.find(item=>item.engagementId===engagementId),entry={id:randomUUID(),engagementId,operation,status,summary,evidence,at:this.now().toISOString(),previousHash:previous?.hash||null};entry.hash=createHash('sha256').update(JSON.stringify(entry)).digest('hex');this.state.audit.unshift(entry);this.state.audit=this.state.audit.slice(0,1000)}
  verifyAudit(){return this.state.audit.every((entry,index)=>{const {hash,...unsigned}=entry;const expected=createHash('sha256').update(JSON.stringify(unsigned)).digest('hex'),next=this.state.audit.slice(index+1).find(item=>item.engagementId===entry.engagementId);return hash===expected&&(!next||entry.previousHash===next.hash)})}
  persist(){const serialized=`${JSON.stringify(this.state,null,2)}\n`;this.writeQueue=this.writeQueue.then(async()=>{const temporary=`${this.file}.tmp`;await writeFile(temporary,serialized,'utf8');await rename(temporary,this.file)});return this.writeQueue}
}

module.exports={EngagementStore,isPublicAddress,normalizeTarget,normalizeHttpPath}
