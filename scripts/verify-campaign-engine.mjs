import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require=createRequire(import.meta.url)
const {EngagementStore}=require('../electron/engagement-store.cjs')
const now=new Date('2026-08-29T15:00:00Z')
const waitFor=async(test,timeout=2000)=>{const started=Date.now();while(Date.now()-started<timeout){const value=test();if(value)return value;await new Promise(resolve=>setTimeout(resolve,10))}throw new Error('Campaign test timed out')}
const engagementInput={name:'Enterprise boundary review',client:'Example Corp',authorizationReference:'SOW-2026-99',targets:'app.example.com api.example.com',ports:'22,443',validFrom:'2026-08-29T14:00:00Z',validUntil:'2026-08-30T14:00:00Z',attested:true}
const directory=await mkdtemp(path.join(tmpdir(),'daemoncore-campaign-')),cancelDirectory=await mkdtemp(path.join(tmpdir(),'daemoncore-campaign-cancel-'))

try{
  const inventory=async({address,ports})=>({engine:'native-nmap',host:{address,state:'up'},ports:[{port:22,state:'open',service:'ssh'}],summary:{tested:ports.length,open:1}})
  const store=new EngagementStore(directory,{entitlement:()=>({fieldOps:true}),now:()=>now,lookup:async()=>[{address:'93.184.216.34',family:4}],toolBridge:{inventory}})
  await store.initialize();let state=await store.create(engagementInput);const engagementId=state.engagements[0].id
  await assert.rejects(()=>store.startCampaign({engagementId,name:'Bad target set',profile:'complete',targets:['outside.example.com'],attested:true}),/inside the engagement allowlist/)
  state=await store.startCampaign({engagementId,name:'Full boundary inventory',profile:'inventory',targets:state.engagements[0].targets,attested:true})
  const completed=await waitFor(()=>{const campaign=store.snapshot().campaigns[0];return campaign.status==='completed'?campaign:null})
  assert.equal(completed.tasks.length,2);assert.equal(completed.summary.progress,100);assert.equal(completed.summary.completed,2);assert.equal(completed.summary.failed,0)
  assert.equal(store.snapshot().captures.length,2);assert.ok(completed.tasks.every(task=>task.captureId));assert.equal(store.snapshot().auditIntegrity,true)

  let release
  const gate=new Promise(resolve=>{release=resolve})
  const cancelStore=new EngagementStore(cancelDirectory,{entitlement:()=>({fieldOps:true}),now:()=>now,lookup:async()=>[{address:'93.184.216.34',family:4}],toolBridge:{inventory:async input=>{await gate;return inventory(input)}}})
  await cancelStore.initialize();state=await cancelStore.create(engagementInput);const cancelEngagementId=state.engagements[0].id
  await cancelStore.startCampaign({engagementId:cancelEngagementId,name:'Pausable inventory',profile:'inventory',targets:state.engagements[0].targets,attested:true})
  const running=await waitFor(()=>cancelStore.snapshot().campaigns[0].tasks[0].status==='running'&&cancelStore.snapshot().campaigns[0])
  state=await cancelStore.pauseCampaign(running.id);assert.equal(state.campaigns[0].status,'pause-requested')
  release();const paused=await waitFor(()=>cancelStore.snapshot().campaigns[0].status==='paused'&&cancelStore.snapshot().campaigns[0]);assert.equal(paused.summary.completed,1)
  await cancelStore.resumeCampaign(paused.id);const resumed=await waitFor(()=>cancelStore.snapshot().campaigns[0].status==='completed'&&cancelStore.snapshot().campaigns[0]);assert.equal(resumed.summary.completed,2)

  let cancelRelease
  const cancelGate=new Promise(resolve=>{cancelRelease=resolve});cancelStore.toolBridge={inventory:async input=>{await cancelGate;return inventory(input)}}
  await cancelStore.startCampaign({engagementId:cancelEngagementId,name:'Cancelable inventory',profile:'inventory',targets:['app.example.com'],attested:true})
  const cancellable=await waitFor(()=>cancelStore.snapshot().campaigns[0].tasks[0].status==='running'&&cancelStore.snapshot().campaigns[0])
  state=await cancelStore.cancelCampaign(cancellable.id);assert.equal(state.campaigns[0].status,'cancelling');cancelRelease()
  const cancelled=await waitFor(()=>cancelStore.snapshot().campaigns[0].status==='cancelled'&&cancelStore.snapshot().campaigns[0])
  assert.equal(cancelled.summary.completed,1);assert.match(cancelled.outcome,/Cancelled by the operator/)

  cancelStore.state.campaigns[0].status='running';cancelStore.state.campaigns[0].tasks[0].status='running';await cancelStore.persist()
  const recovered=new EngagementStore(cancelDirectory,{entitlement:()=>({fieldOps:true}),now:()=>now});state=await recovered.initialize()
  assert.equal(state.schemaVersion,7);assert.equal(state.campaigns[0].status,'interrupted');assert.equal(state.campaigns[0].tasks[0].status,'pending')
  console.log('Campaign Engine verified // multi-target jobs, sealed captures, pause, cancellation, and restart recovery')
}finally{await rm(directory,{recursive:true,force:true});await rm(cancelDirectory,{recursive:true,force:true})}
