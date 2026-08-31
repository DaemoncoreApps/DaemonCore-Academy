import { useEffect, useState } from 'react'
import {
  Activity, ArrowLeft, ArrowRight, Award, BarChart3, Bell, BookOpen, BrainCircuit,
  Box, Braces, Check, ChevronRight, Circle, Clock3, Command, Compass, Crosshair,
  Database, Flame, Gauge, GraduationCap, Grid2X2, HardDrive, Hexagon,
  KeyRound, Layers3, LockKeyhole, Menu, Network, Play, Radar, Search,
  Settings, Shield, ShieldCheck, Sparkles, Swords, Target, Terminal,
  Trophy, UserRound, X, Zap,
} from 'lucide-react'
import { LabSimulation, LessonPlayer, OperatorPage, PhaseBadge, RangeEngineCard } from './phase2.jsx'
import { course, drillSets, intelArticles } from './content.js'
import { ArticleReader, LicenseGate, LoadingScreen, Onboarding, SettingsPage } from './production.jsx'
import { FieldOpsPage } from './fieldops.jsx'
import { RangeChaosLab } from './RangeChaosLab.jsx'
import { missionCatalog } from './mission-catalog.js'
import { CapstoneRunner, MasteryPage } from './Mastery.jsx'
import { webCourse } from './web-curriculum.js'
import { WebForgePage, WebLabRunner } from './WebRange.jsx'
import { enterpriseCourses } from './enterprise-curriculum.js'
import { EnterpriseForgePage } from './EnterpriseRange.jsx'
import { RangeFabric } from './RangeFabric.jsx'
import { ModalClose } from './ModalClose.jsx'
import { MissionOSPage } from './MissionOS.jsx'
import { AcademyWorkflowGuide, WorkflowDock } from './AcademyGuide.jsx'
import missionOSData from '../shared/mission-os.json'

const nav = [
  { id: 'command', label: 'Command', icon: Grid2X2 },
  { id: 'missionos', label: 'Mission OS', icon: Compass },
  { id: 'academy', label: 'Academy', icon: GraduationCap },
  { id: 'webforge', label: 'Web Forge', icon: Braces },
  { id: 'enterprise', label: 'Enterprise Forge', icon: Layers3 },
  { id: 'mastery', label: 'Mastery', icon: BrainCircuit },
  { id: 'labs', label: 'Lab Range', icon: Terminal },
  { id: 'fieldops', label: 'FieldOps', icon: ShieldCheck },
  { id: 'drills', label: 'Drills', icon: Crosshair },
  { id: 'intel', label: 'Intel', icon: BookOpen },
  { id: 'operator', label: 'Operator', icon: UserRound },
]

const missionIcons={network:Network,key:KeyRound,activity:Activity,shield:Shield,layers:Layers3,box:Box}
const missions=missionCatalog.map(mission=>({...mission,icon:missionIcons[mission.icon]}))

const emptyData = { schemaVersion:6, profile:{handle:null,createdAt:null,xp:0,level:1,streak:0,bestStreak:0,lastActiveDate:null,weekKey:null,weeklyMinutes:0,weeklyGoalMinutes:180,completedMissions:[],completedLessons:[],completedWebLabs:[],completedEnterpriseLabs:[],lessonAttempts:[],missionAttempts:[],webLabAttempts:[],enterpriseLabAttempts:[],drillAttempts:[],capstoneAttempts:[],achievements:[],activity:[],missionOS:{assessment:null,selectedPathway:null,selectedAt:null}},settings:{reduceMotion:false,compactMode:false,uiScale:1.25,academyGuideComplete:false} }
const weekKey=()=>{const date=new Date(),day=(date.getUTCDay()+6)%7;date.setUTCDate(date.getUTCDate()-day);return date.toISOString().slice(0,10)}
const previewLicense={configured:false,requireAcademyLicense:false,checkoutUrl:null,licensed:false,fieldOps:false,status:'unlicensed',tier:null,tierLabel:null}

