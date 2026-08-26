import { useEffect, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, Award, BookOpen, Check,
  CheckCircle2, ChevronRight, Clock3, Code2, Copy, Crosshair, Database,
  FileText, Flag, Flame, Gauge, HardDrive, Hexagon, KeyRound, Layers3,
  LockKeyhole, Network, Radar, RotateCcw, Search, ShieldCheck, Sparkles,
  Target, Terminal, Trophy, UserRound, X, Zap,
} from 'lucide-react'

const scenarioData = {
  'ghost-port': {
    target: '10.40.7.23', subnet: '10.40.7.0/24', classification: 'DC-LAB // CONTROLLED',
    intro: 'You are attached to a scheduled internal service audit. The approved host inventory and a synthetic observation console are available. Find the undocumented exposure and report only what the evidence supports.',
    commands: [
      { command: 'inventory', label: 'Review host inventory', output: ['AUTHORIZED ASSET INVENTORY // REV 8', '10.40.7.11  dc-auth-01    22/tcp, 443/tcp', '10.40.7.23  dc-archive-02 22/tcp, 445/tcp', '10.40.7.31  dc-mon-01     443/tcp'], objective: 0, evidence: 'Asset inventory REV 8 lists only 22/tcp and 445/tcp for dc-archive-02.' },
      { command: 'scan 10.40.7.23', label: 'Observe approved target', output: ['CONTROLLED OBSERVATION // 10.40.7.23', '22/tcp    open   ssh       OpenSSH 9.3', '445/tcp   open   smb       Samba 4.18', '8088/tcp  open   unknown   HTTP-like response'], objective: 1, evidence: 'Port 8088/tcp is observable but absent from the approved inventory.' },
      { command: 'inspect 10.40.7.23:8088', label: 'Inspect anomalous listener', output: ['SERVICE OBSERVATION // 10.40.7.23:8088', 'Protocol: HTTP/1.1', 'Server: Archive Console/0.8-training', 'Access: unauthenticated status endpoint', 'Boundary: synthetic lab response'], objective: 2, evidence: 'Undocumented Archive Console 0.8-training responds without authentication on 8088/tcp.' },
      { command: 'submit undocumented archive console on 8088', label: 'Submit evidence-backed finding', output: ['FINDING ACCEPTED', 'Signal quality: HIGH', 'Scope adherence: VERIFIED', 'Mission objectives satisfied.'], objective: 3 },
    ],
    hint: 'Start by comparing the authorized inventory with what is actually observable. Type inventory.',
  },
  'broken-trust': {
    target: 'portal.dc-lab.local', subnet: 'APPLICATION SIMULATION', classification: 'DC-LAB // CONTROLLED',
    intro: 'The training portal crosses a trust boundary incorrectly. Work from supplied captures and synthetic session data; no live requests leave the Academy environment.',
    commands: [
      { command: 'flow', label: 'Map authentication flow', output: ['AUTH FLOW // SYNTHETIC', '1. POST /login -> session issued', '2. GET /profile -> session validated', '3. GET /export?account= -> account parameter trusted'], objective: 0, evidence: 'Export flow accepts an account parameter after authentication.' },
      { command: 'requests', label: 'Review supplied captures', output: ['CAPTURE 031 // GET /export?account=VX-104', 'Cookie: dc_session=TRAINING_REDACTED', 'Response: 200 // account VX-104', '', 'CAPTURE 032 // GET /export?account=VX-207', 'Cookie: dc_session=TRAINING_REDACTED', 'Response: 200 // account VX-207'], objective: 1, evidence: 'The same synthetic session receives exports for two different account identifiers.' },
      { command: 'session', label: 'Test trust assumption', output: ['TRUST ANALYSIS', 'Authentication: present', 'Object authorization: absent in supplied flow', 'User-controlled account parameter crosses boundary unchecked'], objective: 2, evidence: 'Object-level authorization is absent after session validation.' },
      { command: 'submit missing object authorization', label: 'Submit design flaw', output: ['FINDING ACCEPTED', 'Category: broken object-level authorization', 'Scope adherence: VERIFIED', 'Mission objectives satisfied.'], objective: 3 },
    ],
    hint: 'Authentication and authorization answer different questions. Type flow to map where each decision occurs.',
  },
  'night-shift': {
    target: 'DC-ENDPOINT-17', subnet: 'EVIDENCE PACK 17-A', classification: 'DC-LAB // CONTROLLED',
    intro: 'A synthetic endpoint evidence pack contains benign activity and one suspicious sequence. Validate integrity, build a timeline, and report the strongest hypothesis.',
    commands: [
      { command: 'manifest', label: 'Validate evidence manifest', output: ['MANIFEST 17-A', 'events.json      SHA256 VERIFIED', 'processes.csv    SHA256 VERIFIED', 'network.pcap     SHA256 VERIFIED', 'Collection window: 22:00—23:00Z'], objective: 0, evidence: 'All three evidence artifacts match the supplied manifest.' },
      { command: 'timeline', label: 'Build event timeline', output: ['22:14:02  updater.exe scheduled task', '22:31:44  powershell.exe spawned by updater.exe', '22:31:49  archive created in temp', '22:32:10  outbound connection to synthetic sink', '22:47:00  backup agent routine heartbeat'], objective: 1, evidence: 'Updater spawns a shell, creates an archive, then connects to the synthetic sink within 26 seconds.' },
      { command: 'triage', label: 'Separate signal from noise', output: ['TRIAGE RESULT', 'Routine: scheduled task, backup heartbeat', 'High signal: unusual parent-child process, archive creation, immediate outbound connection', 'Confidence: 0.91'], objective: 2, evidence: 'The 22:31 sequence is temporally linked and inconsistent with the updater baseline.' },
      { command: 'submit suspicious updater sequence', label: 'Submit incident hypothesis', output: ['HYPOTHESIS ACCEPTED', 'Evidence chain: COHERENT', 'Scope adherence: VERIFIED', 'Mission objectives satisfied.'], objective: 3 },
    ],
    hint: 'Evidence integrity comes before interpretation. Type manifest.',
  },
}

