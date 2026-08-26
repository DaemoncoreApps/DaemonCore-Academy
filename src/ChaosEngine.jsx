import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Check, ChevronRight, CircleStop, Gauge, Play, Radio, ShieldCheck, TimerReset, Waves } from 'lucide-react'

const profiles={
  baseline:{label:'BASELINE',description:'One probe per second. Establish clean steady-state evidence before pressure.'},
  ramp:{label:'CONTROLLED RAMP',description:'Increase arrival rate gradually to expose the first point of degradation.'},
  spike:{label:'TRAFFIC SPIKE',description:'Hold a low baseline, enter a short peak, then validate stabilization.'},
  soak:{label:'BOUNDED SOAK',description:'Sustain the declared ceiling to surface accumulating latency and errors.'},
}
const activeStatuses=new Set(['queued','running','recovering','aborting'])
const tone=status=>status==='completed'?'pass':['degraded','failed'].includes(status)?'fail':status==='aborted'?'warn':'live'

function Metric({label,value,detail,Icon=Gauge}){
  return <div className="chaos-metric"><Icon/><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
}

function Telemetry({run}){
  const samples=run.samples||[],ceiling=Math.max(run.p95LimitMs||1,...samples.map(item=>item.durationMs||0)),bars=samples.slice(-56)
  return <section className="chaos-telemetry">
    <header><div><Radio/><span>LIVE SIGNAL // {run.phase?.toUpperCase()}</span></div><strong className={tone(run.status)}>{run.status.toUpperCase()}</strong></header>
    <div className="chaos-metrics">
      <Metric label="REQUESTS" value={run.metrics?.requests||0} detail={`HARD CAP ${run.hardCaps?.maxRequests||240}`} Icon={Activity}/>
      <Metric label="P95 LATENCY" value={`${run.metrics?.p95Ms||0} ms`} detail={`ABORT > ${run.p95LimitMs} ms`}/>
      <Metric label="ERROR RATE" value={`${run.metrics?.errorRate||0}%`} detail={`ABORT > ${run.errorRateLimit}%`} Icon={AlertTriangle}/>
      <Metric label="RESILIENCE" value={run.resilienceScore==null?'—':`${run.resilienceScore}`} detail={run.resilienceScore==null?'SCORED AFTER RECOVERY':'OUT OF 100'} Icon={ShieldCheck}/>
    </div>
    <div className="signal-chart">
      <div className="chart-threshold"><span>SLO // {run.p95LimitMs} MS</span></div>
      <div className="chart-bars">{bars.length?bars.map((sample,index)=><i key={`${sample.sequence}-${index}`} className={sample.error||sample.statusCode>=500?'error':''} style={{height:`${Math.max(5,Math.min(100,(sample.durationMs/ceiling)*100))}%`}} title={`${sample.durationMs} ms`}/>):<div className="chart-empty">WAITING FOR FIRST SIGNAL</div>}</div>
    </div>
    <div className="run-progress"><i style={{width:`${run.progress||0}%`}}/><span>{run.progress||0}%</span></div>
    <p className="run-outcome">{run.outcome}</p>
  </section>
}

