import { useEffect, useState } from 'react'
import {
  Activity, ArrowLeft, ArrowRight, Award, BarChart3, Bell, BookOpen,
  Box, Braces, Check, ChevronRight, Circle, Clock3, Command, Crosshair,
  Database, Flame, Gauge, GraduationCap, Grid2X2, HardDrive, Hexagon,
  KeyRound, Layers3, LockKeyhole, Menu, Network, Play, Radar, Search,
  Settings, Shield, ShieldCheck, Sparkles, Swords, Target, Terminal,
  Trophy, UserRound, X, Zap,
} from 'lucide-react'
import { LabSimulation, LessonPlayer, OperatorPage, PhaseBadge, RangeEngineCard } from './phase2.jsx'

const nav = [
  { id: 'command', label: 'Command', icon: Grid2X2 },
  { id: 'academy', label: 'Academy', icon: GraduationCap },
  { id: 'labs', label: 'Lab Range', icon: Terminal },
  { id: 'drills', label: 'Drills', icon: Crosshair },
  { id: 'intel', label: 'Intel', icon: BookOpen },
  { id: 'operator', label: 'Operator', icon: UserRound },
]

const modules = [
  { id: 1, code: 'CORE-01', title: 'Operational Foundations', description: 'Build the habits, ethics, and systems fluency every serious operator needs.', progress: 100, lessons: 8, time: '2h 10m', icon: Command, status: 'complete', accent: '#d8d8dc' },
  { id: 2, code: 'NET-02', title: 'Network Reconnaissance', description: 'Map authorized environments, interpret traffic, and turn observations into testable hypotheses.', progress: 68, lessons: 12, time: '4h 30m', icon: Radar, status: 'active', accent: '#ff3038' },
  { id: 3, code: 'WEB-03', title: 'Web Attack Surface', description: 'Understand requests, sessions, trust boundaries, and common application failure modes.', progress: 14, lessons: 14, time: '6h 15m', icon: Braces, status: 'available', accent: '#9a3cff' },
  { id: 4, code: 'HOST-04', title: 'Host Enumeration', description: 'Read the operating environment and identify exposure without losing the thread.', progress: 0, lessons: 10, time: '5h 20m', icon: HardDrive, status: 'locked', accent: '#36a9ff' },
]

const missions = [
  { id: 'ghost-port', difficulty: 'FOUNDATIONAL', title: 'The Ghost Port', brief: 'A routine service audit found an undocumented listener inside the approved training subnet. Profile it and document the exposure.', time: '25 min', xp: 450, icon: Network, tags: ['Enumeration', 'Traffic analysis'], objectives: ['Review the supplied host inventory', 'Compare documented and observed services', 'Identify the anomalous listener', 'Submit a concise evidence note'] },
  { id: 'broken-trust', difficulty: 'INTERMEDIATE', title: 'Broken Trust', brief: 'An internal training portal is crossing a trust boundary it should not. Trace the session flow and isolate the design flaw.', time: '40 min', xp: 780, icon: KeyRound, tags: ['Web security', 'Sessions'], objectives: ['Map the authentication flow', 'Inspect provided request captures', 'Locate the broken trust assumption', 'Recommend a safe remediation'] },
  { id: 'night-shift', difficulty: 'ADVANCED', title: 'Night Shift', brief: 'A simulated endpoint began behaving strangely after hours. Triage the evidence pack and reconstruct the event timeline.', time: '60 min', xp: 1250, icon: Activity, tags: ['Triage', 'Forensics'], objectives: ['Validate the evidence manifest', 'Build a chronological timeline', 'Separate signal from benign noise', 'Deliver an incident hypothesis'] },
]

const intel = [
  { title: 'The Reconnaissance Loop', type: 'FIELD NOTE', read: '6 min', desc: 'How disciplined operators move from observation to hypothesis without creating noise.' },
  { title: 'Reading HTTP Like Evidence', type: 'PLAYBOOK', read: '12 min', desc: 'A durable mental model for requests, responses, sessions, and trust boundaries.' },
  { title: 'Write Findings That Matter', type: 'STANDARD', read: '8 min', desc: 'Turn technical evidence into risk, reproducibility, and clear remediation.' },
  { title: 'Lab Rules of Engagement', type: 'PROTOCOL', read: '4 min', desc: 'The authorization boundaries that keep practice controlled, ethical, and useful.' },
]