const lessonLibrary = {
  default: {
    duration: '16 MIN', designation: 'TACTICAL LESSON',
    sections: [
      { title: 'The operating principle', body: 'A professional assessment is a sequence of questions. Tools produce observations; operators turn those observations into supported conclusions.' },
      { title: 'Work from a hypothesis', body: 'Before taking an action, state what you expect to learn. Prefer the smallest authorized action that can confirm or reject the hypothesis.' },
      { title: 'Preserve the evidence chain', body: 'Record the asset, time, observation, and interpretation separately. This prevents assumptions from quietly becoming facts.' },
    ],
    check: { q: 'What makes an assessment action high quality?', options: ['It uses an advanced tool', 'It reduces uncertainty inside the authorized scope', 'It produces the most output', 'It completes quickly'], answer: 1 },
  },
  'Service Fingerprinting': {
    duration: '18 MIN', designation: 'NET-02 // LESSON 06',
    sections: [
      { title: 'A port is not a service', body: 'Port numbers are conventions, not proof. Treat an open port as an observation and the service identity as a hypothesis that needs corroboration.' },
      { title: 'Triangulate carefully', body: 'Compare protocol behavior, supplied metadata, and environmental context. A banner is useful evidence, but it can be incomplete or intentionally misleading.' },
      { title: 'Report confidence', body: 'Separate what was directly observed from what was inferred. Strong notes communicate both the likely service and the confidence behind that conclusion.' },
    ],
    check: { q: 'An open port 443 most directly proves which statement?', options: ['The host runs HTTPS', 'The host is vulnerable', 'A TCP listener accepted a connection on port 443', 'The service is a web server'], answer: 2 },
  },
}

const achievements = [
  { id: 'first-signal', title: 'First Signal', desc: 'Complete a controlled field mission.', icon: Radar },
  { id: 'evidence-led', title: 'Evidence Led', desc: 'Complete a mission without using a hint.', icon: Search },
  { id: 'clean-sweep', title: 'Clean Sweep', desc: 'Earn full accuracy on a knowledge drill.', icon: Target },
  { id: 'scholar', title: 'Field Scholar', desc: 'Complete your first tactical lesson.', icon: BookOpen },
  { id: 'range-veteran', title: 'Range Veteran', desc: 'Complete all Phase 2 lab missions.', icon: Trophy },
  { id: 'night-operator', title: 'Night Operator', desc: 'Maintain a 14-day training streak.', icon: Flame },
]

function TerminalLine({ item }) {
  if (item.type === 'command') return <div className="terminal-command"><span>vector@dc-range</span><em>›</em>{item.text}</div>
  return <div className={item.type === 'system' ? 'terminal-system' : 'terminal-output'}>{item.lines.map((line, i) => <div key={`${line}-${i}`}>{line || '\u00a0'}</div>)}</div>
}

