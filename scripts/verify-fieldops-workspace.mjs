import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require=createRequire(import.meta.url)
const {EngagementStore}=require('../electron/engagement-store.cjs')
const directory=await mkdtemp(path.join(tmpdir(),'daemoncore-fieldops-workspace-'))
const current=new Date('2026-08-29T15:00:00Z')

try{
  const dns={resolveMx:async()=>[{priority:10,exchange:'mail.example.com'}],resolveNs:async()=>['ns1.example.com'],resolveTxt:async()=>[['v=spf1 ','-all']],resolveCaa:async()=>[{critical:0,issue:'ca.example'}],resolveSoa:async()=>({nsname:'ns1.example.com',hostmaster:'hostmaster.example.com',serial:42})}
  const toolBridge={inventory:async({address,ports})=>({engine:'native-nmap',host:{address,state:'up'},ports:[{port:22,state:'open',service:'ssh',product:'OpenSSH',version:'9.8',confidence:10,cpe:['cpe:/a:openbsd:openssh:9.8']}],summary:{tested:ports.length,open:1}})}
  const store=new EngagementStore(directory,{entitlement:()=>({fieldOps:true}),now:()=>current,lookup:async()=>[{address:'93.184.216.34',family:4}],dns,toolBridge})
  await store.initialize()
  let state=await store.create({name:'External assurance review',client:'Example Corp',authorizationReference:'SOW-2026-88',targets:'example.com',ports:'22,443',validFrom:'2026-08-29T14:00:00Z',validUntil:'2026-08-30T14:00:00Z',attested:true})
  const engagementId=state.engagements[0].id
  const first=await store.run({engagementId,type:'dns',target:'example.com'})
  state=store.snapshot()
  assert.equal(state.schemaVersion,4)
  assert.equal(state.engagements[0].networkMode,'external')
  assert.equal(state.captures.length,1)
  assert.match(first.digest,/^[a-f0-9]{64}$/)
  const profile=await store.dnsProfile('example.com',first.result.addresses)
  assert.deepEqual(profile.nameservers,['ns1.example.com'])
  assert.deepEqual(profile.txt,['v=spf1 -all'])
  const posture=store.analyzeHttp({headers:{'strict-transport-security':'max-age=31536000','content-security-policy':"default-src 'self'",'set-cookie':'session=lab; Secure; HttpOnly; SameSite=Lax',server:'example'}},true)
  assert.equal(posture.cookies.secure,true)
  assert.ok(posture.observations.includes('The response exposes server implementation metadata'))
  store.portSurvey=async()=>({tested:1,hardCap:128,concurrency:4,observations:[{port:443,state:'open',latencyMs:12}]})
  store.httpPosture=async()=>({response:{statusCode:200,headers:{}},posture:{score:0,missing:['strict-transport-security'],disclosure:{server:'edge-a'}}})
  store.certificate=async()=>({fingerprint256:'AA:BB',daysRemaining:90,protocol:'TLSv1.3'})
  store.lastRunAt=0
  const surface=await store.run({engagementId,type:'surface',target:'example.com'})
  assert.deepEqual(surface.result.summary.openPorts,[443])
  assert.equal(surface.result.web.length,1)
  assert.deepEqual(surface.result.hardCaps,{ports:128,portConcurrency:4,webServices:8,tlsHandshakes:8,redirects:0})
  assert.equal(surface.result.web[0].tls.protocol,'TLSv1.3')
  assert.equal(surface.result.comparison.status,'baseline-established')
  store.portSurvey=async()=>({tested:2,hardCap:128,concurrency:4,observations:[{port:80,state:'open',latencyMs:9},{port:443,state:'open',latencyMs:12}]})
  store.httpPosture=async(_target,_address,port)=>({response:{statusCode:port===80?301:200,headers:{}},posture:{score:port===80?50:25,missing:[],disclosure:{server:'edge-b'}}})
  store.lastRunAt=0
  const changed=await store.run({engagementId,type:'surface',target:'example.com'})
  assert.equal(changed.result.comparison.status,'drift-detected')
  assert.equal(changed.result.comparison.highestSeverity,'high')
  assert.ok(changed.result.comparison.changes.some(item=>item.kind==='port'))
  assert.ok(changed.result.comparison.changes.some(item=>item.kind==='http-posture'))
  assert.equal(store.compareSurface(changed,changed).status,'no-change')
  const storedChanged=store.state.captures.find(item=>item.id===changed.id)
  storedChanged.result.summary.openPorts.push(22)
  store.lastRunAt=0
  await assert.rejects(()=>store.run({engagementId,type:'surface',target:'example.com'}),/Previous surface baseline failed integrity verification/)
  storedChanged.result.summary.openPorts.pop()
  store.readBanner=async()=>({connected:true,connectLatencyMs:14,banner:'',bannerBytes:0,receivedBytes:0,truncated:false})
  store.lastRunAt=0
  const service=await store.run({engagementId,type:'service-profile',target:'example.com',port:443,tls:true})
  assert.deepEqual(service.result.identity,{service:'https',confidence:'observed',signal:'HTTP response'})
  assert.equal(service.result.tls.protocol,'TLSv1.3')
  assert.deepEqual(store.identifyService(22,'SSH-2.0-OpenSSH_9.8',null,null),{service:'ssh',confidence:'observed',signal:'server banner'})
  store.head=async(_target,_address,_port,_secure,requestPath)=>({statusCode:requestPath==='/admin'?403:requestPath==='/missing'?404:200,headers:{'content-type':'text/plain','content-length':'12'}})
  store.lastRunAt=0
  const mapped=await store.run({engagementId,type:'web-map',target:'example.com',port:443,path:'/admin',tls:true})
  assert.equal(mapped.result.requestCount,8)
  assert.equal(mapped.result.observations[0].statusCode,403)
  assert.equal(mapped.result.observations[0].present,true)
  assert.deepEqual(mapped.result.hardCaps,{requests:8,concurrency:1,minimumIntervalMs:250,redirects:0,responseBodyBytes:0})
  store.lastRunAt=0
  const inventory=await store.run({engagementId,type:'deep-inventory',target:'example.com'})
  assert.equal(inventory.result.engine,'native-nmap')
  assert.equal(inventory.result.ports[0].product,'OpenSSH')
  assert.deepEqual(inventory.addresses,['93.184.216.34'])
  const fallbackStore=new EngagementStore(directory,{toolBridge:{inventory:async()=>{throw new Error('engine unavailable')}},pause:async()=>{}})
  fallbackStore.portSurvey=async()=>({tested:2,hardCap:128,concurrency:4,observations:[{port:22,state:'open'},{port:443,state:'closed-or-rejected'}]})
  fallbackStore.serviceProfile=async()=>({identity:{service:'ssh',confidence:'observed'},transport:{banner:'SSH-2.0-Test'}})
  const fallback=await fallbackStore.deepInventory('example.com','93.184.216.34',{ports:[22,443]})
  assert.equal(fallback.engine,'daemoncore-native')
  assert.equal(fallback.summary.profiled,1)
  assert.match(fallback.adapterNotice,/engine unavailable/)
  store.lastRunAt=0
  await assert.rejects(()=>store.run({engagementId,type:'service-profile',target:'example.com',port:444,tls:true}),/Port is outside the engagement allowlist/)
  state=await store.createFinding({engagementId,captureId:first.id,title:'Public DNS resolves to an unexpected provider',severity:'medium',description:'The authorized hostname resolved to an address outside the owner-approved hosting inventory.',impact:'Traffic may terminate in an environment that is not covered by the expected control set.',remediation:'Confirm ownership, correct the record, and repeat the same DNS capture.'})
  const finding=state.findings[0]
  assert.equal(finding.status,'open')
  assert.deepEqual(finding.evidenceIds,[first.id])
  await assert.rejects(()=>store.createFinding({engagementId,captureId:'outside',title:'Invalid evidence record',severity:'high',description:'This record deliberately references evidence outside the engagement.'}),/Select evidence captured/)
  store.lastRunAt=0
  const second=await store.run({engagementId,type:'dns',target:'example.com'})
  state=await store.retestFinding(finding.id,{captureId:second.id,verdict:'fixed',note:'Owner-approved address now returned consistently.'})
  assert.equal(state.findings[0].status,'resolved')
  assert.equal(state.findings[0].retests.length,1)
  assert.equal(state.findings[0].evidenceIds.length,2)
  state=await store.updateFinding(finding.id,{status:'accepted-risk',note:'Client accepted the documented residual exposure.'})
  assert.equal(state.findings[0].status,'accepted-risk')
  assert.equal(state.auditIntegrity,true)
  assert.equal(state.captureIntegrity,true)
  const tampered=new EngagementStore(directory,{entitlement:()=>({fieldOps:true})})
  tampered.state=structuredClone(store.state);tampered.state.captures[0].target='tampered.example'
  assert.equal(tampered.snapshot().captureIntegrity,false)
  await assert.rejects(()=>tampered.createFinding({engagementId,captureId:second.id,title:'Tampered capture must not promote',severity:'high',description:'This altered capture must fail integrity verification before promotion.'}),/integrity verification failed/)
  const persisted=JSON.parse(await readFile(path.join(directory,'fieldops-engagements.json'),'utf8'))
  assert.equal(persisted.findings.length,1)
  assert.equal(persisted.captures.length,7)
  console.log('FieldOps workspace verified // deep service inventory, web maps, drift detection, sealed captures, findings, retests, and persistence')
}finally{await rm(directory,{recursive:true,force:true})}
