import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require=createRequire(import.meta.url)
const { createCandidateDossier, evaluateEligibility, verifyCandidateBundle }=require('../electron/certification-policy.cjs')
const { TrustAuthority }=require('../electron/trust-authority.cjs')
const digest=value=>String(value).repeat(64).slice(0,64)
const profile={
  handle:'NIGHTSHIFT',
  lessonAttempts:Array.from({length:20},(_,index)=>({id:`lesson-${index}`,lessonId:`lesson-${index}`,practicalScore:80,passed:true,at:'2026-09-02T12:00:00.000Z'})),
  missionAttempts:Array.from({length:5},(_,index)=>({id:`mission-attempt-${index}`,missionId:`mission-${index}`,mode:'blind',score:900,receiptId:`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`,receiptDigest:digest('a'),packDigest:digest('b'),evidenceDigest:digest('c'),at:'2026-09-02T12:00:00.000Z'})),
  completedWebLabs:Array.from({length:8},(_,index)=>`web-${index}`),
  completedEnterpriseLabs:Array.from({length:8},(_,index)=>`identity-${String(index).padStart(2,'0')}`),
  drillAttempts:Array.from({length:4},(_,index)=>({id:`drill-attempt-${index}`,drillId:`drill-${index}`,correct:4,total:5,at:'2026-09-02T12:00:00.000Z'})),
  capstoneAttempts:Array.from({length:2},(_,index)=>({id:`capstone-attempt-${index}`,capstoneId:`capstone-${index}`,score:84,passed:true,domainScores:{scope:80},at:'2026-09-02T12:00:00.000Z'})),
}

assert.equal(evaluateEligibility({...profile,missionAttempts:[]}).eligible,false)
const eligibility=evaluateEligibility(profile)
assert.equal(eligibility.eligible,true)
assert.equal(eligibility.completed,6)

const directory=await mkdtemp(path.join(tmpdir(),'daemoncore-certification-'))
const safeStorage={isEncryptionAvailable:()=>true,encryptString:value=>Buffer.from(value,'utf8'),decryptString:value=>value.toString('utf8'),getSelectedStorageBackend:()=> 'dpapi'}
try{
  const authority=new TrustAuthority(directory,{safeStorage,platform:'win32',now:()=>new Date('2026-09-02T13:00:00.000Z')})
  await authority.initialize()
  await authority.enroll({fullName:'Jordan Rivera',organization:'Example Security',email:'jordan@example.com',role:'Security Engineer'})
  const dossier=createCandidateDossier(profile,authority.assertReady(),'6.1.0',new Date('2026-09-02T14:00:00.000Z'))
  const bundle={bundleVersion:1,dossier,attestation:authority.sign('dccov1-candidate-dossier',dossier)}
  assert.equal(verifyCandidateBundle(bundle),true)
  bundle.dossier.candidate.fullName='Tampered Name'
  assert.equal(verifyCandidateBundle(bundle),false)
}finally{await rm(directory,{recursive:true,force:true})}

const [preload,main,ui,sql]=await Promise.all([
  readFile(new URL('../electron/preload.cjs',import.meta.url),'utf8'),
  readFile(new URL('../electron/main.cjs',import.meta.url),'utf8'),
  readFile(new URL('../src/CertificationCenter.jsx',import.meta.url),'utf8'),
  readFile(new URL('../supabase/migrations/202609020001_dcco_credentials.sql',import.meta.url),'utf8'),
])
assert.match(preload,/certification:export-candidate/)
assert.match(main,/trustAuthority\.sign\('dccov1-candidate-dossier'/)
assert.match(ui,/This application cannot award itself a credential/)
assert.match(sql,/enable row level security/)
assert.match(sql,/revoke all on public\.certification_credentials from anon, authenticated/)
assert.match(sql,/verify_certification/)

console.log('DCCO contract verified // eligibility, protected identity, signed dossier, tamper rejection, RLS registry, and fail-closed issuance')