export function LabSimulation({ mission, onExit, onComplete }) {
  const scenario = scenarioData[mission.id]
  const [history, setHistory] = useState([
    { type: 'system', lines: ['DAEMONCORE RANGE CONSOLE // PHASE 2', scenario.classification, '', scenario.intro, '', 'Type help to view authorized simulation commands.'] },
  ])
  const [input, setInput] = useState('')
  const [done, setDone] = useState([])
  const [evidence, setEvidence] = useState([])
  const [hints, setHints] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [report, setReport] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => { const timer = setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(timer) }, [])
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [history])

  const push = (...items) => setHistory(h => [...h, ...items])
  const run = (raw) => {
    const command = raw.trim().toLowerCase()
    if (!command) return
    setInput('')
    if (command === 'clear') { setHistory([]); return }
    if (command === 'help') {
      push({ type: 'command', text: raw }, { type: 'output', lines: ['AUTHORIZED COMMANDS', ...scenario.commands.map(c => `  ${c.command.padEnd(42)} ${c.label}`), '  hint                                       Request guided assistance', '  evidence                                   Review collected evidence', '  clear                                      Clear console output'] })
      return
    }
    if (command === 'hint') {
      setHints(h => h + 1)
      push({ type: 'command', text: raw }, { type: 'system', lines: [`GUIDANCE // ${scenario.hint}`] })
      return
    }
    if (command === 'evidence') {
      push({ type: 'command', text: raw }, { type: 'output', lines: evidence.length ? ['EVIDENCE LOCKER', ...evidence.map((e, i) => `E-${String(i + 1).padStart(2, '0')}  ${e}`)] : ['EVIDENCE LOCKER // EMPTY'] })
      return
    }
    const matched = scenario.commands.find(c => command === c.command)
    if (!matched) {
      push({ type: 'command', text: raw }, { type: 'system', lines: ['COMMAND NOT AVAILABLE IN THIS SIMULATION.', 'Type help to review authorized actions.'] })
      return
    }
    push({ type: 'command', text: raw }, { type: 'output', lines: matched.output })
    if (!done.includes(matched.objective)) setDone(d => [...d, matched.objective])
    if (matched.evidence && !evidence.includes(matched.evidence)) setEvidence(e => [...e, matched.evidence])
    if (matched.objective === 3) setTimeout(() => setReport(true), 650)
  }
  const score = Math.max(250, mission.xp - hints * 75 - Math.floor(seconds / 60) * 10)
  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (report) return <div className="simulation-shell completion-screen">
    <div className="completion-grid" />
    <div className="completion-core"><div className="completion-seal"><ShieldCheck size={46}/></div><span>MISSION COMPLETE // EVIDENCE ACCEPTED</span><h1>{mission.title}</h1><p>You maintained the declared boundary and converted observations into a defensible conclusion.</p><div className="completion-score"><div><small>OPERATION SCORE</small><strong>{score}</strong></div><div><small>OBJECTIVES</small><strong>4 / 4</strong></div><div><small>GUIDANCE USED</small><strong>{hints}</strong></div><div><small>ELAPSED</small><strong>{formatTime(seconds)}</strong></div></div><div className="earned-xp"><Zap size={18}/> +{score} EXPERIENCE LOGGED</div><button className="sim-primary" onClick={() => onComplete({ mission, score, hints, seconds })}>Return to range <ArrowRight size={16}/></button></div>
  </div>

  return <div className="simulation-shell">
    <header className="simulation-header"><div><button onClick={onExit}><ArrowLeft size={16}/></button><div className="sim-brand"><Hexagon size={26}/><i/></div><div><span>DAEMONCORE // LIVE RANGE</span><strong>{mission.title}</strong></div></div><div className="sim-telemetry"><span><i/> ISOLATED</span><span><Clock3 size={13}/>{formatTime(seconds)}</span><span>MISSION // {mission.id.toUpperCase()}</span><button onClick={onExit}>ABORT SIMULATION</button></div></header>
    <div className="simulation-body">
      <section className="sim-console"><div className="console-toolbar"><div><span/><span/><span/></div><strong>DC_RANGE_CONSOLE</strong><span>SESSION ENCRYPTED // LOCAL</span></div><div className="terminal-history" ref={scrollRef}>{history.map((item, i) => <TerminalLine key={i} item={item}/>)}</div><form className="terminal-input" onSubmit={e => { e.preventDefault(); run(input) }}><span>vector@dc-range</span><em>›</em><input autoFocus value={input} onChange={e => setInput(e.target.value)} spellCheck="false" autoComplete="off" placeholder="enter an authorized simulation command"/><button>EXECUTE</button></form></section>
      <aside className="sim-sidebar"><div className="sim-target"><span>TARGET CONTEXT</span><div><Crosshair size={19}/><strong>{scenario.target}</strong></div><small>{scenario.subnet}</small></div><div className="objective-panel"><div className="sim-panel-title"><Flag size={14}/><span>MISSION OBJECTIVES</span><strong>{done.length}/4</strong></div>{mission.objectives.map((objective, i) => <div className={`sim-objective ${done.includes(i) ? 'done' : ''}`} key={objective}><span>{done.includes(i) ? <Check size={12}/> : `0${i + 1}`}</span><p>{objective}</p></div>)}</div><div className="evidence-panel"><div className="sim-panel-title"><FileText size={14}/><span>EVIDENCE LOCKER</span><strong>{evidence.length}</strong></div>{evidence.length ? evidence.map((item, i) => <div className="evidence-item" key={item}><span>E-{String(i + 1).padStart(2, '0')}</span><p>{item}</p></div>) : <div className="empty-evidence"><Database size={20}/><p>No evidence collected</p></div>}</div><button className="hint-button" onClick={() => run('hint')}><Sparkles size={15}/> Request guidance <span>-75 PTS</span></button></aside>
    </div>
  </div>
}

