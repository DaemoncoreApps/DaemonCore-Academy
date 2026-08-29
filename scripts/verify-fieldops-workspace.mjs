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
  const store=new EngagementStore(directory,{entitlement:()=>({fieldOps:true}),now:()=>current,lookup:async()=>[{address:'93.184.216.34',family:4}],dns})
  await store.initialize()
  let state=await store.create({name:'External assurance review',client:'Example Corp',authorizationReference:'SOW-2026-88',targets:'example.com',ports:'443',validFrom:'2026-08-29T14:00:00Z',validUntil:'2026-08-30T14:00:00Z',attested:true})
  const engagementId=state.engagements[0].id
  const first=await store.run({engagementId,type:'dns',target:'example.com'})
  state=store.snapshot()
  assert.equal(state.schemaVersion,3)
  assert.equal(state.captures.length,1)
  assert.match(first.digest,/^[a-f0-9]{64}$/)
  const profile=await store.dnsProfile('example.com',first.result.addresses)
  assert.deepEqual(profile.nameservers,['ns1.example.com'])
  assert.deepEqual(profile.txt,['v=spf1 -all'])
  const posture=store.analyzeHttp({headers:{'strict-transport-security':'max-age=31536000','content-security-policy':"default-src 'self'",'set-cookie':'session=lab; Secure; HttpOnly; SameSite=Lax',server:'example'}},true)
  assert.equal(posture.cookies.secure,true)
  assert.ok(posture.observations.includes('The response exposes server implementation metadata'))
  store.portSurvey=async()=>({tested:1,hardCap:30,observations:[{port:443,state:'open',latencyMs:12}]})
  store.httpPosture=async()=>({response:{statusCode:200,headers:{}},posture:{score:0,missing:['strict-transport-security']}})
  store.lastRunAt=0
  const surface=await store.run({engagementId,type:'surface',target:'example.com'})
  assert.deepEqual(surface.result.summary.openPorts,[443])
  assert.equal(surface.result.web.length,1)
  assert.deepEqual(surface.result.hardCaps,{ports:30,webServices:4,redirects:0})
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
  assert.equal(persisted.captures.length,3)
  console.log('FieldOps workspace verified // surface intelligence, sealed captures, findings, retests, and persistence')
}finally{await rm(directory,{recursive:true,force:true})}
