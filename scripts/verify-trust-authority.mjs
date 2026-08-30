import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require=createRequire(import.meta.url)
const {TrustAuthority}=require('../electron/trust-authority.cjs')
const {EngagementStore}=require('../electron/engagement-store.cjs')
const directory=await mkdtemp(path.join(tmpdir(),'daemoncore-trust-'))
const safeStorage={isEncryptionAvailable:()=>true,getSelectedStorageBackend:()=>process.platform==='linux'?'gnome_libsecret':'dpapi',encryptString:value=>Buffer.from(`protected:${value}`),decryptString:value=>value.toString().replace(/^protected:/,'')}
const current=new Date('2026-08-29T16:00:00Z')
const scope={name:'Signed boundary validation',client:'Example Corp',authorizationReference:'ROE-2026-77',approverName:'Morgan Chen',approverEmail:'morgan@example.com',networkMode:'external',targets:'example.com',ports:'443',validFrom:'2026-08-29T15:00:00Z',validUntil:'2026-08-30T15:00:00Z',attested:true}

try{
  const trust=new TrustAuthority(directory,{safeStorage,now:()=>current})
  assert.equal((await trust.initialize()).configured,false)
  const identity=await trust.enroll({fullName:'Jordan Rivera',organization:'Example Security',email:'jordan@example.com',role:'Senior Security Engineer'})
  assert.equal(identity.configured,true);assert.equal(identity.identity.fullName,'Jordan Rivera');assert.match(identity.identity.fingerprint,/^[a-f0-9]{64}$/)
  const protectedKey=(await readFile(path.join(directory,'fieldops-operator-key.bin'))).toString()
  assert.match(protectedKey,/^protected:/);assert.doesNotMatch(protectedKey,/PRIVATE KEY/)

  const store=new EngagementStore(directory,{trust,entitlement:()=>({fieldOps:true}),now:()=>current,lookup:async()=>[{address:'93.184.216.34',family:4}]})
  await store.initialize();let state=await store.create({...scope,policyLevel:'validate'});const engagement=state.engagements[0]
  assert.equal(engagement.policyLevel,'validate');assert.equal(engagement.permit.attestation.operator.fullName,'Jordan Rivera');assert.equal(engagement.permit.approvingAuthority.name,'Morgan Chen')
  assert.equal(state.signatureIntegrity,true);assert.equal(state.audit[0].attestation.operator.fullName,'Jordan Rivera')
  const capture=await store.run({engagementId:engagement.id,type:'dns',target:'example.com'})
  assert.equal(capture.target,'example.com');assert.equal(store.snapshot().signatureIntegrity,true)
  await assert.rejects(()=>store.startChaos({engagementId:engagement.id,target:'example.com',port:443,path:'/',profile:'baseline',attested:true}),/resilience operations are not authorized/)
  store.state.engagements.find(item=>item.id===engagement.id).targets.push('outside.example.com');store.lastRunAt=0
  await assert.rejects(()=>store.run({engagementId:engagement.id,type:'dns',target:'example.com'}),/no longer matches its signed operation permit/)
  store.state.engagements.find(item=>item.id===engagement.id).targets.pop()
  const savedPermit=store.state.engagements.find(item=>item.id===engagement.id).permit;delete store.state.engagements.find(item=>item.id===engagement.id).permit;store.lastRunAt=0
  await assert.rejects(()=>store.run({engagementId:engagement.id,type:'dns',target:'example.com'}),/must be reissued with a signed operation permit/)
  store.state.engagements.find(item=>item.id===engagement.id).permit=savedPermit

  state=await store.create({...scope,name:'Observe-only review',authorizationReference:'ROE-2026-78',policyLevel:'observe'})
  const observe=state.engagements[0];store.lastRunAt=0
  await assert.rejects(()=>store.run({engagementId:observe.id,type:'deep-inventory',target:'example.com'}),/validate operations are not authorized/)
  store.state.engagements.find(item=>item.id===observe.id).permit.allowedOperations.push('resilience');store.lastRunAt=0
  await assert.rejects(()=>store.run({engagementId:observe.id,type:'dns',target:'example.com'}),/permit integrity verification failed/)
  assert.equal(store.snapshot().signatureIntegrity,false)

  const reloaded=new TrustAuthority(directory,{safeStorage,now:()=>current}),restored=await reloaded.initialize()
  assert.equal(restored.configured,true);assert.equal(restored.identity.fingerprint,identity.identity.fingerprint)
  console.log('Trust Authority verified // protected identity, signed permits, named receipts, policy enforcement, tamper rejection, and reload')
}finally{await rm(directory,{recursive:true,force:true})}