export function LessonPlayer({ lesson, onExit, onComplete }) {
  const lessonKey = Object.keys(lessonLibrary).find(key => key.toLowerCase() === lesson.title.toLowerCase())
  const content = lessonLibrary[lessonKey] || lessonLibrary.default
  const [section, setSection] = useState(0)
  const [selected, setSelected] = useState(null)
  const [complete, setComplete] = useState(false)
  const atCheck = section === content.sections.length
  const correct = selected === content.check.answer
  const next = () => {
    if (section < content.sections.length) { setSection(s => s + 1); window.scrollTo(0, 0) }
    else if (correct) setComplete(true)
  }

  return <div className="lesson-overlay"><aside className="lesson-rail"><div className="lesson-brand"><Hexagon/><span>DC // ACADEMY</span></div><button onClick={onExit}><ArrowLeft size={15}/> Exit lesson</button><div className="lesson-designation"><span>{content.designation}</span><h3>{lesson.title}</h3><small>{content.duration} // +180 XP</small></div><nav>{content.sections.map((s, i) => <button key={s.title} className={`${section === i ? 'active' : ''} ${section > i ? 'complete' : ''}`} onClick={() => !complete && setSection(i)}><span>{section > i ? <Check size={11}/> : `0${i + 1}`}</span><div><small>SECTION</small><strong>{s.title}</strong></div></button>)}<button className={`${atCheck ? 'active' : ''} ${complete ? 'complete' : ''}`} onClick={() => setSection(content.sections.length)}><span>{complete ? <Check size={11}/> : '04'}</span><div><small>VALIDATION</small><strong>Knowledge check</strong></div></button></nav><div className="lesson-rail-progress"><span>LESSON PROGRESS</span><div><i style={{ width: `${Math.min(100, section / content.sections.length * 100)}%` }}/></div><strong>{Math.round(Math.min(100, section / content.sections.length * 100))}%</strong></div></aside>
    <main className="lesson-content"><header><span>TACTICAL INSTRUCTION // PHASE 2</span><div><Clock3 size={14}/> {content.duration}</div></header>{!atCheck ? <article><div className="lesson-kicker">SECTION // 0{section + 1}</div><h1>{content.sections[section].title}</h1><p className="lesson-lead">{content.sections[section].body}</p><div className="lesson-diagram"><div className="diagram-node"><span>OBSERVE</span><small>What is directly visible?</small></div><ArrowRight/><div className="diagram-node active"><span>HYPOTHESIZE</span><small>What might explain it?</small></div><ArrowRight/><div className="diagram-node"><span>VALIDATE</span><small>What is the smallest safe test?</small></div><ArrowRight/><div className="diagram-node"><span>DOCUMENT</span><small>What does the evidence support?</small></div></div><div className="operator-note"><div><UserRound/></div><div><span>OPERATOR NOTE</span><p>Precision is not moving slowly. It is refusing to take an action that cannot teach you something.</p></div></div><button className="lesson-next" onClick={next}>{section === content.sections.length - 1 ? 'Take knowledge check' : 'Continue lesson'} <ArrowRight size={16}/></button></article> : <article className="lesson-check">{complete ? <div className="lesson-complete"><div><Award size={44}/></div><span>LESSON MASTERED</span><h1>Signal retained.</h1><p>Your result has been written to the operator record.</p><div><strong>+180 XP</strong><small>KNOWLEDGE VALIDATED</small></div><button className="lesson-next" onClick={() => onComplete(lesson)}>Return to pathway <ArrowRight size={16}/></button></div> : <><div className="lesson-kicker">KNOWLEDGE VALIDATION</div><h1>{content.check.q}</h1><div className="lesson-options">{content.check.options.map((option, i) => <button key={option} className={`${selected === i ? 'selected' : ''} ${selected !== null && i === content.check.answer ? 'correct' : ''} ${selected === i && !correct ? 'wrong' : ''}`} onClick={() => setSelected(i)}><span>{String.fromCharCode(65 + i)}</span>{option}{selected !== null && i === content.check.answer && <Check size={16}/>}</button>)}</div>{selected !== null && <div className={`answer-rationale ${correct ? 'correct' : ''}`}>{correct ? <CheckCircle2/> : <AlertTriangle/>}<div><strong>{correct ? 'Correct signal.' : 'Recalibrate.'}</strong><p>{correct ? 'The value of an action is the uncertainty it removes while remaining inside authorization.' : 'Tool sophistication and output volume do not make an action useful. Focus on the question it answers.'}</p></div></div>}<button className="lesson-next" disabled={!correct} onClick={next}>Complete lesson <ArrowRight size={16}/></button></>}</article>}</main>
  </div>
}