function useAppData() {
  const api=window.daemoncore?.data
  const [data,setData]=useState(()=>{if(api)return null;try{return JSON.parse(localStorage.getItem('daemoncore-state-v1'))||emptyData}catch{return emptyData}})
  useEffect(()=>{if(api)api.snapshot().then(setData)},[api])
  const saveFallback=next=>{setData(next);localStorage.setItem('daemoncore-state-v1',JSON.stringify(next));return next}
  const onboard=async handle=>{if(api){const next=await api.onboard(handle);setData(next);return}const normalized=handle.trim().toUpperCase();if(!/^[A-Z0-9_-]{2,20}$/.test(normalized))throw new Error('Handle must be 2–20 valid characters');saveFallback({...data,profile:{...data.profile,handle:normalized,createdAt:new Date().toISOString(),activity:[{id:crypto.randomUUID(),type:'profile',title:'Operator record initialized',xp:0,at:new Date().toISOString()}]}})}
  const record=async event=>{
    if(api){const next=await api.record(event);setData(next);return next}
    const p={...emptyData.profile,...data.profile},now=new Date(),today=now.toISOString().slice(0,10),awards=new Set(p.achievements||[])
    if(p.weekKey!==weekKey()){p.weekKey=weekKey();p.weeklyMinutes=0}
    if(p.lastActiveDate!==today){const gap=p.lastActiveDate?Math.round((Date.parse(today)-Date.parse(p.lastActiveDate))/86400000):null;p.streak=gap===1?p.streak+1:1;p.bestStreak=Math.max(p.bestStreak,p.streak);p.lastActiveDate=today}
    const firstMission=event.type==='mission'&&!p.completedMissions.includes(event.id),firstLesson=event.type==='lesson'&&!p.completedLessons.includes(event.id)
    let earned=0
    if(event.type==='mission'){earned=firstMission?event.score:Math.round(event.score*.2);if(firstMission)p.completedMissions=[...p.completedMissions,event.id];p.missionAttempts=[{id:crypto.randomUUID(),missionId:event.id,score:event.score,hints:event.hints,seconds:event.seconds,mode:event.mode||'guided',seed:event.seed||null,evidenceDigest:event.evidenceDigest||null,at:now.toISOString()},...(p.missionAttempts||[])].slice(0,100);awards.add('first-signal');if(!event.hints)awards.add('evidence-led');if(p.completedMissions.length>=missions.length)awards.add('range-veteran')}
    if(event.type==='lesson'){earned=firstLesson?180:0;if(firstLesson){p.completedLessons=[...p.completedLessons,event.id];p.weeklyMinutes+=(event.minutes||0)}p.lessonAttempts=[{id:crypto.randomUUID(),lessonId:event.id,practicalScore:event.practicalScore||0,passed:(event.practicalScore||0)>=67,at:now.toISOString()},...(p.lessonAttempts||[])].slice(0,100);awards.add('scholar')}
    if(event.type==='webLab'){const first=!p.completedWebLabs.includes(event.id);earned=first?event.score:Math.round(event.score*.2);if(first){p.completedWebLabs=[...p.completedWebLabs,event.id];p.weeklyMinutes+=(event.minutes||0)}p.webLabAttempts=[{id:crypto.randomUUID(),labId:event.id,score:event.score,hints:event.hints,seconds:event.seconds,at:now.toISOString()},...(p.webLabAttempts||[])].slice(0,100);if(p.completedWebLabs.length>=22)awards.add('web-forged')}
    if(event.type==='enterpriseLab'){const first=!p.completedEnterpriseLabs.includes(event.id);earned=first?event.score:Math.round(event.score*.2);if(first){p.completedEnterpriseLabs=[...p.completedEnterpriseLabs,event.id];p.weeklyMinutes+=(event.minutes||0)}p.enterpriseLabAttempts=[{id:crypto.randomUUID(),labId:event.id,score:event.score,hints:event.hints,seconds:event.seconds,at:now.toISOString()},...(p.enterpriseLabAttempts||[])].slice(0,150);if(p.completedEnterpriseLabs.length>=48)awards.add('enterprise-forged')}
    if(event.type==='drill'){earned=Math.min(event.correct,event.total)*120;p.drillAttempts=[{id:crypto.randomUUID(),drillId:event.id,correct:event.correct,total:event.total,xp:earned,at:now.toISOString()},...(p.drillAttempts||[])].slice(0,100);if(event.correct===event.total)awards.add('clean-sweep')}
    if(event.type==='capstone'){earned=event.score>=80?750:0;p.capstoneAttempts=[{id:crypto.randomUUID(),capstoneId:event.id,score:event.score,passed:event.score>=80,domainScores:event.domainScores||{},decisions:event.decisions||[],at:now.toISOString()},...(p.capstoneAttempts||[])].slice(0,100);if(event.score>=80)awards.add('decision-forged')}
    if(p.streak>=14)awards.add('night-operator')
    p.achievements=[...awards];p.xp+=earned;p.level=Math.floor(p.xp/1000)+1;p.activity=[{id:crypto.randomUUID(),type:event.type,title:event.title,xp:earned,at:now.toISOString()},...p.activity].slice(0,100)
    return saveFallback({...data,profile:p})
  }
  const updateSettings=async settings=>{if(api){const next=await api.updateSettings(settings);setData(next);return}saveFallback({...data,settings})}
  const updateMissionOS=async input=>{
    if(api){const next=await api.updateMissionOS(input);setData(next);return next}
    const profile={...emptyData.profile,...data.profile,missionOS:{...emptyData.profile.missionOS,...data.profile?.missionOS}}
    if(input.action==='assessment'){
      const scores=Object.fromEntries(missionOSData.domains.map(domain=>[domain.id,{correct:0,total:0,score:0}]))
      for(const question of missionOSData.questions){const answer=input.answers?.[question.id];if(!Number.isInteger(answer))throw new Error(`Assessment answer missing: ${question.id}`);scores[question.domain].total++;if(answer===question.answer)scores[question.domain].correct++}
      Object.values(scores).forEach(result=>{result.score=Math.round(result.correct/result.total*100)})
      const overall=Math.round(Object.values(scores).reduce((sum,result)=>sum+result.score,0)/missionOSData.domains.length)
      const recommendedPathway=[...missionOSData.pathways].sort((a,b)=>{const fit=pathway=>Object.entries(pathway.weights).reduce((sum,[domain,weight])=>sum+scores[domain].score*weight,0)/Object.values(pathway.weights).reduce((sum,weight)=>sum+weight,0);return fit(b)-fit(a)})[0].id
      profile.missionOS.assessment={completedAt:new Date().toISOString(),overall,scores,answers:input.answers,recommendedPathway}
    }else if(input.action==='select-pathway'){profile.missionOS.selectedPathway=input.pathwayId;profile.missionOS.selectedAt=new Date().toISOString()}
    else if(input.action==='reset-assessment')profile.missionOS.assessment=null
    return saveFallback({...data,schemaVersion:6,profile})
  }
  const reset=async()=>{if(api){const next=await api.reset();setData(next);return}saveFallback(emptyData)}
  const exportData=async()=>{if(api)return api.export();const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='daemoncore-operator-record.json';a.click();URL.revokeObjectURL(url);return{canceled:false}}
  return {data,onboard,record,updateSettings,updateMissionOS,reset,exportData}
}

function useLicense() {
  const api=window.daemoncore?.license
  const [license,setLicense]=useState(api?null:previewLicense)
  useEffect(()=>{if(api)api.snapshot().then(setLicense)},[api])
  const invoke=async(method,input)=>{if(!api)throw new Error('License activation is available in the desktop build');const next=await api[method](input);setLicense(next);return next}
  return {license,activate:input=>invoke('activate',input),validate:()=>invoke('validate'),deactivate:()=>invoke('deactivate'),checkout:()=>api?.checkout()}
}