export function ChaosEngine({engagement,data,onStart,onAbort,onRefresh}){
  const runs=useMemo(()=>(data.chaosRuns||[]).filter(item=>item.engagementId===engagement.id),[data.chaosRuns,engagement.id])
  const active=runs.find(item=>activeStatuses.has(item.status))
  const [selectedId,setSelectedId]=useState(runs[0]?.id||null)
  const [form,setForm]=useState({name:'Authorized resilience proof',profile:'ramp',target:engagement.targets[0],port:engagement.ports.includes(443)?443:engagement.ports[0],path:'/health',secure:engagement.ports.includes(443),durationSeconds:20,requestsPerSecond:2,p95LimitMs:2000,errorRateLimit:20,attested:false})
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  const activeId=active?.id,selected=active||runs.find(item=>item.id===selectedId)||runs[0]
  useEffect(()=>{if(!activeId)return;const timer=setInterval(onRefresh,750);return()=>clearInterval(timer)},[activeId,onRefresh])
  const update=(key,value)=>setForm(current=>({...current,[key]:value}))
  const launch=async()=>{setBusy(true);setError('');try{const next=await onStart({...form,engagementId:engagement.id});const run=(next.chaosRuns||[]).find(item=>item.engagementId===engagement.id);if(run)setSelectedId(run.id)}catch(caught){setError(caught.message)}finally{setBusy(false)}}
  const abort=async()=>{if(!active)return;setBusy(true);setError('');try{await onAbort(active.id)}catch(caught){setError(caught.message)}finally{setBusy(false)}}
  return <div className="chaos-engine">
    <section className="chaos-command">
      <header><div className="chaos-title"><div><Waves/><i/></div><span>DAEMONCORE</span><h3>Chaos Engine</h3><p>Bounded black-box resilience experiments with automatic SLO aborts and recovery proof.</p></div><div className="engine-state"><i className={active?'armed':''}/><span>{active?'ENGINE ACTIVE':'ENGINE STANDBY'}</span><strong>LOCAL CONTROL PLANE</strong></div></header>
      <div className="profile-grid">{Object.entries(profiles).map(([id,item])=><button key={id} className={form.profile===id?'active':''} disabled={Boolean(active)} onClick={()=>update('profile',id)}><span>{item.label}</span><p>{item.description}</p><ChevronRight/></button>)}</div>
      <div className="experiment-form">
        <label>EXPERIMENT NAME<input value={form.name} disabled={Boolean(active)} maxLength={100} onChange={event=>update('name',event.target.value)}/></label>
        <label>AUTHORIZED TARGET<select value={form.target} disabled={Boolean(active)} onChange={event=>update('target',event.target.value)}>{engagement.targets.map(item=><option key={item}>{item}</option>)}</select></label>
        <label>PORT<select value={form.port} disabled={Boolean(active)} onChange={event=>update('port',Number(event.target.value))}>{engagement.ports.map(item=><option key={item}>{item}</option>)}</select></label>
        <label>PATH<input value={form.path} disabled={Boolean(active)} maxLength={500} onChange={event=>update('path',event.target.value)}/></label>
        <label>DURATION // SEC<input type="number" min="10" max="60" value={form.durationSeconds} disabled={Boolean(active)} onChange={event=>update('durationSeconds',Number(event.target.value))}/></label>
        <label>CEILING // REQ/S<input type="number" min="1" max="4" value={form.requestsPerSecond} disabled={Boolean(active)} onChange={event=>update('requestsPerSecond',Number(event.target.value))}/></label>
        <label>P95 ABORT // MS<input type="number" min="250" max="10000" value={form.p95LimitMs} disabled={Boolean(active)} onChange={event=>update('p95LimitMs',Number(event.target.value))}/></label>
        <label>ERROR ABORT // %<input type="number" min="1" max="80" value={form.errorRateLimit} disabled={Boolean(active)} onChange={event=>update('errorRateLimit',Number(event.target.value))}/></label>
      </div>
      <div className="chaos-preflight"><div><Check/><span>EXACT ALLOWLIST</span></div><div><Check/><span>60 SEC HARD STOP</span></div><div><Check/><span>4 REQ/S CEILING</span></div><div><Check/><span>AUTOMATIC SLO ABORT</span></div><label><input type="checkbox" checked={form.attested} disabled={Boolean(active)} onChange={event=>update('attested',event.target.checked)}/><span>{form.attested&&<Check/>}</span><p>I confirm this specific resilience experiment is authorized under <strong>{engagement.authorizationReference}</strong>.</p></label></div>
      {error&&<div className="field-error">CHAOS ENGINE BLOCKED // {error}</div>}
      <div className="engine-actions"><small>WORST CASE // {Math.min(240,form.durationSeconds*form.requestsPerSecond)} REQUESTS // CONCURRENCY ≤ 4</small>{active?<button className="abort" disabled={busy||active.status==='aborting'} onClick={abort}><CircleStop/> {active.status==='aborting'?'STOPPING':'Emergency stop'}</button>:<button disabled={busy||!form.attested} onClick={launch}><Play/> {busy?'PREFLIGHT':'Arm and execute'}</button>}</div>
    </section>
    {selected?<Telemetry run={selected}/>:<section className="chaos-empty"><TimerReset/><span>NO EXPERIMENT EVIDENCE</span><strong>Configure a bounded profile and establish the first resilience baseline.</strong></section>}
    {runs.length>0&&<section className="chaos-history"><header><span>EXPERIMENT LEDGER</span><strong>{runs.length} RUN{runs.length===1?'':'S'}</strong></header>{runs.slice(0,8).map(run=><button key={run.id} className={selected?.id===run.id?'active':''} onClick={()=>setSelectedId(run.id)}><i className={tone(run.status)}/><div><strong>{run.name}</strong><span>{run.profile.toUpperCase()} // {run.target}:{run.port}{run.path}</span></div><em>{run.resilienceScore==null?'—':run.resilienceScore}</em><small>{run.status.toUpperCase()}<br/>{new Date(run.startedAt).toLocaleString()}</small></button>)}</section>}
  </div>
}
