import http from 'node:http'
import { access, rename, writeFile } from 'node:fs/promises'

const statusPath='/tmp/daemoncore-chaos.json',stopPath='/tmp/daemoncore-chaos.stop',target='http://archive-target:8088/health'
const [profile='ramp',durationRaw='20',rateRaw='100',concurrencyRaw='25',p95Raw='1000',errorRaw='20']=process.argv.slice(2)
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Math.round(Number(value)||min)))
const duration=clamp(durationRaw,10,60),ceiling=clamp(rateRaw,10,500),concurrency=clamp(concurrencyRaw,1,100),p95Limit=clamp(p95Raw,100,10000),errorLimit=clamp(errorRaw,1,80)
if(!['baseline','ramp','spike','soak'].includes(profile))throw new Error('Unsupported sealed-range profile')
const agent=new http.Agent({keepAlive:true,maxSockets:concurrency}),samples=[],recoverySamples=[],startedAt=new Date().toISOString()
let status='running',phase='load',abortReason=null

const percentile=values=>{if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)]}
const metrics=values=>{const errors=values.filter(item=>item.error||item.statusCode>=500).length,durations=values.map(item=>item.durationMs);return{requests:values.length,successful:values.length-errors,errors,errorRate:values.length?Math.round(errors/values.length*1000)/10:0,averageMs:durations.length?Math.round(durations.reduce((sum,value)=>sum+value,0)/durations.length):0,p95Ms:percentile(durations),maxMs:durations.length?Math.max(...durations):0}}
const rateFor=second=>{if(profile==='baseline')return 10;if(profile==='ramp')return Math.max(10,Math.ceil(ceiling*((second+1)/duration)));if(profile==='spike'){const position=(second+1)/duration;return position>=.35&&position<=.65?ceiling:10}return ceiling}
const stopped=async()=>access(stopPath).then(()=>true).catch(()=>false)
const persist=async extra=>{const payload={schemaVersion:1,engine:'sealed-range',profile,target,durationSeconds:duration,requestsPerSecond:ceiling,concurrency,p95LimitMs:p95Limit,errorRateLimit:errorLimit,hardCaps:{maxDurationSeconds:60,maxRequestsPerSecond:500,maxConcurrency:100,maxRequests:30000},status,phase,startedAt,finishedAt:null,progress:0,metrics:metrics(samples),recovery:metrics(recoverySamples),abortReason,...extra};const temporary=`${statusPath}.tmp`;await writeFile(temporary,`${JSON.stringify(payload)}\n`);await rename(temporary,statusPath)}
const probe=sequence=>new Promise(resolve=>{const began=Date.now(),request=http.get(target,{agent,timeout:2000},response=>{response.resume();response.once('end',()=>resolve({sequence,statusCode:response.statusCode,durationMs:Date.now()-began,at:new Date().toISOString()}))});request.once('timeout',()=>request.destroy(new Error('timeout')));request.once('error',error=>resolve({sequence,error:error.message,durationMs:Date.now()-began,at:new Date().toISOString()}))})
const runBatch=async count=>{let issued=0;while(issued<count&&!await stopped()){const size=Math.min(concurrency,count-issued),base=samples.length;const batch=await Promise.all(Array.from({length:size},(_,index)=>probe(base+index+1)));samples.push(...batch);issued+=size}}

await persist({outcome:'Sealed worker active.'})
for(let second=0;second<duration;second+=1){
  if(await stopped()){status='aborted';break}
  const tick=Date.now();await runBatch(rateFor(second));const current=metrics(samples)
  if(current.requests>=20&&(current.errorRate>errorLimit||current.p95Ms>p95Limit)){abortReason=current.errorRate>errorLimit?`Error rate ${current.errorRate}% crossed ${errorLimit}%`:`P95 ${current.p95Ms} ms crossed ${p95Limit} ms`;status='degraded';break}
  await persist({progress:Math.round((second+1)/duration*90),outcome:`Load phase // second ${second+1} of ${duration}`})
  const remaining=1000-(Date.now()-tick);if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining))
}
if(status!=='aborted'){
  phase='recovery';await persist({progress:92,outcome:abortReason?'Guardrail fired. Measuring recovery.':'Load complete. Measuring recovery.'});await new Promise(resolve=>setTimeout(resolve,1000))
  for(let index=0;index<5&&!await stopped();index+=1){recoverySamples.push(await probe(index+1));await persist({progress:93+index,outcome:'Recovery validation active.'});await new Promise(resolve=>setTimeout(resolve,300))}
}
if(await stopped())status='aborted'
const finalMetrics=metrics(samples),recovery=metrics(recoverySamples),recovered=recovery.requests===5&&recovery.errorRate===0&&recovery.p95Ms<=p95Limit
if(status==='running')status=recovered?'completed':'degraded'
phase='complete';const resilienceScore=status==='aborted'?null:Math.max(0,Math.min(100,Math.round(100-finalMetrics.errorRate-(finalMetrics.p95Ms>p95Limit?25:0)-(recovered?0:20))))
await persist({finishedAt:new Date().toISOString(),progress:100,resilienceScore,outcome:status==='aborted'?'Emergency stop completed.':abortReason?(recovered?'Guardrail fired; target recovered.':'Guardrail fired; recovery failed.'):(recovered?'Target held and recovered.':'Recovery validation failed.')})
agent.destroy()