function useFieldOps() {
  const api=window.daemoncore?.fieldops
  const [data,setData]=useState(api?null:{schemaVersion:6,engagements:[],campaigns:[],chaosRuns:[],captures:[],findings:[],audit:[]}),[identity,setIdentity]=useState(api?null:{configured:false,status:'preview',identity:null})
  useEffect(()=>{if(api){api.snapshot().then(setData);api.identity().then(setIdentity)}},[api])
  const enrollIdentity=async input=>{if(!api)throw new Error('Operator identity requires the desktop build');const next=await api.enrollIdentity(input);setIdentity(next);return next}
  const create=async input=>{if(!api)throw new Error('FieldOps requires the desktop build');const next=await api.create(input);setData(next);return next}
  const run=async input=>{if(!api)throw new Error('FieldOps requires the desktop build');const result=await api.run(input);setData(await api.snapshot());return result}
  const campaignAction=async(method,input)=>{if(!api)throw new Error('Campaign Control requires the desktop build');const next=await api[method](input);setData(next);return next}
  const createFinding=async input=>{if(!api)throw new Error('FieldOps requires the desktop build');const next=await api.createFinding(input);setData(next);return next}
  const updateFinding=async(id,input)=>{if(!api)throw new Error('FieldOps requires the desktop build');const next=await api.updateFinding(id,input);setData(next);return next}
  const retestFinding=async(id,input)=>{if(!api)throw new Error('FieldOps requires the desktop build');const next=await api.retestFinding(id,input);setData(next);return next}
  const startChaos=async input=>{if(!api)throw new Error('Chaos Engine requires the desktop build');const next=await api.startChaos(input);setData(next);return next}
  const abortChaos=async id=>{if(!api)throw new Error('Chaos Engine requires the desktop build');const next=await api.abortChaos(id);setData(next);return next}
  const refresh=async()=>{if(!api)return data;const next=await api.snapshot();setData(next);return next}
  const close=async id=>{if(!api)throw new Error('FieldOps requires the desktop build');const next=await api.close(id);setData(next);return next}
  const exportEvidence=id=>api?.export(id)
  const exportReport=id=>api?.report(id)
  return {data,identity,enrollIdentity,create,run,startCampaign:input=>campaignAction('startCampaign',input),pauseCampaign:id=>campaignAction('pauseCampaign',id),resumeCampaign:id=>campaignAction('resumeCampaign',id),cancelCampaign:id=>campaignAction('cancelCampaign',id),createFinding,updateFinding,retestFinding,startChaos,abortChaos,refresh,close,exportEvidence,exportReport}
}