const quizQuestions = [
  { q: 'During an authorized assessment, what should define the systems and techniques you may test?', options: ['The rules of engagement', 'Whatever responds to a scan', 'The operator’s confidence', 'Public accessibility'], answer: 0 },
  { q: 'You observe an unexpected service in a lab. What is the strongest next move?', options: ['Exploit it immediately', 'Form a hypothesis and gather minimally invasive evidence', 'Ignore it as noise', 'Restart the target'], answer: 1 },
  { q: 'Which finding best communicates professional impact?', options: ['A list of tool output', 'A dramatic severity label', 'Evidence, affected asset, realistic consequence, and remediation', 'A screenshot without context'], answer: 2 },
]

const initialProfile = { xp: 4280, level: 7, streak: 12, completed: 18, weeklyGoal: 72, phase2Xp: 0, completedMissions: [], completedLessons: [], achievements: [] }

function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial } catch { return initial }
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)) }, [key, value])
  return [value, setValue]
}

function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'compact' : ''}`}>
    <div className="brand-mark"><Hexagon size={30} strokeWidth={1.4} /><div className="brand-core" /></div>
    {!compact && <div><strong>DAEMON<span>CORE</span></strong><small>ACADEMY // SECURE LAB</small></div>}
  </div>
}

function Sidebar({ page, setPage, collapsed, setCollapsed }) {
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
      <button className="nav-button"><Settings size={19} /><span>Settings</span></button>
      <div className="operator-mini"><div className="avatar">VX</div><div><strong>VECTOR</strong><small>OPERATOR // LVL 07</small></div><span className="online-dot" /></div>
      <button className="collapse" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ArrowRight size={16} /> : <><ArrowLeft size={16} /> Collapse</>}</button>
    </div>
  </aside>
}

function Topbar({ title, onSearch }) {
  const [searchOpen, setSearchOpen] = useState(false)
  return <header className="topbar">
    <div><span className="eyebrow">DAEMONCORE / {title.toUpperCase()}</span><h1>{title}</h1></div>
    <div className="top-actions">
      {searchOpen && <input autoFocus className="search-input" placeholder="Search Academy..." onChange={e => onSearch(e.target.value)} />}
      <button onClick={() => setSearchOpen(!searchOpen)}><Search size={18} /></button>
      <button className="has-alert"><Bell size={18} /><i /></button>
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
  return <div className="page command-page">
    <section className="hero-panel">
      <div className="grid-overlay" />
      <div className="hero-content"><span className="section-code"><i /> ACTIVE DIRECTIVE</span><h2>Welcome back,<br/><em>Operator.</em></h2><p>Your current pathway is live. Continue Network Reconnaissance or enter the range for a controlled field exercise.</p><div className="hero-actions"><button className="primary" onClick={() => setPage('academy')}><Play size={16} fill="currentColor" /> Resume pathway</button><button className="ghost" onClick={() => setPage('labs')}>Enter lab range <ArrowRight size={16} /></button></div></div>
      <div className="core-visual"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="core-hex"><Hexagon size={145} strokeWidth={.45}/><Hexagon size={82} strokeWidth={.7}/><div className="pulse-core" /></div><span className="coordinate c1">RANGE_07</span><span className="coordinate c2">40.7128 / 74.0060</span><span className="coordinate c3">SIGNAL // NOMINAL</span></div>
    </section>
    <section className="stats-row">
      <Stat icon={Zap} label="TOTAL EXPERIENCE" value={profile.xp.toLocaleString()} note="+620 THIS WEEK" tone="red" />
      <Stat icon={Flame} label="ACTIVE STREAK" value={`${profile.streak} DAYS`} note="PERSONAL BEST: 19" tone="orange" />
      <Stat icon={Target} label="DRILLS CLEARED" value={profile.completed} note="82% FIRST-PASS" />
      <div className="stat-card goal"><Ring value={profile.weeklyGoal}/><div><span>WEEKLY DIRECTIVE</span><strong>3H 36M / 5H</strong><small>1H 24M REMAINING</small></div></div>
    </section>
    <section className="content-grid">
      <div className="panel current-path"><div className="panel-head"><div><span className="section-code">CURRENT PATHWAY</span><h3>Network Reconnaissance</h3></div><button onClick={() => setPage('academy')}>View pathway <ChevronRight size={15}/></button></div>
        <div className="lesson-feature"><div className="lesson-number">06</div><div><span>UP NEXT // 18 MIN</span><h4>Service Fingerprinting</h4><p>Turn a list of open ports into a defensible map of exposed services and versions.</p></div><button className="round-play" onClick={() => setPage('academy')}><Play size={18} fill="currentColor" /></button></div>
        <div className="progress-track"><i style={{width:'68%'}}/><span style={{left:'68%'}}/></div><div className="progress-meta"><span>8 OF 12 LESSONS</span><strong>68% COMPLETE</strong></div>
      </div>
      <div className="panel activity-panel"><div className="panel-head"><div><span className="section-code">SIGNAL LOG</span><h3>Recent activity</h3></div><Activity size={18}/></div>
        {[['Drill cleared','Packet Triage','+280 XP','2H'],['Intel reviewed','Rules of Engagement','+40 XP','1D'],['Badge acquired','Quiet Professional','','2D']].map((a,i)=><div className="activity-item" key={a[1]}><div className={`activity-node n${i}`}><Check size={12}/></div><div><span>{a[0]}</span><strong>{a[1]}</strong></div><em>{a[2]}</em><small>{a[3]}</small></div>)}
      </div>
    </section>
    <section className="daily-brief"><div><span className="section-code"><i/> DAILY BRIEF // 026</span><h3>Precision beats velocity.</h3><p>The cleanest assessment is the one where every action answers a question.</p></div><button onClick={() => setPage('intel')}>OPEN FIELD NOTE <ArrowRight size={15}/></button></section>
  </div>
}

function AcademyPage({ selectModule }) {
  return <div className="page academy-page">
    <div className="page-intro"><div><span className="section-code">STRUCTURED OPERATIONS TRAINING</span><h2>Forge the fundamentals.<br/><em>Earn the edge.</em></h2></div><p>Every pathway combines concise instruction, evidence-driven drills, and controlled assessments. Progress is earned—not watched.</p></div>
    <div className="academy-summary"><div><ShieldCheck size={25}/><div><span>CURRENT CERTIFICATION TRACK</span><strong>Associate Offensive Security Operator</strong></div></div><div className="summary-progress"><span>TRACK PROGRESS</span><div><i style={{width:'41%'}}/></div><strong>41%</strong></div><div className="cert-meta"><span>EST. COMPLETION</span><strong>14 HOURS</strong></div></div>
    <div className="filter-row"><span>PATHWAYS // 04</span><div><button className="active">All tracks</button><button>In progress</button><button>Completed</button></div></div>
    <div className="module-list">{modules.map((m, index) => { const Icon=m.icon; return <button key={m.id} className={`module-card ${m.status}`} onClick={() => m.status !== 'locked' && selectModule(m)}>
      <div className="module-index">0{index+1}</div><div className="module-icon" style={{'--accent':m.accent}}><Icon size={25}/></div><div className="module-copy"><span>{m.code} // {m.status.toUpperCase()}</span><h3>{m.title}</h3><p>{m.description}</p><div className="module-tags"><em><BookOpen size={13}/>{m.lessons} lessons</em><em><Clock3 size={13}/>{m.time}</em></div></div>
      <div className="module-progress">{m.status === 'locked' ? <LockKeyhole size={20}/> : <><Ring value={m.progress} size={62}/><span>{m.progress === 100 ? 'MASTERED' : m.progress ? 'IN PROGRESS' : 'BEGIN'}</span></>} </div><ChevronRight className="module-arrow" size={20}/>
    </button>})}</div>
  </div>
}

function LabsPage({ launchMission, completedMissions = [] }) {
  return <div className="page labs-page">
    <div className="range-banner"><div className="range-radar"><Radar size={38}/><i/><i/><i/></div><div><span className="section-code"><i/> PHASE 3 RANGE ENGINE</span><h2>Lab Range</h2><p>Disposable targets. Root operator shell. Hard containment.</p></div><div className="range-details"><div><span>LIVE SCENARIOS</span><strong>01 / 03</strong></div><div><span>ENGINE</span><strong>DOCKER + SIM</strong></div><div><span>BOUNDARY</span><strong>SEALED</strong></div></div></div>
    <RangeEngineCard/>
    <div className="section-title"><div><span>CURATED OPERATIONS</span><h3>Available missions</h3></div><button><SlidersIcon/> Filter</button></div>
    <div className="mission-grid">{missions.map((m,i)=>{ const Icon=m.icon, cleared=completedMissions.includes(m.id); return <article className={`mission-card mission-${i} ${cleared?'cleared':''}`} key={m.id}><div className="mission-top"><span>{m.difficulty}</span><div><Icon size={28}/></div></div><div className="mission-code">MISSION // 00{i+7}</div><PhaseBadge complete={cleared} live={i===0}/><h3>{m.title}</h3><p>{m.brief}</p><div className="mission-tags">{m.tags.map(t=><span key={t}>{t}</span>)}</div><div className="mission-bottom"><div><span><Clock3 size={14}/>{m.time}</span><span><Zap size={14}/>{m.xp} XP</span></div><button onClick={()=>launchMission(m)}>{cleared?'Replay mission':'View brief'} <ArrowRight size={15}/></button></div></article>})}</div>
    <div className="range-protocol"><Shield size={25}/><div><strong>Range protocol is enforced.</strong><p>All exercises use synthetic evidence and intentionally vulnerable training systems. Activity outside the declared lab boundary is never part of an Academy mission.</p></div><span>ROE // ACTIVE</span></div>
  </div>
}

function SlidersIcon(){return <Gauge size={15}/>}

function DrillsPage({ startQuiz }) {
  const drills = [
    { title:'Protocol Recognition', desc:'Identify protocols and services from minimal evidence.', time:'05:00', score:'880', icon:Network },
    { title:'Request Anatomy', desc:'Locate high-signal details inside captured HTTP exchanges.', time:'08:00', score:'740', icon:Braces },
    { title:'Evidence Triage', desc:'Separate actionable artifacts from environmental noise.', time:'10:00', score:'—', icon:Database },
    { title:'Finding Quality', desc:'Choose the clearest impact statement and remediation path.', time:'06:00', score:'920', icon:Award },
  ]
  return <div className="page drills-page"><div className="drill-hero"><div><span className="section-code">TIME-BOXED SKILL CONDITIONING</span><h2>Pressure makes<br/><em>patterns visible.</em></h2><p>Short, repeatable exercises built for accuracy first and speed second.</p><button className="primary" onClick={startQuiz}><Swords size={17}/> Launch daily gauntlet</button></div><div className="score-orbit"><div><small>READINESS</small><strong>84</strong><span>ELITE TRAJECTORY</span></div></div></div>
    <div className="drill-stats"><div><span>GLOBAL PERCENTILE</span><strong>TOP 12%</strong><BarChart3/></div><div><span>AVERAGE ACCURACY</span><strong>87.4%</strong><Target/></div><div><span>BEST COMBO</span><strong>16</strong><Flame/></div><div><span>SEASON RANK</span><strong>#1,204</strong><Trophy/></div></div>
    <div className="section-title"><div><span>DRILL LIBRARY</span><h3>Sharpen a specific skill</h3></div></div>
    <div className="drill-list">{drills.map((d,i)=>{const Icon=d.icon;return <button key={d.title} onClick={startQuiz}><span className="drill-num">0{i+1}</span><div className="drill-icon"><Icon size={20}/></div><div><strong>{d.title}</strong><p>{d.desc}</p></div><span><Clock3 size={13}/>{d.time}</span><span>PB // {d.score}</span><Play size={17}/></button>})}</div>
  </div>
}

function IntelPage() {
  return <div className="page intel-page"><div className="page-intro"><div><span className="section-code">OPERATOR KNOWLEDGE BASE</span><h2>Field intelligence,<br/><em>distilled.</em></h2></div><p>Durable mental models and practical standards. Built to be used mid-operation, not admired in a library.</p></div>
    <div className="intel-feature"><div className="intel-glyph"><Layers3 size={48}/><span>DC<br/>026</span></div><div><span>FEATURED PLAYBOOK // UPDATED</span><h3>The disciplined operator’s reconnaissance loop</h3><p>A clear framework for moving from scope to observation, hypothesis, validation, and evidence—without losing control of the assessment.</p><button className="ghost">Read playbook <ArrowRight size={15}/></button></div><div className="intel-index"><span>READ TIME</span><strong>14 MIN</strong><span>DIFFICULTY</span><strong>FOUNDATIONAL</strong></div></div>
    <div className="intel-grid">{intel.map((item,i)=><article key={item.title}><div className="intel-card-top"><span>{item.type} // 00{i+1}</span><BookOpen size={18}/></div><h3>{item.title}</h3><p>{item.desc}</p><footer><span><Clock3 size={13}/>{item.read}</span><button>Open <ChevronRight size={14}/></button></footer></article>)}</div>
  </div>
}

function ModuleDetail({ module, onBack, startQuiz, startLesson }) {
  const Icon=module.icon
  const lessons = ['Orientation & rules of engagement','Building a network hypothesis','Reading a host inventory','Packet capture fundamentals','Ports, protocols & services','Service fingerprinting','Evidence quality checkpoint','Reconnaissance field assessment']
  return <div className="page detail-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/> All pathways</button><div className="detail-hero"><div className="detail-icon"><Icon size={38}/></div><div><span>{module.code} // PATHWAY</span><h2>{module.title}</h2><p>{module.description}</p><div className="module-tags"><em><BookOpen size={13}/>{module.lessons} lessons</em><em><Clock3 size={13}/>{module.time}</em><em><Zap size={13}/>2,400 XP</em></div></div><div className="detail-progress"><Ring value={module.progress} size={90} stroke={5}/><span>PATHWAY PROGRESS</span></div></div>
    <div className="detail-layout"><section><div className="section-title"><div><span>CURRICULUM</span><h3>Operational sequence</h3></div></div><div className="lesson-list">{lessons.map((l,i)=>{const complete=i<4, active=i===5; return <button key={l} className={active?'active':''} onClick={()=>active&&startLesson({title:l,module:module.title})}><span>{complete?<Check size={14}/>:String(i+1).padStart(2,'0')}</span><div><small>{i===6?'KNOWLEDGE CHECK':i===7?'FIELD ASSESSMENT':'LESSON'} // {i<5?'COMPLETE':active?'CURRENT':'QUEUED'}</small><strong>{l}</strong></div><em>{i===6?'12 Q':i===7?'35 MIN':`${12+i} MIN`}</em>{active?<Play size={16} fill="currentColor"/>:<ChevronRight size={16}/>}</button>})}</div></section><aside className="path-aside"><div className="mentor-card"><div className="mentor-avatar"><UserRound/></div><span>PATHWAY MENTOR</span><h3>MARA // RED CELL</h3><p>“Don’t collect data. Collect answers. Every action should reduce uncertainty.”</p></div><button className="primary full" onClick={()=>startLesson({title:'Service Fingerprinting',module:module.title})}><Play size={16}/> Resume current lesson</button><button className="ghost full" onClick={startQuiz}><Target size={16}/> Run knowledge check</button><div className="unlock-card"><LockKeyhole size={20}/><div><span>NEXT UNLOCK</span><strong>Host Enumeration</strong><small>Complete this pathway</small></div></div></aside></div>
  </div>
}

function MissionModal({ mission, onClose, onLaunch }) {
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="mission-modal"><button className="modal-close" onClick={onClose}><X size={18}/></button><span className="section-code"><i/> AUTHORIZED TRAINING MISSION</span><div className="modal-code">DC // RANGE // {mission.id.toUpperCase()}</div><h2>{mission.title}</h2><p className="modal-brief">{mission.brief}</p><div className="brief-grid"><div><span>DIFFICULTY</span><strong>{mission.difficulty}</strong></div><div><span>TIMEBOX</span><strong>{mission.time}</strong></div><div><span>REWARD</span><strong>{mission.xp} XP</strong></div></div><h4>MISSION OBJECTIVES</h4><ol>{mission.objectives.map((o,i)=><li key={o}><span>0{i+1}</span>{o}</li>)}</ol><div className="authorization"><ShieldCheck size={21}/><p><strong>Authorization confirmed.</strong> This simulation is restricted to Academy-provided evidence and isolated targets.</p></div><button className="primary full" onClick={onLaunch}><Play size={16} fill="currentColor"/> Initialize simulation</button></div></div>
}

function QuizModal({ onClose, onComplete }) {
  const [step,setStep]=useState(0), [answers,setAnswers]=useState([]), [finished,setFinished]=useState(false)
  const question=quizQuestions[step]
  const choose=(i)=>{ if(answers[step]!==undefined)return; const next=[...answers];next[step]=i;setAnswers(next) }
  const next=()=>{ if(step<quizQuestions.length-1)setStep(step+1);else setFinished(true) }
  const score=answers.filter((a,i)=>a===quizQuestions[i].answer).length
  if(finished) return <div className="modal-backdrop"><div className="quiz-modal result"><div className="result-mark"><Award size={45}/></div><span>DRILL COMPLETE</span><h2>{score===3?'Flawless execution.':score===2?'Strong signal.':'Recalibrate and repeat.'}</h2><div className="result-score"><strong>{score}/{quizQuestions.length}</strong><span>ACCURACY // {Math.round(score/3*100)}%</span></div><p>{score===3?'Precise, controlled, and evidence-led. That is the standard.':'Review the reasoning, then run it again. Mastery is built through clean repetition.'}</p><button className="primary full" onClick={()=>{onComplete(score);onClose()}}>Log results <ArrowRight size={16}/></button></div></div>
  return <div className="modal-backdrop"><div className="quiz-modal"><button className="modal-close" onClick={onClose}><X size={18}/></button><div className="quiz-head"><span>DAILY GAUNTLET</span><strong>0{step+1} / 0{quizQuestions.length}</strong></div><div className="quiz-progress"><i style={{width:`${(step+1)/quizQuestions.length*100}%`}}/></div><span className="question-type">OPERATIONAL JUDGMENT</span><h2>{question.q}</h2><div className="answers">{question.options.map((o,i)=>{const selected=answers[step]===i, correct=question.answer===i&&answers[step]!==undefined, wrong=selected&&!correct;return <button key={o} className={`${selected?'selected':''} ${correct?'correct':''} ${wrong?'wrong':''}`} onClick={()=>choose(i)}><span>{String.fromCharCode(65+i)}</span>{o}{(correct||wrong)&&<em>{correct?<Check size={16}/>:<X size={16}/>}</em>}</button>})}</div><button className="primary quiz-next" disabled={answers[step]===undefined} onClick={next}>{step===quizQuestions.length-1?'Finish drill':'Next question'} <ArrowRight size={16}/></button></div></div>
}

function Toast({ message }) { return <div className="toast"><div><Check size={16}/></div>{message}</div> }

export default function App() {
  const [page,setPage]=useState('command'), [collapsed,setCollapsed]=useState(false), [module,setModule]=useState(null), [mission,setMission]=useState(null), [activeMission,setActiveMission]=useState(null), [lesson,setLesson]=useState(null), [quiz,setQuiz]=useState(false), [toast,setToast]=useState('')
  const [profile,setProfile]=usePersistentState('daemoncore-profile',initialProfile)
  const [search,setSearch]=useState('')
  const operator={...initialProfile,...profile,completedMissions:profile.completedMissions||[],completedLessons:profile.completedLessons||[],achievements:profile.achievements||[]}
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(t)},[toast])
  const title=module?module.title:nav.find(n=>n.id===page)?.label||'Command'
  const completeQuiz=(score)=>{setProfile(p=>{const base={...initialProfile,...p},awards=new Set(base.achievements||[]);if(score===3)awards.add('clean-sweep');const xp=base.xp+score*120;return {...base,xp,level:Math.max(base.level,Math.floor(xp/1000)+3),completed:base.completed+1,phase2Xp:(base.phase2Xp||0)+score*120,achievements:[...awards]}});setToast(`Drill logged // +${score*120} XP`)}
  const completeMission=({mission:cleared,score,hints})=>{setProfile(p=>{const base={...initialProfile,...p},missionsDone=new Set(base.completedMissions||[]),awards=new Set(base.achievements||[]),first=!missionsDone.has(cleared.id),earned=first?score:Math.round(score*.2);missionsDone.add(cleared.id);awards.add('first-signal');if(hints===0)awards.add('evidence-led');if(missionsDone.size===missions.length)awards.add('range-veteran');const xp=base.xp+earned;return {...base,xp,level:Math.max(base.level,Math.floor(xp/1000)+3),phase2Xp:(base.phase2Xp||0)+earned,completedMissions:[...missionsDone],achievements:[...awards]}});setActiveMission(null);setPage('labs');setToast(`Mission recorded // +${score} XP`)}
  const completeLesson=completedLesson=>{setProfile(p=>{const base={...initialProfile,...p},lessons=new Set(base.completedLessons||[]),awards=new Set(base.achievements||[]),first=!lessons.has(completedLesson.title),earned=first?180:0;lessons.add(completedLesson.title);awards.add('scholar');const xp=base.xp+earned;return {...base,xp,level:Math.max(base.level,Math.floor(xp/1000)+3),phase2Xp:(base.phase2Xp||0)+earned,completedLessons:[...lessons],achievements:[...awards]}});setLesson(null);setToast('Lesson mastered // +180 XP')}
  if(activeMission)return <LabSimulation mission={activeMission} onExit={()=>setActiveMission(null)} onComplete={completeMission}/>
  if(lesson)return <LessonPlayer lesson={lesson} onExit={()=>setLesson(null)} onComplete={completeLesson}/>
  let current
  if(module)current=<ModuleDetail module={module} onBack={()=>setModule(null)} startQuiz={()=>setQuiz(true)} startLesson={setLesson}/>
  else if(page==='command')current=<CommandPage setPage={setPage} profile={operator}/>
  else if(page==='academy')current=<AcademyPage selectModule={setModule}/>
  else if(page==='labs')current=<LabsPage launchMission={setMission} completedMissions={operator.completedMissions}/>
  else if(page==='drills')current=<DrillsPage startQuiz={()=>setQuiz(true)}/>
  else if(page==='operator')current=<OperatorPage profile={operator}/>
  else current=<IntelPage/>
  return <div className="app-shell"><Sidebar page={page} setPage={p=>{setPage(p);setModule(null)}} collapsed={collapsed} setCollapsed={setCollapsed}/><main><Topbar title={title} onSearch={setSearch}/>{search&&<div className="search-notice">Searching for “{search}” across Academy intelligence…</div>}{current}<footer className="app-footer"><span>DAEMONCORE ACADEMY // PHASE 3 // BUILD 0.3.0</span><span><i/> SEALED RANGE ARCHITECTURE</span><span>UNRESTRICTED INSIDE</span></footer></main>{mission&&<MissionModal mission={mission} onClose={()=>setMission(null)} onLaunch={()=>{setActiveMission(mission);setMission(null)}}/>}{quiz&&<QuizModal onClose={()=>setQuiz(false)} onComplete={completeQuiz}/>} {toast&&<Toast message={toast}/>}</div>
}