export function OperatorPage({ profile }) {
  const unlocked = new Set(profile.achievements || [])
  const nextLevel = 5000
  const levelProgress = Math.min(100, Math.round((profile.xp % nextLevel) / nextLevel * 100))
  return <div className="page operator-page"><section className="operator-hero"><div className="operator-grid"/><div className="large-avatar"><span>VX</span><i/></div><div className="operator-identity"><span>OPERATOR RECORD // VERIFIED</span><h2>VECTOR</h2><p>ASSOCIATE OFFENSIVE SECURITY OPERATOR</p><div><span><i/> ACTIVE STATUS</span><span>COHORT // RED-07</span><span>JOINED // 2026</span></div></div><div className="operator-level"><span>CURRENT CLEARANCE</span><strong>LEVEL {String(profile.level).padStart(2, '0')}</strong><div><i style={{ width: `${levelProgress}%` }}/></div><small>{profile.xp.toLocaleString()} TOTAL XP // {levelProgress}% TO NEXT LEVEL</small></div></section>
    <section className="operator-metrics"><div><Zap/><span>TOTAL EXPERIENCE</span><strong>{profile.xp.toLocaleString()}</strong><small>+{profile.phase2Xp || 0} IN PHASE 2</small></div><div><Crosshair/><span>MISSIONS CLEARED</span><strong>{(profile.completedMissions || []).length}</strong><small>{3 - (profile.completedMissions || []).length} REMAINING IN RANGE</small></div><div><BookOpen/><span>LESSONS MASTERED</span><strong>{(profile.completedLessons || []).length}</strong><small>ACADEMY RECORD</small></div><div><Flame/><span>ACTIVE STREAK</span><strong>{profile.streak} DAYS</strong><small>PERSONAL BEST // 19</small></div></section>
    <div className="operator-layout"><section><div className="operator-section-head"><div><span>OPERATOR DECORATIONS</span><h3>Achievements</h3></div><strong>{unlocked.size} / {achievements.length}</strong></div><div className="achievement-grid">{achievements.map(({ id, title, desc, icon: Icon }) => <article className={unlocked.has(id) ? 'unlocked' : ''} key={id}><div><Icon size={23}/>{unlocked.has(id) ? <Check size={11}/> : <LockKeyhole size={11}/>}</div><span>{unlocked.has(id) ? 'ACQUIRED' : 'LOCKED'}</span><h4>{title}</h4><p>{desc}</p></article>)}</div></section><aside><div className="readiness-card"><div className="readiness-ring"><strong>{Math.min(99, 72 + unlocked.size * 3)}</strong><span>READINESS</span></div><h3>Operational trajectory</h3><p>Your strongest signal is evidence discipline. Continue field simulations to improve time-boxed decision making.</p><div><span>RECONNAISSANCE</span><strong>88</strong></div><div><span>ANALYSIS</span><strong>81</strong></div><div><span>REPORTING</span><strong>76</strong></div></div><div className="clearance-card"><ShieldCheck/><div><span>CURRENT CERTIFICATION</span><strong>ASOS // IN PROGRESS</strong><small>41% TRACK COMPLETION</small></div></div></aside></div>
  </div>
}

export function PhaseBadge({ complete }) {
  return complete ? <span className="phase-cleared"><Check size={11}/> CLEARED</span> : <span className="phase-live"><Activity size={11}/> PHASE 2 LIVE</span>
}
