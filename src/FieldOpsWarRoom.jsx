import { useEffect, useMemo, useState } from 'react'
import { Activity, BadgeCheck, ChevronRight, Crosshair, Database, FileText, Fingerprint, Plus, Radar, ShieldCheck, Timer, TriangleAlert, Wrench, Zap } from 'lucide-react'

const activeCampaignStates=new Set(['queued','running','pause-requested','cancelling','recovering'])
const compactFingerprint=value=>value?`${value.slice(0,8)}…${value.slice(-8)}`:'UNAVAILABLE'

function formatDuration(milliseconds){
  if(milliseconds<=0)return 'WINDOW ENDED'
  const minutes=Math.ceil(milliseconds/60_000),days=Math.floor(minutes/1440),hours=Math.floor((minutes%1440)/60),remaining=minutes%60
  if(days)return `${days}D ${hours}H REMAINING`
  if(hours)return `${hours}H ${remaining}M REMAINING`
  return `${remaining}M REMAINING`
}

function TargetMatrix({ engagement, captures }){
  const signals=useMemo(()=>new Map(engagement.targets.map(target=>[target,captures.filter(item=>item.target===target)])),[captures,engagement.targets])
  return <section className="war-map"><header><div><Radar/><span>AUTHORIZED SURFACE</span></div><strong>{engagement.targets.length} PINNED TARGET{engagement.targets.length===1?'':'S'}</strong></header><div className="war-map-stage"><div className="war-radar"><i/><i/><i/><span><ShieldCheck/></span></div><div className="war-targets">{engagement.targets.slice(0,8).map((target,index)=>{const evidence=signals.get(target)||[],latest=evidence[0];return <div className={evidence.length?'observed':'pending'} key={target}><i style={{'--delay':`${index*.14}s`}}/><span>{evidence.length?'SIGNAL LOCK':'AWAITING SIGNAL'}</span><strong>{target}</strong><small>{latest?`${evidence.length} CAPTURE${evidence.length===1?'':'S'} // ${new Date(latest.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`:'AUTHORIZED // UNOBSERVED'}</small></div>})}{engagement.targets.length>8&&<div className="war-target-overflow"><i/><span>ADDITIONAL SCOPE</span><strong>+{engagement.targets.length-8} TARGETS</strong><small>AVAILABLE IN ENGAGEMENT VAULT</small></div>}</div></div></section>
}

function EmptyCommandDeck({ onNewEngagement }){
  return <section className="war-map war-map-empty"><Radar/><span>COMMAND DECK // STANDBY</span><h2>Turn written authorization into a controlled operation.</h2><div className="war-empty-route"><div><strong>01</strong><span>DECLARE</span><small>Owner, scope, policy and window</small></div><ChevronRight/><div><strong>02</strong><span>ACQUIRE</span><small>Run bounded surface diagnostics</small></div><ChevronRight/><div><strong>03</strong><span>PROVE</span><small>Seal evidence and deliver findings</small></div></div><button onClick={onNewEngagement}><Plus/> Issue operation permit</button></section>
}

