import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require=createRequire(import.meta.url)
const {LicenseManager}=require('../electron/license-manager.cjs')
const {EngagementStore,isPrivateAddress,isPublicAddress}=require('../electron/engagement-store.cjs')
const directory=await mkdtemp(path.join(tmpdir(),'daemoncore-phase4-'))

const policy={storeId:1,requireAcademyLicense:true,offlineGraceDays:14,checkoutUrl:'https://example.lemonsqueezy.com',tiers:[{id:'fieldops',label:'FieldOps Pro',productIds:[4],variantIds:[5]},{id:'academy',label:'Academy',productIds:[4],variantIds:[6]}]}
const safeStorage={isEncryptionAvailable:()=>true,encryptString:value=>Buffer.from(`protected:${value}`,'utf8'),decryptString:value=>value.toString('utf8').replace(/^protected:/,'')}
let current=new Date('2026-08-26T15:00:00Z'),offline=false,deactivated=false
const licenseResponse={license_key:{status:'active',expires_at:null},instance:{id:'instance-01',name:'RED-RIG-01'},meta:{store_id:1,product_id:4,product_name:'DaemonCore',variant_id:5,variant_name:'FieldOps Pro',customer_email:'operator@example.com'}}
const fetch=async url=>{
  if(offline)throw new Error('network unavailable')
  if(url.endsWith('/activate'))return{ok:true,json:async()=>({activated:true,...licenseResponse})}
  if(url.endsWith('/validate'))return{ok:true,json:async()=>({valid:true,...licenseResponse})}
  if(url.endsWith('/deactivate')){deactivated=true;return{ok:true,json:async()=>({deactivated:true,license_key:{status:'inactive'},meta:licenseResponse.meta})}}
  throw new Error('unexpected request')
}

