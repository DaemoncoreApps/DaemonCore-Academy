import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { course, drillSets } from '../src/content.js'

const require=createRequire(import.meta.url)
const { EngagementStore, normalizeHttpPath }=require('../electron/engagement-store.cjs')

assert.equal(course.lessons.length,20)
assert.equal(new Set(course.lessons.map(lesson=>lesson.id)).size,course.lessons.length)
assert.ok(course.estimatedMinutes>=500)
for(const lesson of course.lessons){
  assert.ok(lesson.sections.length>=3,`${lesson.id} needs substantive sections`)
  assert.ok(lesson.check.options.length>=4,`${lesson.id} needs a complete knowledge check`)
  assert.ok(Number.isInteger(lesson.check.answer)&&lesson.check.answer>=0&&lesson.check.answer<lesson.check.options.length)
}
assert.equal(drillSets.length,8)
assert.equal(new Set(drillSets.map(drill=>drill.id)).size,drillSets.length)
assert.equal(normalizeHttpPath('/health?full=1'),'/health?full=1')
assert.throws(()=>normalizeHttpPath('https://outside.example/'),/must start with/)
assert.throws(()=>normalizeHttpPath('/ok\r\nX-Test: injected'),/control characters/)

const store=new EngagementStore('.', { pause:async()=>{} })
store.tcp=async(_address,port)=>{
  if(port===443)return{connected:true,latencyMs:12}
  throw new Error('TCP connection failed: ECONNREFUSED')
}
const survey=await store.portSurvey('93.184.216.34',[80,443])
assert.equal(survey.hardCap,30)
assert.deepEqual(survey.observations.map(item=>item.state),['closed-or-rejected','open'])

let calls=0
store.head=async()=>{calls+=1;return{statusCode:204,headers:{}}}
const baseline=await store.baseline('example.com','93.184.216.34',443,true,'/health')
assert.equal(calls,10)
assert.equal(baseline.requestCount,10)
assert.equal(baseline.concurrency,1)
assert.equal(baseline.minimumIntervalMs,500)
assert.equal(baseline.successful,10)

console.log('Phase 5 verified // 20 lessons, 8 drills, bounded surveys, and fixed-rate resilience sampling')