export function FieldOpsWarRoom({ data, identity, engagement, onNewEngagement, onWorkspace: changeWorkspace }){
  const [clock,setClock]=useState(()=>Date.now())
  const [workspace,setWorkspace]=useState('diagnostics')
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),30_000);return()=>clearInterval(timer)},[])
  const onWorkspace=next=>{setWorkspace(next);changeWorkspace(next);requestAnimationFrame(()=>document.querySelector('.fieldops-layout')?.scrollIntoView({behavior:'smooth',block:'start'}))}
  const profile=identity?.identity
  const captures=useMemo(()=>engagement?data.captures.filter(item=>item.engagementId===engagement.id):[],[data.captures,engagement])
  const findings=useMemo(()=>engagement?data.findings.filter(item=>item.engagementId===engagement.id):[],[data.findings,engagement])
  const campaigns=useMemo(()=>engagement?(data.campaigns||[]).filter(item=>item.engagementId===engagement.id):[],[data.campaigns,engagement])
  const audit=useMemo(()=>engagement?data.audit.filter(item=>item.engagementId===engagement.id):[],[data.audit,engagement])
  const observedTargets=new Set(captures.map(item=>item.target)).size,coverage=engagement?.targets.length?Math.round(observedTargets/engagement.targets.length*100):0
  const openFindings=findings.filter(item=>item.status==='open').length,criticalFindings=findings.filter(item=>item.status==='open'&&['critical','high'].includes(item.severity)).length
  const activeCampaigns=campaigns.filter(item=>activeCampaignStates.has(item.status)).length,integrity=data.auditIntegrity!==false&&data.captureIntegrity!==false&&data.signatureIntegrity!==false
  const validFrom=engagement?Date.parse(engagement.validFrom):0,validUntil=engagement?Date.parse(engagement.validUntil):0
  const windowState=!engagement?'NO PERMIT':engagement.status!=='active'?'CLOSED':clock<validFrom?'PENDING':clock>validUntil?'EXPIRED':formatDuration(validUntil-clock)
  const windowLive=engagement?.status==='active'&&clock>=validFrom&&clock<=validUntil,latest=audit[0]
  const nextWorkspace=!captures.length?'diagnostics':activeCampaigns?'campaigns':openFindings?'findings':'evidence'
  const nextLabel=!captures.length?'Acquire first signal':activeCampaigns?'Open active campaign':openFindings?'Review open findings':'Inspect evidence vault'
  const readiness=[
    {label:'OPERATOR',value:profile?'SIGNED':'BLOCKED',ready:Boolean(profile)},
    {label:'PERMIT',value:engagement?engagement.status.toUpperCase():'REQUIRED',ready:Boolean(engagement)&&engagement.status==='active'},
    {label:'WINDOW',value:windowLive?'LIVE':windowState,ready:windowLive},
    {label:'EVIDENCE',value:integrity?'VERIFIED':'ALERT',ready:integrity},
  ]
  const modules=[
    {id:'diagnostics',number:'01',verb:'ACQUIRE',title:'Diagnostics',detail:'Profile the authorized surface',icon:Crosshair},
    {id:'fabric',number:'02',verb:'EXTEND',title:'Execution Fabric',detail:'Discover tools and ingest evidence',icon:Wrench},
    {id:'campaigns',number:'03',verb:'ORCHESTRATE',title:'Campaigns',detail:activeCampaigns?'Operation currently active':'Run repeatable assessment plans',icon:Zap},
    {id:'evidence',number:'04',verb:'PRESERVE',title:'Evidence vault',detail:captures.length?`${captures.length} sealed captures`:'Awaiting first capture',icon:Database},
    {id:'findings',number:'05',verb:'REPORT',title:'Findings',detail:openFindings?`${openFindings} require disposition`:'Register is clear',icon:FileText},
    {id:'chaos',number:'06',verb:'VALIDATE',title:'Chaos Engine',detail:'Run bounded resilience trials',icon:Activity},
  ]
  return <section className="fieldops-war-room"><div className="war-boot" aria-hidden="true"><span>FIELDOPS // WAR ROOM</span><strong>ESTABLISHING SECURE COMMAND DECK</strong></div><header className="war-command-bar"><div><span><i/> FIELDOPS // WAR ROOM</span><strong>{engagement?'AUTHORIZED OPERATIONS CONTROL':'OPERATIONS CONTROL // STANDBY'}</strong></div><div className="war-command-status"><span className={integrity?'verified':'failed'}>{integrity?<ShieldCheck/>:<TriangleAlert/>} {integrity?'CHAIN VERIFIED':'INTEGRITY ALERT'}</span><span className={windowLive?'live':'standby'}><Timer/> {windowState}</span><button onClick={onNewEngagement}><Plus/> New engagement</button></div></header><div className="war-readiness-strip">{readiness.map(item=><div className={item.ready?'ready':'attention'} key={item.label}><span>{item.label}</span><strong><i/>{item.value}</strong></div>)}{engagement&&<button disabled={!windowLive} onClick={()=>onWorkspace(nextWorkspace)}>{nextLabel}<ChevronRight/></button>}</div><div className="war-grid"><section className="war-operator"><header><BadgeCheck/><span>SIGNED OPERATOR</span></header><div className="operator-seal"><Fingerprint/><i/></div><h2>{profile?.fullName||'Protected operator'}</h2><p>{profile?`${profile.role} // ${profile.organization}`:'Device identity configured'}</p><div><span>ED25519 DEVICE KEY</span><strong>{compactFingerprint(profile?.fingerprint)}</strong></div><small><i/> OPERATION RECEIPTS SIGNED</small></section>{engagement?<TargetMatrix engagement={engagement} captures={captures}/>:<EmptyCommandDeck onNewEngagement={onNewEngagement}/>}<section className="war-vitals"><header><Activity/><span>OPERATIONAL VITALS</span></header><div className="war-score"><div style={{'--coverage':`${coverage*3.6}deg`}}><strong>{coverage}</strong><span>%</span></div><p><strong>SURFACE COVERAGE</strong><span>{observedTargets} OF {engagement?.targets.length||0} TARGETS OBSERVED</span></p></div><div className="war-vital-grid"><div><span>SEALED EVIDENCE</span><strong>{captures.length}</strong><small>{data.captureIntegrity===false?'DIGEST FAILURE':'SHA-256 VERIFIED'}</small></div><div className={criticalFindings?'alert':''}><span>OPEN FINDINGS</span><strong>{openFindings}</strong><small>{criticalFindings?`${criticalFindings} HIGH / CRITICAL`:'NO PRIORITY ALERTS'}</small></div><div><span>CAMPAIGNS</span><strong>{campaigns.length}</strong><small>{activeCampaigns?`${activeCampaigns} ACTIVE`:'CONTROL PLANE READY'}</small></div><div><span>LEDGER EVENTS</span><strong>{audit.length}</strong><small>{data.auditIntegrity===false?'CHAIN FAILURE':'HASH CHAIN VERIFIED'}</small></div></div></section></div><div className="war-module-deck">{modules.map(item=>{const Icon=item.icon;return <button className={workspace===item.id?'active':''} aria-pressed={workspace===item.id} disabled={!engagement} key={item.id} onClick={()=>onWorkspace(item.id)}><Icon/><span>{item.number} // {item.verb}</span><strong>{item.title}</strong><small>{item.detail}</small></button>})}<div className="war-last-signal"><Activity/><span>LATEST LEDGER SIGNAL</span><strong>{latest?.summary||'No operation receipts recorded for this engagement.'}</strong><small>{latest?`${latest.operation.toUpperCase()} // ${new Date(latest.at).toLocaleString()}`:'STANDBY // CHAIN READY'}</small></div></div></section>
}