function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'compact' : ''}`}>
    <div className="brand-mark"><Hexagon size={30} strokeWidth={1.4} /><div className="brand-core" /></div>
    {!compact && <div><strong>DAEMON<span>CORE</span></strong><small>ACADEMY // SECURE LAB</small></div>}
  </div>
}

function Sidebar({ page, setPage, collapsed, setCollapsed, profile }) {
  return <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
    <div className="drag-region" />
    <Brand compact={collapsed} />
    <nav className="main-nav">
      <p className="nav-label">{collapsed ? '///' : 'OPERATIONS'}</p>
      {nav.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)} title={label}>
        <Icon size={19} /><span>{label}</span>{page === id && <i />}
      </button>)}
    </nav>
    <div className="sidebar-lower">
      <button className={`nav-button ${page==='settings'?'active':''}`} onClick={()=>setPage('settings')}><Settings size={19} /><span>Settings</span></button>
      <div className="operator-mini"><div className="avatar">{profile.handle.slice(0,2)}</div><div><strong>{profile.handle}</strong><small>OPERATOR // LVL {String(profile.level).padStart(2,'0')}</small></div><span className="online-dot" /></div>
      <button className="collapse" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ArrowRight size={16} /> : <><ArrowLeft size={16} /> Collapse</>}</button>
    </div>
  </aside>
}

function Topbar({ title, profile }) {
  return <header className="topbar">
    <div><span className="eyebrow">DAEMONCORE / {title.toUpperCase()}</span><h1>{title}</h1></div>
    <div className="top-actions">
      <div className="top-operator"><small>{profile.handle}</small><strong>{profile.xp.toLocaleString()} XP</strong></div>
      <div className="system-state"><span /><div><small>RANGE STATUS</small><strong>CONTROLLED</strong></div></div>
    </div>
  </header>
}

function Ring({ value, size = 54, stroke = 4 }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  return <div className="ring" style={{ width: size, height: size }}>
    <svg width={size} height={size}><circle cx={size/2} cy={size/2} r={radius} /><circle className="fill" cx={size/2} cy={size/2} r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} /></svg>
    <strong>{value}%</strong>
  </div>
}

function Stat({ icon: Icon, label, value, note, tone }) {
  return <div className="stat-card"><div className={`stat-icon ${tone || ''}`}><Icon size={19} /></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>
}

function CommandPage({ setPage, profile }) {
  const completed=profile.completedLessons.length,progress=Math.round(completed/course.lessons.length*100),nextLesson=course.lessons.find(lesson=>!profile.completedLessons.includes(lesson.id)),weekly=Math.min(100,Math.round(profile.weeklyMinutes/profile.weeklyGoalMinutes*100))
  return <div className="page command-page">
    <section className="hero-panel">
      <div className="grid-overlay" />
      <div className="hero-content"><span className="section-code"><i /> ACTIVE DIRECTIVE</span><h2>Welcome back,<br/><em>{profile.handle}.</em></h2><p>{nextLesson?`Continue ${nextLesson.title}, or enter the range and turn the material into evidence.`:'Course complete. Keep the edge by replaying drills and improving range scores.'}</p><div className="hero-actions"><button className="primary" onClick={() => setPage('academy')}><Play size={16} fill="currentColor" /> {nextLesson?'Resume course':'Review course'}</button><button className="ghost" onClick={() => setPage('labs')}>Enter lab range <ArrowRight size={16} /></button></div></div>
      <div className="core-visual"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="core-hex"><Hexagon size={145} strokeWidth={.45}/><Hexagon size={82} strokeWidth={.7}/><div className="pulse-core" /></div><span className="coordinate c1">RANGE_07</span><span className="coordinate c2">40.7128 / 74.0060</span><span className="coordinate c3">SIGNAL // NOMINAL</span></div>
    </section>
    <section className="stats-row">
      <Stat icon={Zap} label="TOTAL EXPERIENCE" value={profile.xp.toLocaleString()} note={`LEVEL ${String(profile.level).padStart(2,'0')}`} tone="red" />
      <Stat icon={Flame} label="ACTIVE STREAK" value={`${profile.streak} ${profile.streak===1?'DAY':'DAYS'}`} note={`PERSONAL BEST: ${profile.bestStreak}`} tone="orange" />
      <Stat icon={Target} label="OPERATIONS CLEARED" value={profile.completedMissions.length} note={`${profile.missionAttempts.length} TOTAL ATTEMPTS`} />
      <div className="stat-card goal"><Ring value={weekly}/><div><span>WEEKLY DIRECTIVE</span><strong>{profile.weeklyMinutes} / {profile.weeklyGoalMinutes} MIN</strong><small>{Math.max(0,profile.weeklyGoalMinutes-profile.weeklyMinutes)} MIN REMAINING</small></div></div>
    </section>
    <section className="content-grid">
      <div className="panel current-path"><div className="panel-head"><div><span className="section-code">CURRENT COURSE</span><h3>{course.title}</h3></div><button onClick={() => setPage('academy')}>View course <ChevronRight size={15}/></button></div>
        <div className="lesson-feature"><div className="lesson-number">{String(Math.min(completed+1,course.lessons.length)).padStart(2,'0')}</div><div><span>{nextLesson?`UP NEXT // ${nextLesson.minutes} MIN`:'COURSE STATUS // COMPLETE'}</span><h4>{nextLesson?.title||'All lessons mastered'}</h4><p>{nextLesson?.sections[0].body||'Review any lesson or improve your range operation score.'}</p></div><button className="round-play" onClick={() => setPage('academy')}><Play size={18} fill="currentColor" /></button></div>
        <div className="progress-track"><i style={{width:`${progress}%`}}/><span style={{left:`${progress}%`}}/></div><div className="progress-meta"><span>{completed} OF {course.lessons.length} LESSONS</span><strong>{progress}% COMPLETE</strong></div>
      </div>
      <div className="panel activity-panel"><div className="panel-head"><div><span className="section-code">SIGNAL LOG</span><h3>Recent activity</h3></div><Activity size={18}/></div>
        {profile.activity.length?profile.activity.slice(0,3).map((a,i)=><div className="activity-item" key={a.id}><div className={`activity-node n${i}`}><Check size={12}/></div><div><span>{a.type.toUpperCase()}</span><strong>{a.title}</strong></div><em>{a.xp?`+${a.xp} XP`:''}</em><small>{new Date(a.at).toLocaleDateString()}</small></div>):<div className="empty-activity"><Activity/><strong>No signal yet.</strong><span>Complete a lesson, drill, or mission to start the log.</span></div>}
      </div>
    </section>
    <section className="daily-brief"><div><span className="section-code"><i/> DAILY BRIEF // 026</span><h3>Precision beats velocity.</h3><p>The cleanest assessment is the one where every action answers a question.</p></div><button onClick={() => setPage('intel')}>OPEN FIELD NOTE <ArrowRight size={15}/></button></section>
  </div>
}

