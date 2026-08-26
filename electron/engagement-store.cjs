const { lookup } = require('dns/promises')
const { mkdir, readFile, rename, writeFile } = require('fs/promises')
const http = require('http')
const https = require('https')
const net = require('net')
const path = require('path')
const tls = require('tls')
const { createHash, randomUUID } = require('crypto')

const cleanState = () => ({ schemaVersion: 1, engagements: [], audit: [] })
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
    this.writeQueue=Promise.resolve()
  }

  async initialize(){await mkdir(this.directory,{recursive:true});try{this.state={...cleanState(),...JSON.parse(await readFile(this.file,'utf8'))}}catch{await this.persist()}return this.snapshot()}
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

  certificate(target,address,port){return new Promise((resolve,reject)=>{const socket=tls.connect({host:address,port,servername:net.isIP(target)?undefined:target,rejectUnauthorized:false,timeout:7000},()=>{const cert=socket.getPeerCertificate(),authorized=socket.authorized,authorizationError=socket.authorizationError;socket.end();resolve({authorized,authorizationError:authorizationError||null,subject:cert.subject||null,issuer:cert.issuer||null,validFrom:cert.valid_from||null,validTo:cert.valid_to||null,fingerprint256:cert.fingerprint256||null,serialNumber:cert.serialNumber||null})});socket.once('timeout',()=>{socket.destroy();reject(new Error('TLS handshake timed out'))});socket.once('error',error=>reject(new Error(`TLS handshake failed: ${error.message}`)))})}

  audit(engagementId,operation,status,summary,evidence=null){const previous=this.state.audit.find(item=>item.engagementId===engagementId),entry={id:randomUUID(),engagementId,operation,status,summary,evidence,at:this.now().toISOString(),previousHash:previous?.hash||null};entry.hash=createHash('sha256').update(JSON.stringify(entry)).digest('hex');this.state.audit.unshift(entry);this.state.audit=this.state.audit.slice(0,1000)}
  verifyAudit(){return this.state.audit.every((entry,index)=>{const {hash,...unsigned}=entry;const expected=createHash('sha256').update(JSON.stringify(unsigned)).digest('hex'),next=this.state.audit.slice(index+1).find(item=>item.engagementId===entry.engagementId);return hash===expected&&(!next||entry.previousHash===next.hash)})}
  persist(){const serialized=`${JSON.stringify(this.state,null,2)}\n`;this.writeQueue=this.writeQueue.then(async()=>{const temporary=`${this.file}.tmp`;await writeFile(temporary,serialized,'utf8');await rename(temporary,this.file)});return this.writeQueue}
}

module.exports={EngagementStore,isPublicAddress,normalizeTarget,normalizeHttpPath}