try{
  const licensing=new LicenseManager(directory,{policy,safeStorage,fetch,now:()=>current})
  await licensing.initialize()
  assert.throws(()=>licensing.verifyProduct({store_id:2,product_id:4,variant_id:5}),/different store/)
  assert.throws(()=>licensing.verifyProduct({store_id:1,product_id:99,variant_id:99}),/does not unlock/)
  let license=await licensing.activate({licenseKey:'license-key-12345678',email:'operator@example.com',instanceName:'RED-RIG-01'})
  assert.equal(license.licensed,true);assert.equal(license.fieldOps,true);assert.equal(license.tier,'fieldops');assert.equal(license.maskedKey,'••••-12345678')
  assert.doesNotMatch((await readFile(path.join(directory,'license-key.bin'))).toString('utf8'),/^license-key/)
  const metaPath=path.join(directory,'license-meta.json'),tampered=JSON.parse(await readFile(metaPath,'utf8'));tampered.meta.graceUntil='2099-01-01T00:00:00.000Z';await writeFile(metaPath,JSON.stringify(tampered))
  const integrityCheck=new LicenseManager(directory,{policy,safeStorage,fetch,now:()=>current});license=await integrityCheck.initialize();assert.equal(license.status,'tampered');license=await integrityCheck.validate({force:true});assert.equal(license.status,'active')
  license=await licensing.validate({force:true});assert.equal(license.status,'active')
  offline=true;current=new Date('2026-08-28T15:00:00Z');license=await licensing.validate({force:true});assert.equal(license.status,'grace');assert.ok(license.graceRemainingDays>0)
  current=new Date('2026-09-20T15:00:00Z');license=await licensing.validate({force:true});assert.equal(license.status,'offline-expired');assert.equal(license.licensed,false)
  offline=false;await licensing.deactivate();assert.equal(deactivated,true);assert.equal(licensing.snapshot().status,'unlicensed')

  current=new Date('2026-08-26T15:00:00Z')
  const fieldops=new EngagementStore(directory,{entitlement:()=>({fieldOps:true}),now:()=>current,lookup:async()=>[{address:'93.184.216.34',family:4}]})
  await fieldops.initialize()
  let state=await fieldops.create({name:'External surface review',client:'Example Corp',authorizationReference:'SOW-041',targets:'example.com',ports:'80,443',validFrom:'2026-08-26T14:00:00Z',validUntil:'2026-08-27T14:00:00Z',attested:true})
  assert.equal(state.engagements.length,1);assert.equal(state.engagements[0].networkMode,'external');assert.deepEqual(state.engagements[0].targets,['example.com']);assert.deepEqual(state.engagements[0].ports,[80,443])
  await assert.rejects(()=>fieldops.create({name:'Oversized scope',client:'Example Corp',authorizationReference:'SOW-042',targets:'example.com',ports:Array.from({length:129},(_,index)=>index+1).join(','),validFrom:'2026-08-26T14:00:00Z',validUntil:'2026-08-27T14:00:00Z',attested:true}),/between 1 and 128/)
  const result=await fieldops.run({engagementId:state.engagements[0].id,type:'dns',target:'example.com'});assert.deepEqual(result.addresses,['93.184.216.34']);assert.equal(fieldops.snapshot().auditIntegrity,true)
  const verifier=new EngagementStore(directory,{entitlement:()=>({fieldOps:true})});verifier.state=fieldops.snapshot();verifier.state.audit[0].summary='tampered';assert.equal(verifier.verifyAudit(),false)
  fieldops.lastRunAt=0
  await assert.rejects(()=>fieldops.run({engagementId:state.engagements[0].id,type:'dns',target:'outside.example'}),/outside the signed engagement/)
  assert.equal(isPublicAddress('93.184.216.34'),true);assert.equal(isPublicAddress('127.0.0.1'),false);assert.equal(isPublicAddress('10.0.0.1'),false);assert.equal(isPublicAddress('203.0.113.8'),false);assert.equal(isPublicAddress('::1'),false);assert.equal(isPublicAddress('::ffff:127.0.0.1'),false)
  assert.equal(isPrivateAddress('10.40.12.25'),true);assert.equal(isPrivateAddress('172.31.4.8'),true);assert.equal(isPrivateAddress('192.168.50.4'),true);assert.equal(isPrivateAddress('fd12:3456::25'),true);assert.equal(isPrivateAddress('127.0.0.1'),false);assert.equal(isPrivateAddress('169.254.1.1'),false)
  const privateStore=new EngagementStore(directory,{entitlement:()=>({fieldOps:true}),now:()=>current,lookup:async()=>[{address:'192.168.1.10',family:4}]})
  privateStore.state=fieldops.snapshot();privateStore.lastRunAt=0
  await assert.rejects(()=>privateStore.resolveAuthorized('app.corp.internal','tampered'),/authorization is invalid/)
  await assert.rejects(()=>privateStore.run({engagementId:state.engagements[0].id,type:'dns',target:'example.com'}),/non-public network boundary/)
  let internal=await privateStore.create({name:'Internal infrastructure review',client:'Example Corp',authorizationReference:'SOW-043',networkMode:'internal',targets:'app.corp.internal',ports:'22,443,8443',validFrom:'2026-08-26T14:00:00Z',validUntil:'2026-08-27T14:00:00Z',attested:true})
  assert.equal(internal.engagements[0].networkMode,'internal')
  privateStore.lastRunAt=0
  const internalResult=await privateStore.run({engagementId:internal.engagements[0].id,type:'dns',target:'app.corp.internal'})
  assert.deepEqual(internalResult.addresses,['192.168.1.10']);assert.equal(internalResult.networkMode,'internal')
  const mixedInternal=new EngagementStore(directory,{entitlement:()=>({fieldOps:true}),now:()=>current,lookup:async()=>[{address:'192.168.1.10',family:4},{address:'93.184.216.34',family:4}]})
  mixedInternal.state=privateStore.snapshot();mixedInternal.lastRunAt=0
  await assert.rejects(()=>mixedInternal.run({engagementId:internal.engagements[0].id,type:'dns',target:'app.corp.internal'}),/internal network boundary/)
  state=await fieldops.close(state.engagements[0].id);assert.equal(state.engagements[0].status,'closed')
  fieldops.lastRunAt=0;await assert.rejects(()=>fieldops.run({engagementId:state.engagements[0].id,type:'dns',target:'example.com'}),/Active engagement not found/)
  console.log('Phase 4 verified // licensing, offline grace, external and internal scope boundaries, and exact-target enforcement')
}finally{await rm(directory,{recursive:true,force:true})}