function AcademyPage({ selectModule, profile }) {
  const progressFor=module=>Math.round(module.lessons.filter(lesson=>profile.completedLessons.includes(lesson.id)).length/module.lessons.length*100)
  const icons=[Radar,Braces,Shield,Database,Activity,HardDrive,Box,Layers3],modules=[course,webCourse,...enterpriseCourses],totalMinutes=modules.reduce((sum,module)=>sum+module.estimatedMinutes,0),totalLessons=modules.reduce((sum,module)=>sum+module.lessons.length,0),completed=modules.reduce((sum,module)=>sum+module.lessons.filter(lesson=>profile.completedLessons.includes(lesson.id)).length,0),overall=Math.round(completed/totalLessons*100)
  return <div className="page academy-page">
    <div className="page-intro"><div><span className="section-code">FULL-SPECTRUM ACADEMY // EIGHT COMPLETE PATHWAYS</span><h2>Learn the system.<br/><em>Test the evidence.</em></h2></div><p>{totalLessons} practical lessons, {Math.floor(totalMinutes/60)} hours {totalMinutes%60} minutes of guided workshops, 70 specialist range conditions, six core ranges, and three principal capstones. Every number comes from shipped content or your local record.</p></div>
    <div className="academy-summary"><div><ShieldCheck size={25}/><div><span>ACADEMY LIBRARY</span><strong>EIGHT COMPLETE PATHWAYS</strong></div></div><div className="summary-progress"><span>ACADEMY PROGRESS</span><div><i style={{width:`${overall}%`}}/></div><strong>{overall}%</strong></div><div className="cert-meta"><span>CONTENT LENGTH</span><strong>{Math.floor(totalMinutes/60)}H {totalMinutes%60}M</strong></div></div>
    <div className="filter-row"><span>AVAILABLE NOW // NO PLACEHOLDERS</span></div>
    <div className="module-list">{modules.map((module,index)=>{const progress=progressFor(module),Icon=icons[index];return <button className="module-card active" key={module.code} onClick={()=>selectModule({...module,icon:Icon,progress})}><div className="module-index">{String(index+1).padStart(2,'0')}</div><div className="module-icon" style={{'--accent':'#ff3038'}}><Icon size={25}/></div><div className="module-copy"><span>{module.code} // {progress===100?'MASTERED':progress?'IN PROGRESS':'READY'}</span><h3>{module.title}</h3><p>{module.description}</p><div className="module-tags"><em><BookOpen size={13}/>{module.lessons.length} lessons</em><em><Clock3 size={13}/>{module.estimatedMinutes} min</em></div></div><div className="module-progress"><Ring value={progress} size={62}/><span>{progress===100?'MASTERED':progress?'IN PROGRESS':'BEGIN'}</span></div><ChevronRight className="module-arrow" size={20}/></button>})}</div>
  </div>
}

function LabsPage({ launchMission, completedMissions = [] }) {
  const tracks=[...new Set(missions.map(mission=>mission.track))]
  return <div className="page labs-page">
    <div className="range-banner"><div className="range-radar"><Radar size={38}/><i/><i/><i/></div><div><span className="section-code"><i/> PHASE 15 RANGE FABRIC</span><h2>Lab Range</h2><p>Disposable targets. Root operator shell. Hard containment.</p></div><div className="range-details"><div><span>LIVE SCENARIOS</span><strong>07 / 07</strong></div><div><span>TRACKS</span><strong>{String(tracks.length).padStart(2,'0')} ACTIVE</strong></div><div><span>BOUNDARY</span><strong>SEALED</strong></div></div></div>
    <RangeEngineCard/>
    <RangeFabric/>
    <RangeChaosLab/>
    <div className="track-strip">{tracks.map(track=>{const trackMissions=missions.filter(mission=>mission.track===track),complete=trackMissions.filter(mission=>completedMissions.includes(mission.id)).length;return <div key={track}><span>{track}</span><strong>{complete} / {trackMissions.length}</strong><i><em style={{width:`${complete/trackMissions.length*100}%`}}/></i></div>})}</div>
    <div className="section-title"><div><span>CURATED OPERATIONS // SEVEN LIVE SEALED RANGES</span><h3>Available missions</h3></div></div>
    <div className="mission-grid">{missions.map((m,i)=>{ const Icon=m.icon, cleared=completedMissions.includes(m.id); return <article className={`mission-card mission-${i%3} ${cleared?'cleared':''}`} key={m.id}><div className="mission-top"><span>{m.difficulty}</span><div><Icon size={28}/></div></div><div className="mission-code">{m.track} // MISSION {String(i+1).padStart(2,'0')}</div><PhaseBadge complete={cleared} live/><h3>{m.title}</h3><p>{m.brief}</p><div className="mission-tags">{m.tags.map(t=><span key={t}>{t}</span>)}</div><div className="mission-bottom"><div><span><Clock3 size={14}/>{m.time}</span><span><Zap size={14}/>{m.xp} XP</span></div><button onClick={()=>launchMission(m)}>{cleared?'Replay mission':'View brief'} <ArrowRight size={15}/></button></div></article>})}</div>
    <div className="range-protocol"><Shield size={25}/><div><strong>Range protocol is enforced.</strong><p>All exercises use synthetic evidence and intentionally vulnerable training systems. Activity outside the declared lab boundary is never part of an Academy mission.</p></div><span>ROE // ACTIVE</span></div>
  </div>
}

function DrillsPage({ startQuiz, profile }) {
  const attempts=profile.drillAttempts||[],totalCorrect=attempts.reduce((sum,a)=>sum+a.correct,0),totalQuestions=attempts.reduce((sum,a)=>sum+a.total,0),accuracy=totalQuestions?Math.round(totalCorrect/totalQuestions*100):0,perfect=attempts.filter(a=>a.correct===a.total).length
  const icons=[Network,Braces,Database,Award]
  const bestFor=id=>attempts.filter(a=>a.drillId===id).reduce((best,a)=>Math.max(best,Math.round(a.correct/a.total*100)),0)
  return <div className="page drills-page"><div className="drill-hero"><div><span className="section-code">REPEATABLE SKILL CONDITIONING</span><h2>Pressure makes<br/><em>patterns visible.</em></h2><p>Eight complete drill sets across network, web, evidence, authorization, cloud, credential safety, and triage. Scores below are calculated only from your attempts.</p><button className="primary" onClick={()=>startQuiz(drillSets[0])}><Swords size={17}/> Start protocol drill</button></div><div className="score-orbit"><div><small>ACCURACY</small><strong>{accuracy}</strong><span>{attempts.length?'FROM OPERATOR RECORD':'NO ATTEMPTS YET'}</span></div></div></div>
    <div className="drill-stats"><div><span>ATTEMPTS LOGGED</span><strong>{attempts.length}</strong><BarChart3/></div><div><span>AVERAGE ACCURACY</span><strong>{accuracy}%</strong><Target/></div><div><span>PERFECT RUNS</span><strong>{perfect}</strong><Flame/></div><div><span>QUESTIONS ANSWERED</span><strong>{totalQuestions}</strong><Trophy/></div></div>
    <div className="section-title"><div><span>DRILL LIBRARY</span><h3>Sharpen a specific skill</h3></div></div>
    <div className="drill-list">{drillSets.map((d,i)=>{const Icon=icons[i%icons.length],best=bestFor(d.id);return <button key={d.id} onClick={()=>startQuiz(d)}><span className="drill-num">{String(i+1).padStart(2,'0')}</span><div className="drill-icon"><Icon size={20}/></div><div><strong>{d.title}</strong><p>{d.description}</p></div><span><Clock3 size={13}/>{d.questions.length} QUESTIONS</span><span>PB // {best?`${best}%`:'—'}</span><Play size={17}/></button>})}</div>
  </div>
}

function IntelPage({ onOpen }) {
  const featured=intelArticles[0]
  return <div className="page intel-page"><div className="page-intro"><div><span className="section-code">OPERATOR KNOWLEDGE BASE</span><h2>Field intelligence,<br/><em>distilled.</em></h2></div><p>Durable mental models and practical standards. Built to be used mid-operation, not admired in a library.</p></div>
    <div className="intel-feature"><div className="intel-glyph"><Layers3 size={48}/><span>DC<br/>001</span></div><div><span>FEATURED FIELD NOTE // VERIFIED</span><h3>{featured.title}</h3><p>{featured.summary}</p><button className="ghost" onClick={()=>onOpen(featured)}>Read field note <ArrowRight size={15}/></button></div><div className="intel-index"><span>READ TIME</span><strong>{featured.readMinutes} MIN</strong><span>SECTIONS</span><strong>{featured.sections.length}</strong></div></div>
    <div className="intel-grid">{intelArticles.map((item,i)=><article key={item.id}><div className="intel-card-top"><span>{item.type} // 00{i+1}</span><BookOpen size={18}/></div><h3>{item.title}</h3><p>{item.summary}</p><footer><span><Clock3 size={13}/>{item.readMinutes} MIN</span><button onClick={()=>onOpen(item)}>Open <ChevronRight size={14}/></button></footer></article>)}</div>
  </div>
}

function ModuleDetail({ module, onBack, startLesson, profile }) {
  const Icon=module.icon
  const progress=Math.round(module.lessons.filter(lesson=>profile.completedLessons.includes(lesson.id)).length/module.lessons.length*100)
  return <div className="page detail-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/> Course library</button><div className="detail-hero"><div className="detail-icon"><Icon size={38}/></div><div><span>{module.code} // COMPLETE COURSE</span><h2>{module.title}</h2><p>{module.description}</p><div className="module-tags"><em><BookOpen size={13}/>{module.lessons.length} lessons</em><em><Clock3 size={13}/>{module.estimatedMinutes} min</em><em><Zap size={13}/>{module.lessons.length*180} XP</em></div></div><div className="detail-progress"><Ring value={progress} size={90} stroke={5}/><span>COURSE PROGRESS</span></div></div>
    <div className="detail-layout"><section><div className="section-title"><div><span>CURRICULUM</span><h3>Operational sequence</h3></div></div><div className="lesson-list">{module.lessons.map((item,i)=>{const complete=profile.completedLessons.includes(item.id),active=!complete&&module.lessons.findIndex(l=>!profile.completedLessons.includes(l.id))===i; return <button key={item.id} className={active?'active':''} onClick={()=>startLesson({...item,courseCode:module.code})}><span>{complete?<Check size={14}/>:String(i+1).padStart(2,'0')}</span><div><small>{item.level} // {complete?'COMPLETE':active?'UP NEXT':'READY'}</small><strong>{item.title}</strong></div><em>{item.minutes} MIN</em>{active?<Play size={16} fill="currentColor"/>:<ChevronRight size={16}/>}</button>})}</div></section><aside className="path-aside"><div className="mentor-card"><div className="mentor-avatar"><ShieldCheck/></div><span>COURSE STANDARD</span><h3>ARTIFACTS OVER VIBES</h3><p>Every lesson requires a workshop artifact and a validation check. Progress is recorded only after both are explicitly completed.</p></div><button className="primary full" onClick={()=>startLesson({...module.lessons.find(l=>!profile.completedLessons.includes(l.id))||module.lessons[0],courseCode:module.code})}><Play size={16}/> {progress===100?'Review from start':'Resume course'}</button><div className="unlock-card"><Target size={20}/><div><span>FIELD APPLICATION</span><strong>{module.code==='WEB-201'?'Twenty-two Web Forge scenarios':module.code.endsWith('-301')?'Enterprise Forge casework':'Six sealed ranges'}</strong><small>Live Docker evidence labs</small></div></div></aside></div>
  </div>
}

function MissionModal({ mission, defaultMode='assisted', onClose, onLaunch }) {
  const [mode,setMode]=useState(defaultMode)
  const modes=[['guided','GUIDED','Exact runbook available','1.0×'],['assisted','ASSISTED','Tool map + progressive hints','1.15×'],['blind','BLIND','Objectives only','1.35×'],['professional','PRO','No hints // live evidence','1.5×']]
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="mission-modal adaptive-launch"><ModalClose onClose={onClose} label="Close mission briefing"/><span className="section-code"><i/> ADAPTIVE RANGE MISSION</span><div className="modal-code">DC // RANGE // {mission.id.toUpperCase()}</div><h2>{mission.title}</h2><p className="modal-brief">{mission.brief}</p><div className="brief-grid"><div><span>DIFFICULTY</span><strong>{mission.difficulty}</strong></div><div><span>TIMEBOX</span><strong>{mission.time}</strong></div><div><span>BASE REWARD</span><strong>{mission.xp} XP</strong></div></div><div className="range-handoff"><Terminal/><div><span>WHAT HAPPENS WHEN YOU LAUNCH</span><strong>A disposable Docker terminal opens inside the training range.</strong><p>Wait for <b>Containment verified</b>. Commands entered at the <code>root@dc-</code> prompt run inside that range—not in this lesson and not in your Windows terminal.</p></div></div><h4>SELECT OPERATOR MODE</h4><div className="mission-modes">{modes.map(([id,label,detail,multiplier])=><button type="button" className={mode===id?'active':''} key={id} onClick={()=>setMode(id)}><span>{label}{id==='guided'&&defaultMode==='guided'?' // START HERE':''}</span><strong>{detail}</strong><em>{multiplier}</em></button>)}</div><h4>OUTCOMES TO PROVE</h4><ol>{mission.objectives.map((o,i)=><li key={o}><span>0{i+1}</span>{o}</li>)}</ol><div className="authorization"><ShieldCheck size={21}/><p><strong>Outcome validation enabled.</strong> Alternate commands count when their resulting evidence proves the objective.</p></div><button className="primary full" onClick={()=>onLaunch({mode})}><Play size={16} fill="currentColor"/> Launch sealed range // {mode}</button></div></div>
}

function QuizModal({ drill, onClose, onComplete }) {
  const [step,setStep]=useState(0), [answers,setAnswers]=useState([]), [finished,setFinished]=useState(false)
  const questions=drill.questions,question=questions[step]
  const choose=(i)=>{ if(answers[step]!==undefined)return; const next=[...answers];next[step]=i;setAnswers(next) }
  const next=()=>{ if(step<questions.length-1)setStep(step+1);else setFinished(true) }
  const score=answers.filter((a,i)=>a===questions[i].answer).length
  if(finished) return <div className="modal-backdrop"><div className="quiz-modal result"><div className="result-mark"><Award size={45}/></div><span>DRILL COMPLETE</span><h2>{score===questions.length?'Flawless execution.':score>=2?'Strong signal.':'Recalibrate and repeat.'}</h2><div className="result-score"><strong>{score}/{questions.length}</strong><span>ACCURACY // {Math.round(score/questions.length*100)}%</span></div><p>{score===questions.length?'Precise, controlled, and evidence-led. That is the standard.':'Review the reasoning, then run it again. Mastery is built through clean repetition.'}</p><button className="primary full" onClick={()=>{onComplete({type:'drill',id:drill.id,title:drill.title,correct:score,total:questions.length});onClose()}}>Log results <ArrowRight size={16}/></button></div></div>
  return <div className="modal-backdrop"><div className="quiz-modal"><button className="modal-close" onClick={onClose}><X size={18}/></button><div className="quiz-head"><span>{drill.title.toUpperCase()}</span><strong>0{step+1} / 0{questions.length}</strong></div><div className="quiz-progress"><i style={{width:`${(step+1)/questions.length*100}%`}}/></div><span className="question-type">OPERATIONAL JUDGMENT</span><h2>{question.q}</h2><div className="answers">{question.options.map((o,i)=>{const selected=answers[step]===i, correct=question.answer===i&&answers[step]!==undefined, wrong=selected&&!correct;return <button key={o} className={`${selected?'selected':''} ${correct?'correct':''} ${wrong?'wrong':''}`} onClick={()=>choose(i)}><span>{String.fromCharCode(65+i)}</span>{o}{(correct||wrong)&&<em>{correct?<Check size={16}/>:<X size={16}/>}</em>}</button>})}</div><button className="primary quiz-next" disabled={answers[step]===undefined} onClick={next}>{step===questions.length-1?'Finish drill':'Next question'} <ArrowRight size={16}/></button></div></div>
}

function Toast({ message }) { return <div className="toast"><div><Check size={16}/></div>{message}</div> }

export default function App() {
  const store=useAppData()
  const licensing=useLicense()
  const fieldOps=useFieldOps()
  const [page,setPage]=useState('command'), [collapsed,setCollapsed]=useState(null), [module,setModule]=useState(null), [mission,setMission]=useState(null), [activeMission,setActiveMission]=useState(null), [activeWebLab,setActiveWebLab]=useState(null), [activeEnterpriseLab,setActiveEnterpriseLab]=useState(null), [activeCapstone,setActiveCapstone]=useState(null), [lesson,setLesson]=useState(null), [quiz,setQuiz]=useState(null), [article,setArticle]=useState(null), [toast,setToast]=useState(''), [guideState,setGuideState]=useState({handle:null,forced:false,dismissed:false})
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(t)},[toast])
  useEffect(()=>{document.body.classList.toggle('reduce-motion',Boolean(store.data?.settings?.reduceMotion))},[store.data?.settings?.reduceMotion])
  useEffect(()=>{const scale=Math.max(1,Math.min(1.4,Number(store.data?.settings?.uiScale)||1.25));if(window.daemoncore?.display)window.daemoncore.display.setZoom(scale);else document.body.style.zoom=String(scale)},[store.data?.settings?.uiScale])
  useEffect(()=>{const closeTopModal=event=>{if(event.key!=='Escape'||event.defaultPrevented)return;const close=document.querySelector('.modal-backdrop .modal-close');if(close instanceof HTMLButtonElement){event.preventDefault();close.click()}};window.addEventListener('keydown',closeTopModal);return()=>window.removeEventListener('keydown',closeTopModal)},[])
  useEffect(()=>{window.scrollTo(0,0)},[page,module])
  if(!store.data||!licensing.license||!fieldOps.data)return <LoadingScreen/>
  const licenseProps={license:licensing.license,onActivate:licensing.activate,onValidate:licensing.validate,onDeactivate:licensing.deactivate,onCheckout:licensing.checkout}
  if(licensing.license.requireAcademyLicense&&!licensing.license.licensed)return <LicenseGate {...licenseProps}/>
  if(!store.data.profile.handle)return <Onboarding onComplete={store.onboard}/>
  const operator=store.data.profile
  const guideOpen=guideState.forced||(!store.data.settings.academyGuideComplete&&(guideState.handle!==operator.handle||!guideState.dismissed))
  const navigationCollapsed=collapsed??store.data.settings.compactMode
  const title=module?module.title:page==='settings'?'Settings':nav.find(n=>n.id===page)?.label||'Command'
  const completeQuiz=async event=>{await store.record(event);setToast(`Drill logged // +${event.correct*120} XP`)}
  const completeMission=async({mission:cleared,score,hints,seconds,receipt,launchReceipt,mode,seed,evidenceDigest,debrief,caseVariant})=>{await store.record({type:'mission',id:cleared.id,title:cleared.title,score,hints,seconds,mode,seed,evidenceDigest,debrief,caseVariant,receiptDigest:receipt?.digest,packDigest:launchReceipt?.pack?.digest,receiptId:receipt?.receiptId});setActiveMission(null);setPage('labs');setToast(`${String(mode||'adaptive').toUpperCase()} mission sealed // ${score} XP`)}
  const completeWebLab=async event=>{await store.record(event);setActiveWebLab(null);setPage('webforge');setToast(`Web Forge sealed // +${event.score} XP`)}
  const completeEnterpriseLab=async event=>{await store.record({...event,type:'enterpriseLab'});setActiveEnterpriseLab(null);setPage('enterprise');setToast(`Enterprise Forge sealed // +${event.score} XP`)}
  const completeLesson=async completedLesson=>{await store.record({type:'lesson',id:completedLesson.id,title:completedLesson.title,minutes:completedLesson.minutes,practicalScore:completedLesson.practicalScore});setLesson(null);if(completedLesson.nextPage){setModule(null);setPage(completedLesson.nextPage)}setToast(`Lesson mastered // practical ${completedLesson.practicalScore}% recorded`)}
  const closeGuide=async destination=>{setGuideState({handle:operator.handle,forced:false,dismissed:true});await store.updateSettings({...store.data.settings,academyGuideComplete:true});if(destination){setModule(null);setPage(destination)}}
  const completeCapstone=async event=>{await store.record(event);setActiveCapstone(null);setPage('mastery');setToast(event.score>=80?`Capstone sealed // ${event.score}% verified mastery`:`Attempt logged // ${event.score}% // adaptive path updated`)}
  if(activeMission)return <LabSimulation mission={activeMission} onExit={()=>setActiveMission(null)} onComplete={completeMission}/>
  if(activeWebLab)return <WebLabRunner lab={activeWebLab} onExit={()=>setActiveWebLab(null)} onComplete={completeWebLab}/>
  if(activeEnterpriseLab)return <WebLabRunner lab={activeEnterpriseLab} rangeId="enterprise-range" forgeName="Enterprise Forge" onExit={()=>setActiveEnterpriseLab(null)} onComplete={completeEnterpriseLab}/>
  if(activeCapstone)return <CapstoneRunner capstone={activeCapstone} onExit={()=>setActiveCapstone(null)} onComplete={completeCapstone}/>
  if(lesson)return <LessonPlayer lesson={lesson} onExit={()=>setLesson(null)} onComplete={completeLesson}/>
  if(article)return <ArticleReader article={article} onClose={()=>setArticle(null)}/>
  let current
  if(module)current=<ModuleDetail module={module} onBack={()=>setModule(null)} startLesson={setLesson} profile={operator}/>
  else if(page==='command')current=<CommandPage setPage={setPage} profile={operator}/>
  else if(page==='missionos')current=<MissionOSPage profile={operator} onUpdate={store.updateMissionOS} onNavigate={setPage}/>
  else if(page==='academy')current=<AcademyPage selectModule={setModule} profile={operator}/>
  else if(page==='webforge')current=<WebForgePage profile={operator} onLaunch={setActiveWebLab}/>
  else if(page==='enterprise')current=<EnterpriseForgePage profile={operator} onLaunch={setActiveEnterpriseLab}/>
  else if(page==='mastery')current=<MasteryPage profile={operator} onStart={setActiveCapstone} onOpenLesson={setLesson}/>
  else if(page==='labs')current=<LabsPage launchMission={setMission} completedMissions={operator.completedMissions}/>
  else if(page==='fieldops')current=<FieldOpsPage license={licensing.license} data={fieldOps.data} identity={fieldOps.identity} onEnrollIdentity={fieldOps.enrollIdentity} onCreate={fieldOps.create} onRun={fieldOps.run} onCampaignStart={fieldOps.startCampaign} onCampaignPause={fieldOps.pauseCampaign} onCampaignResume={fieldOps.resumeCampaign} onCampaignCancel={fieldOps.cancelCampaign} onCreateFinding={fieldOps.createFinding} onUpdateFinding={fieldOps.updateFinding} onRetestFinding={fieldOps.retestFinding} onChaosStart={fieldOps.startChaos} onChaosAbort={fieldOps.abortChaos} onRefresh={fieldOps.refresh} onClose={fieldOps.close} onExport={fieldOps.exportEvidence} onReport={fieldOps.exportReport} onSettings={()=>setPage('settings')}/>
  else if(page==='drills')current=<DrillsPage startQuiz={setQuiz} profile={operator}/>
  else if(page==='intel')current=<IntelPage onOpen={setArticle}/>
  else if(page==='operator')current=<OperatorPage profile={operator}/>
  else current=<SettingsPage data={store.data} {...licenseProps} onUpdate={store.updateSettings} onExport={store.exportData} onReset={store.reset}/>
  const platform={win32:'WINDOWS',linux:'LINUX',darwin:'MACOS'}[window.daemoncore?.platform]||'WEB PREVIEW'
  const version=window.daemoncore?.version||'6.0 PREVIEW'
  return <div className="app-shell"><Sidebar page={page} setPage={p=>{setPage(p);setModule(null)}} collapsed={navigationCollapsed} setCollapsed={setCollapsed} profile={operator}/><main><Topbar title={title} profile={operator}/><WorkflowDock page={page} profile={operator} onNavigate={destination=>{setModule(null);setPage(destination)}} onOpenGuide={()=>setGuideState({handle:operator.handle,forced:true,dismissed:false})}/>{current}<footer className="app-footer"><span>DAEMONCORE ACADEMY // MISSION OS</span><span><i/> LICENSED LOCAL-FIRST PLATFORM</span><span>V{version} // {platform}</span></footer></main>{guideOpen&&<AcademyWorkflowGuide onClose={()=>closeGuide()} onNavigate={closeGuide}/>} {mission&&<MissionModal mission={mission} defaultMode={operator.completedMissions?.length?'assisted':'guided'} onClose={()=>setMission(null)} onLaunch={({mode})=>{setActiveMission({...mission,mode});setMission(null)}}/>}{quiz&&<QuizModal drill={quiz} onClose={()=>setQuiz(null)} onComplete={completeQuiz}/>} {toast&&<Toast message={toast}/>}</div>
}
