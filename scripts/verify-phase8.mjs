import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require=createRequire(import.meta.url)
const {EngagementStore}=require('../electron/engagement-store.cjs')
const directory=await mkdtemp(path.join(tmpdir(),'daemoncore-chaos-'))
const current=new Date('2026-08-26T15:00:00Z')
const waitForRun=async(store,id)=>{for(let attempt=0;attempt<1000;attempt+=1){const run=store.snapshot().chaosRuns.find(item=>item.id===id);if(run&&!['queued','running','recovering','aborting'].includes(run.status))return run;await new Promise(resolve=>setTimeout(resolve,2))}throw new Error('Chaos Engine worker did not settle')}

try{
  const store=new EngagementStore(directory,{entitlement:()=>({fieldOps:true}),now:()=>current,lookup:async()=>[{address:'93.184.216.34',family:4}],pause:async()=>{}})
  await store.initialize()
  let state=await store.create({name:'Black-box resilience proof',client:'Example Corp',authorizationReference:'ROE-CHAOS-8',targets:'example.com',ports:'443',validFrom:'2026-08-26T14:00:00Z',validUntil:'2026-08-27T14:00:00Z',attested:true})
  const engagementId=state.engagements[0].id
  store.head=async()=>({statusCode:204,headers:{}})
  state=await store.startChaos({engagementId,name:'Checkout ramp',profile:'ramp',target:'example.com',port:443,path:'/health',secure:true,durationSeconds:1,requestsPerSecond:99,p95LimitMs:2000,errorRateLimit:20,attested:true})
  let run=await waitForRun(store,state.chaosRuns[0].id)
  assert.equal(run.durationSeconds,10)
  assert.equal(run.requestsPerSecond,4)
  assert.equal(run.hardCaps.maxRequests,240)
  assert.equal(run.hardCaps.maxConcurrency,4)
  assert.equal(run.status,'completed')
  assert.equal(run.recovery.requests,5)
  assert.equal(run.resilienceScore,100)
  assert.ok(run.samples.length<=run.hardCaps.maxRequests)
  assert.equal(new Set(run.samples.map(item=>item.sequence)).size,run.samples.length)
  await assert.rejects(()=>store.startChaos({engagementId,profile:'ramp',target:'outside.example',port:443,path:'/',attested:true}),/outside the signed engagement/)
  await assert.rejects(()=>store.startChaos({engagementId,profile:'ramp',target:'example.com',port:443,path:'/',attested:false}),/authorization confirmation/)

  let probes=0
  store.head=async()=>{probes+=1;if(probes<=5)throw new Error('synthetic upstream failure');return{statusCode:204,headers:{}}}
  state=await store.startChaos({engagementId,name:'Guardrail proof',profile:'soak',target:'example.com',port:443,path:'/health',secure:true,durationSeconds:10,requestsPerSecond:2,p95LimitMs:2000,errorRateLimit:20,attested:true})
  run=await waitForRun(store,state.chaosRuns[0].id)
  assert.equal(run.status,'degraded')
  assert.match(run.abortReason,/Error rate/)
  assert.equal(run.recovery.requests,5)
  assert.equal(store.snapshot().auditIntegrity,true)
  await store.writeQueue
  console.log('Phase 8 verified // bounded Chaos Engine, SLO aborts, recovery proof, scoring, and tamper-evident runs')
}finally{await rm(directory,{recursive:true,force:true})}
