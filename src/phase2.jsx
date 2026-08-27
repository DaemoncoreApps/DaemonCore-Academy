import { useEffect, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, Award, BookOpen, Check,
  CheckCircle2, ChevronRight, Clock3, Code2, Copy, Crosshair, Database,
  FileText, Flag, Flame, Gauge, HardDrive, Hexagon, KeyRound, Layers3,
  LockKeyhole, Network, Radar, RotateCcw, Search, ShieldCheck, Sparkles,
  Target, Terminal, Trophy, UserRound, X, Zap,
} from 'lucide-react'
import { course } from './content.js'
import { InteractiveWorkbench } from './InteractiveWorkbench.jsx'

const scenarioData = {
  'ghost-port': {
    target: '10.40.7.23', subnet: '10.40.7.0/24', classification: 'DC-LAB // CONTROLLED',
    intro: 'You are attached to a scheduled internal service audit. The approved host inventory and a synthetic observation console are available. Find the undocumented exposure and report only what the evidence supports.',
    commands: [
      { command: 'cat /opt/mission/inventory.txt', label: 'Review host inventory', output: ['AUTHORIZED ASSET INVENTORY // REV 8', '10.40.7.11  dc-auth-01    22/tcp, 443/tcp', '10.40.7.23  dc-archive-02 22/tcp, 445/tcp', '10.40.7.31  dc-mon-01     443/tcp'], objective: 0, evidence: 'Asset inventory REV 8 lists only 22/tcp and 445/tcp for dc-archive-02.' },
      { command: 'nmap -sv -p 22,445,8088 archive-target', label: 'Observe approved target', output: ['Nmap scan report for archive-target', '22/tcp    open   ssh       OpenSSH 9.3', '445/tcp   open   microsoft-ds Samba 4.18', '8088/tcp  open   http      Archive Console'], objective: 1, evidence: 'Port 8088/tcp is observable but absent from the approved inventory.' },
      { command: 'curl -s http://archive-target:8088/status', label: 'Inspect anomalous listener', output: ['{', '  "service": "Archive Console",', '  "version": "0.8-training",', '  "authentication": false', '}'], objective: 2, evidence: 'Undocumented Archive Console 0.8-training responds without authentication on 8088/tcp.' },
      { command: 'dc-submit "undocumented archive console on 8088"', label: 'Submit evidence-backed finding', output: ['FINDING ACCEPTED', 'Signal quality: HIGH', 'Scope adherence: VERIFIED', 'Mission objectives satisfied.'], objective: 3 },
    ],
    hint: 'Start with the supplied scope record: cat /opt/mission/inventory.txt',
  },
  'broken-trust': {
    target: 'portal-target:8080', subnet: 'SEALED APPLICATION RANGE', classification: 'DC-LAB // LIVE BOLA TARGET',
    intro: 'The training portal crosses a trust boundary incorrectly. Interrogate the live synthetic API, compare the operator-owned record with one approved foreign record, and stop when the missing authorization decision is proven.',
    commands: [
      { command: 'curl -s http://portal-target:8080/flow', label: 'Map authentication flow', output: ['{"flow":["bearer token accepted","account query selected","record returned"],"operatorAccount":"VX-104","testBoundary":"VX-207"}'], objective: 0, evidence: 'The export flow consumes a bearer identity and a caller-controlled account identifier.' },
      { command: 'curl -s -H "Authorization: Bearer dc-student-token" "http://portal-target:8080/export?account=vx-104"', label: 'Request owned object', output: ['{"authenticatedAs":"training-operator","account":"VX-104","tenant":"EMBER","owner":"training-operator","balance":4100}'], objective: 1, evidence: 'The synthetic token correctly retrieves the operator-owned VX-104 record.' },
      { command: 'curl -s -H "Authorization: Bearer dc-student-token" "http://portal-target:8080/export?account=vx-207"', label: 'Test approved foreign object', output: ['{"authenticatedAs":"training-operator","account":"VX-207","tenant":"OBSIDIAN","owner":"synthetic-peer","balance":7250}'], objective: 2, evidence: 'The same identity retrieves approved foreign record VX-207 across the tenant boundary.' },
      { command: 'dc-submit "missing object authorization"', label: 'Submit design flaw', output: ['FINDING ACCEPTED', 'Category: broken object-level authorization', 'Evidence threshold: SATISFIED', 'Scope adherence: VERIFIED'], objective: 3 },
    ],
    hint: 'Start with curl -s http://portal-target:8080/flow, then compare only the two designated synthetic accounts.',
  },
  'night-shift': {
    target: 'DC-ENDPOINT-17', subnet: 'SEALED EVIDENCE WORKSTATION', classification: 'DC-LAB // LIVE FORENSIC WORKSPACE',
    intro: 'A mounted-at-build synthetic evidence pack contains benign activity and one suspicious sequence. Verify the original files, query the records yourself, and report only the hypothesis the timeline supports.',
    commands: [
      { command: 'sha256sum -c /opt/evidence/SHA256SUMS', label: 'Validate evidence manifest', output: ['/opt/evidence/events.json: OK', '/opt/evidence/processes.csv: OK'], objective: 0, evidence: 'Both original evidence artifacts match the supplied SHA-256 manifest.' },
      { command: `jq -r 'sort_by(.at)[] | [.at,.process,.parent,.action] | @tsv' /opt/evidence/events.json`, label: 'Build event timeline', output: ['22:14:02Z updater task-scheduler scheduled maintenance start', '22:31:44Z powershell updater encoded child process', '22:31:49Z tar powershell archive created in temp', '22:32:10Z powershell updater connection to synthetic sink', '22:47:00Z backup-agent services routine heartbeat'], objective: 1, evidence: 'Updater launches a shell, creates an archive, and reaches the synthetic sink within 26 seconds.' },
      { command: `jq -r '.[] | select(.severity=="high") | [.at,.process,.parent,.action] | @tsv' /opt/evidence/events.json`, label: 'Separate signal from noise', output: ['22:31:49Z tar powershell archive created in temp', '22:32:10Z powershell updater connection to synthetic sink', '22:31:44Z powershell updater encoded child process'], objective: 2, evidence: 'Three linked high-severity events are inconsistent with the documented updater baseline.' },
      { command: 'dc-submit "suspicious updater sequence"', label: 'Submit incident hypothesis', output: ['HYPOTHESIS ACCEPTED', 'Evidence chain: COHERENT', 'Alternative explanations: DOCUMENTED', 'Scope adherence: VERIFIED'], objective: 3 },
    ],
    hint: 'Evidence integrity comes before interpretation. Start with sha256sum -c /opt/evidence/SHA256SUMS.',
  },
}

const achievements = [
  { id: 'first-signal', title: 'First Signal', desc: 'Complete a controlled field mission.', icon: Radar },
  { id: 'evidence-led', title: 'Evidence Led', desc: 'Complete a mission without using a hint.', icon: Search },
  { id: 'clean-sweep', title: 'Clean Sweep', desc: 'Earn full accuracy on a knowledge drill.', icon: Target },
  { id: 'scholar', title: 'Field Scholar', desc: 'Complete your first tactical lesson.', icon: BookOpen },
  { id: 'range-veteran', title: 'Range Veteran', desc: 'Complete every available lab mission.', icon: Trophy },
  { id: 'night-operator', title: 'Night Operator', desc: 'Maintain a 14-day training streak.', icon: Flame },
]

function TerminalLine({ item }) {
  if (item.type === 'command') return <div className="terminal-command"><span>operator@dc-range</span><em>›</em>{item.text}</div>
  return <div className={item.type === 'system' ? 'terminal-system' : 'terminal-output'}>{item.lines.map((line, i) => <div key={`${line}-${i}`}>{line || '\u00a0'}</div>)}</div>
}

export function LabSimulation({ mission, onExit, onComplete }) {
  const scenario = scenarioData[mission.id]
  const rangeApi = window.daemoncore?.range
  const [history, setHistory] = useState([
    { type: 'system', lines: ['DAEMONCORE RANGE CONSOLE // PHASE 3', scenario.classification, '', scenario.intro, '', 'Type help to inspect the mission interface.'] },
  ])
  const [input, setInput] = useState('')
  const [done, setDone] = useState([])
  const [evidence, setEvidence] = useState([])
  const [hints, setHints] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [report, setReport] = useState(false)
  const [engine, setEngine] = useState(rangeApi ? 'probing' : 'simulation')
  const [engineError, setEngineError] = useState('')
  const [busy, setBusy] = useState(false)
  const [containment, setContainment] = useState(null)
  const scrollRef = useRef(null)
  const startRef = useRef(false)

  useEffect(() => {
    if (startRef.current || !rangeApi || !['ghost-port', 'broken-trust', 'night-shift'].includes(mission.id)) return
    startRef.current = true
    rangeApi.availability().then(availability => {
      if (!availability.available) {
        setEngineError(availability.reason)
        setEngine('offline')
        return null
      }
      setEngine('provisioning')
      return rangeApi.start(mission.id)
    }).then(result => {
      if (!result) return
      setContainment(result.containment)
      setEngine('live')
      setHistory([{ type: 'system', lines: ['DAEMONCORE LIVE RANGE // PHASE 9', 'CONTAINMENT VERIFIED // INTERNAL NETWORK // ZERO HOST MOUNTS // EGRESS DENIED', '', scenario.intro, '', `This is a disposable root shell inside ${result.manifest.operatorContainer}.`, 'Type help for mission commands. Arbitrary in-range shell commands are enabled.'] }])
    }).catch(error => {
      setEngineError(error.message || 'The range failed to initialize.')
      setEngine('offline')
    })
  }, [mission.id, rangeApi, scenario.intro])
  useEffect(() => { if (!['live', 'simulation'].includes(engine)) return; const timer = setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(timer) }, [engine])
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [history])

  const push = (...items) => setHistory(h => [...h, ...items])
  const run = async raw => {
    const command = raw.trim().toLowerCase()
    if (!command || busy) return
    setInput('')
    if (command === 'clear') { setHistory([]); return }
    if (command === 'help') {
      push({ type: 'command', text: raw }, { type: 'output', lines: [engine === 'live' ? 'MISSION COMMANDS // ROOT SHELL IS UNRESTRICTED INSIDE THE SEALED RANGE' : 'SIMULATION COMMANDS', ...scenario.commands.map(c => `  ${c.command.padEnd(55)} ${c.label}`), '  hint                                                    Request guided assistance', '  evidence                                                Review collected evidence', '  clear                                                   Clear console output'] })
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
    const matched = scenario.commands.find(c => command === c.command.toLowerCase())
    if (!matched && engine !== 'live') {
      push({ type: 'command', text: raw }, { type: 'system', lines: ['COMMAND NOT AVAILABLE IN THIS SIMULATION.', 'Type help to review authorized actions.'] })
      return
    }
    push({ type: 'command', text: raw })
    let succeeded = true
    if (engine === 'live') {
      setBusy(true)
      try {
        const result = await rangeApi.execute(mission.id, raw.trim())
        const output = `${result.stdout || ''}${result.stderr || ''}`.trim()
        push({ type: result.exitCode === 0 ? 'output' : 'system', lines: output ? output.split(/\r?\n/) : [`Process exited ${result.exitCode}`] })
        succeeded = result.exitCode === 0
      } catch (error) {
        succeeded = false
        push({ type: 'system', lines: [`RANGE ERROR // ${error.message || 'command channel failed'}`] })
      } finally {
        setBusy(false)
      }
    } else {
      push({ type: 'output', lines: matched.output })
    }
    if (matched && succeeded) {
      if (!done.includes(matched.objective)) setDone(d => [...d, matched.objective])
      if (matched.evidence && !evidence.includes(matched.evidence)) setEvidence(e => [...e, matched.evidence])
      if (matched.objective === 3) setTimeout(() => setReport(true), 650)
    }
  }
  const score = Math.max(250, mission.xp - hints * 75 - Math.floor(seconds / 60) * 10)
  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const leaveRange = async () => { if (rangeApi && ['live', 'provisioning'].includes(engine)) await rangeApi.stop().catch(() => {}); onExit() }
  const finishRange = async () => { if (rangeApi && engine === 'live') await rangeApi.stop().catch(() => {}); onComplete({ mission, score, hints, seconds }) }

  if (engine === 'probing' || engine === 'provisioning') return <div className="range-gate"><div className="range-gate-grid"/><div className="range-gate-core"><div className="range-loader"><Hexagon size={78}/><i/></div><span>PHASE 3 // RANGE ORCHESTRATOR</span><h1>{engine === 'probing' ? 'Checking the engine.' : 'Building the sealed range.'}</h1><p>{engine === 'probing' ? 'Locating Docker Desktop and verifying the local runtime.' : 'Pulling the operator image, building the target, and proving containment before shell access is released.'}</p><div className="boot-sequence"><span className="done"><Check/> Scenario manifest</span><span className={engine === 'provisioning' ? 'active' : ''}><Activity/> Container network</span><span><ShieldCheck/> Containment proof</span><span><Terminal/> Root shell</span></div><button onClick={leaveRange}>Cancel launch</button></div></div>

  if (engine === 'offline') return <div className="range-gate offline"><div className="range-gate-grid"/><div className="range-gate-core"><div className="offline-mark"><HardDrive size={37}/></div><span>RANGE ENGINE OFFLINE</span><h1>Docker isn’t ready.</h1><p>{engineError} Phase 3 uses Docker Desktop to enforce the sealed network and disposable target boundary.</p><div className="offline-requirements"><div><CheckCircle2/><span>Docker Desktop 4.x+</span></div><div><CheckCircle2/><span>Linux containers</span></div><div><CheckCircle2/><span>2 GB free memory</span></div></div><div className="gate-actions"><button className="sim-primary" onClick={() => window.open('https://www.docker.com/products/docker-desktop/')}>Get Docker Desktop <ArrowRight size={15}/></button><button onClick={() => setEngine('simulation')}>Use simulation fallback</button><button onClick={onExit}>Return to range</button></div></div></div>

  if (report) return <div className="simulation-shell completion-screen">
    <div className="completion-grid" />
    <div className="completion-core"><div className="completion-seal"><ShieldCheck size={46}/></div><span>MISSION COMPLETE // EVIDENCE ACCEPTED</span><h1>{mission.title}</h1><p>You maintained the declared boundary and converted observations into a defensible conclusion.</p><div className="completion-score"><div><small>OPERATION SCORE</small><strong>{score}</strong></div><div><small>OBJECTIVES</small><strong>4 / 4</strong></div><div><small>GUIDANCE USED</small><strong>{hints}</strong></div><div><small>ELAPSED</small><strong>{formatTime(seconds)}</strong></div></div><div className="earned-xp"><Zap size={18}/> +{score} EXPERIENCE LOGGED</div><button className="sim-primary" onClick={finishRange}>Destroy range &amp; return <ArrowRight size={16}/></button></div>
  </div>

  return <div className="simulation-shell">
    <header className="simulation-header"><div><button onClick={leaveRange}><ArrowLeft size={16}/></button><div className="sim-brand"><Hexagon size={26}/><i/></div><div><span>DAEMONCORE // {engine === 'live' ? 'UNRESTRICTED SEALED RANGE' : 'SIMULATION FALLBACK'}</span><strong>{mission.title}</strong></div></div><div className="sim-telemetry"><span><i/> {engine === 'live' ? 'CONTAINMENT VERIFIED' : 'ISOLATED'}</span><span><Clock3 size={13}/>{formatTime(seconds)}</span><span>{containment ? `${containment.network} // EGRESS BLOCKED` : `MISSION // ${mission.id.toUpperCase()}`}</span><button onClick={leaveRange}>DESTROY &amp; EXIT</button></div></header>
    <div className="simulation-body">
      <section className="sim-console"><div className="console-toolbar"><div><span/><span/><span/></div><strong>{engine === 'live' ? `ROOT@DC-${mission.id.toUpperCase()}` : 'DC_RANGE_SIMULATOR'}</strong><span>{busy ? 'PROCESS RUNNING…' : engine === 'live' ? 'INTERNAL NETWORK // NO EGRESS' : 'LOCAL FALLBACK'}</span></div><div className="terminal-history" ref={scrollRef}>{history.map((item, i) => <TerminalLine key={i} item={item}/>)}</div><form className="terminal-input" onSubmit={e => { e.preventDefault(); run(input) }}><span>{engine === 'live' ? `root@dc-${mission.id}` : 'operator@dc-range'}</span><em>›</em><input autoFocus disabled={busy} value={input} onChange={e => setInput(e.target.value)} spellCheck="false" autoComplete="off" placeholder={engine === 'live' ? 'run anything inside the sealed range' : 'enter a simulation command'}/><button disabled={busy}>{busy ? 'RUNNING' : 'EXECUTE'}</button></form></section>
      <aside className="sim-sidebar"><div className="sim-target"><span>TARGET CONTEXT</span><div><Crosshair size={19}/><strong>{scenario.target}</strong></div><small>{scenario.subnet}</small></div><div className="objective-panel"><div className="sim-panel-title"><Flag size={14}/><span>MISSION OBJECTIVES</span><strong>{done.length}/4</strong></div>{mission.objectives.map((objective, i) => <div className={`sim-objective ${done.includes(i) ? 'done' : ''}`} key={objective}><span>{done.includes(i) ? <Check size={12}/> : `0${i + 1}`}</span><p>{objective}</p></div>)}</div><div className="evidence-panel"><div className="sim-panel-title"><FileText size={14}/><span>EVIDENCE LOCKER</span><strong>{evidence.length}</strong></div>{evidence.length ? evidence.map((item, i) => <div className="evidence-item" key={item}><span>E-{String(i + 1).padStart(2, '0')}</span><p>{item}</p></div>) : <div className="empty-evidence"><Database size={20}/><p>No evidence collected</p></div>}</div><button className="hint-button" onClick={() => run('hint')}><Sparkles size={15}/> Request guidance <span>-75 PTS</span></button></aside>
    </div>
  </div>
}

export function LessonPlayer({ lesson, onExit, onComplete }) {
  const content = lesson
  const [section, setSection] = useState(0)
  const [selected, setSelected] = useState(null)
  const [complete, setComplete] = useState(false)
  const [practicalScore, setPracticalScore] = useState(null)
  const [copied, setCopied] = useState('')
  const atCheck = section === content.sections.length
  const correct = selected === content.check.answer
  const practicalPassed = Number(practicalScore)>=67
  const practical = content.steps?.[section]
  const lastSection = section === content.sections.length - 1
  const copyCommand = async command => { try { await navigator.clipboard.writeText(command); setCopied(command); setTimeout(() => setCopied(''), 1400) } catch { setCopied('') } }
  const next = () => {
    if (section < content.sections.length) { setSection(s => s + 1); window.scrollTo(0, 0) }
    else if (correct) setComplete(true)
  }

  return <div className="lesson-overlay"><aside className="lesson-rail"><div className="lesson-brand"><Hexagon/><span>DC // ACADEMY</span></div><button onClick={onExit}><ArrowLeft size={15}/> Exit lesson</button><div className="lesson-designation"><span>{course.code} // {content.level||'FOUNDATION'}</span><h3>{lesson.title}</h3><small>{content.minutes} MIN // PRACTICAL + VALIDATION</small></div><nav>{content.sections.map((s, i) => <button key={s.title} className={`${section === i ? 'active' : ''} ${section > i ? 'complete' : ''}`} onClick={() => !complete && setSection(i)}><span>{section > i ? <Check size={11}/> : `0${i + 1}`}</span><div><small>SECTION</small><strong>{s.title}</strong></div></button>)}<button disabled={!practicalPassed} className={`${atCheck ? 'active' : ''} ${complete ? 'complete' : ''}`} onClick={() => practicalPassed&&setSection(content.sections.length)}><span>{complete ? <Check size={11}/> : String(content.sections.length+1).padStart(2,'0')}</span><div><small>{practicalPassed?'VALIDATION':'WORKBENCH LOCK'}</small><strong>Knowledge check</strong></div></button></nav><div className="lesson-rail-progress"><span>LESSON PROGRESS</span><div><i style={{ width: `${Math.min(100, section / content.sections.length * 100)}%` }}/></div><strong>{Math.round(Math.min(100, section / content.sections.length * 100))}%</strong></div></aside>
    <main className="lesson-content"><header><span>TACTICAL INSTRUCTION // {course.code}</span><div><Clock3 size={14}/> {content.minutes} MIN</div></header>{!atCheck ? <article><div className="lesson-kicker">SECTION // 0{section + 1} &nbsp;·&nbsp; {content.environment}</div><h1>{content.sections[section].title}</h1><p className="lesson-lead">{content.sections[section].body}</p>{section===0&&<><section className="lesson-outcome"><Target/><div><span>OPERATOR OUTCOME</span><strong>{content.outcome}</strong></div></section><div className="lesson-brief-grid"><section><span>YOU WILL BE ABLE TO</span>{content.objectives?.map(item=><p key={item}><CheckCircle2/>{item}</p>)}</section><section><span>BEFORE YOU START</span>{content.prerequisites?.map(item=><p key={item}><ChevronRight/>{item}</p>)}</section></div></>}{practical&&<section className="workshop-block"><header><div><span>GUIDED WORKSHOP // STEP {String(section+1).padStart(2,'0')}</span><h2>{practical.title}</h2></div><Code2/></header><p>{practical.instruction}</p><div className="command-block"><div><span>RUN / REPRODUCE</span><button onClick={()=>copyCommand(practical.command)}>{copied===practical.command?<Check/>:<Copy/>}{copied===practical.command?'COPIED':'COPY'}</button></div><pre>{practical.command}</pre></div><div className="expected-block"><span>EXPECTED SIGNAL</span><pre>{practical.expected}</pre></div><div className="analysis-block"><Search/><div><span>READ THE RESULT</span><p>{practical.analysis}</p></div></div></section>}{lastSection&&content.exercise&&<section className="operator-exercise"><header><Flag/><div><span>OPERATOR EXERCISE</span><h2>Produce the artifact.</h2></div></header><p>{content.exercise.brief}</p><div><span>DELIVERABLE</span><strong>{content.exercise.deliverable}</strong></div><ul>{content.exercise.success.map(item=><li key={item}><CheckCircle2/>{item}</li>)}</ul></section>}{lastSection&&<InteractiveWorkbench scenario={content.interactive} onPassed={setPracticalScore}/>} {lastSection&&content.references?.length>0&&<section className="lesson-references"><span>PRIMARY REFERENCES</span>{content.references.map(reference=><a key={reference.url} href={reference.url} target="_blank" rel="noreferrer">{reference.label}<ArrowRight/></a>)}</section>}<div className="operator-note"><div><UserRound/></div><div><span>OPERATOR RULE</span><p>Preserve the command, the raw signal, and what the signal does not prove.</p></div></div><button className="lesson-next" disabled={lastSection&&!practicalPassed} onClick={next}>{lastSection ? practicalPassed?`Knowledge check unlocked // ${practicalScore}%`:'Pass the operator workbench to continue' : 'Continue workshop'} <ArrowRight size={16}/></button></article> : <article className="lesson-check">{complete ? <div className="lesson-complete"><div><Award size={44}/></div><span>LESSON MASTERED</span><h1>Operator standard met.</h1><p>The workshop, {practicalScore}% practical score, and validation are now written to your operator record.</p><div><strong>+180 XP</strong><small>PRACTICAL + KNOWLEDGE VALIDATED</small></div><button className="lesson-next" onClick={() => onComplete({...lesson,practicalScore})}>Return to pathway <ArrowRight size={16}/></button></div> : <><div className="lesson-kicker">KNOWLEDGE VALIDATION // PRACTICAL {practicalScore}%</div><h1>{content.check.q}</h1><div className="lesson-options">{content.check.options.map((option, i) => <button key={option} className={`${selected === i ? 'selected' : ''} ${selected !== null && i === content.check.answer ? 'correct' : ''} ${selected === i && !correct ? 'wrong' : ''}`} onClick={() => setSelected(i)}><span>{String.fromCharCode(65 + i)}</span>{option}{selected !== null && i === content.check.answer && <Check size={16}/>}</button>)}</div>{selected !== null && <div className={`answer-rationale ${correct ? 'correct' : ''}`}>{correct ? <CheckCircle2/> : <AlertTriangle/>}<div><strong>{correct ? 'Correct signal.' : 'Recalibrate.'}</strong><p>{content.check.rationale}</p></div></div>}<button className="lesson-next" disabled={!correct} onClick={next}>Complete lesson <ArrowRight size={16}/></button></>}</article>}</main>
  </div>
}

export function OperatorPage({ profile }) {
  const unlocked = new Set(profile.achievements || [])
  const levelProgress = Math.min(100, Math.round((profile.xp % 1000) / 1000 * 100))
  const missionAttempts=profile.missionAttempts||[],drillAttempts=profile.drillAttempts||[],lessonAttempts=profile.lessonAttempts||[],lessons=profile.completedLessons||[]
  const bestMission=missionAttempts.reduce((best,a)=>Math.max(best,a.score||0),0),totalQuestions=drillAttempts.reduce((sum,a)=>sum+(a.total||0),0),correct=drillAttempts.reduce((sum,a)=>sum+(a.correct||0),0),accuracy=totalQuestions?Math.round(correct/totalQuestions*100):0,practicalAverage=lessonAttempts.length?Math.round(lessonAttempts.reduce((sum,a)=>sum+(a.practicalScore||0),0)/lessonAttempts.length):0,courseProgress=Math.round(lessons.length/course.lessons.length*100)
  const joined=profile.createdAt?new Date(profile.createdAt).toLocaleDateString(undefined,{year:'numeric',month:'short'}).toUpperCase():'LOCAL RECORD'
  return <div className="page operator-page"><section className="operator-hero"><div className="operator-grid"/><div className="large-avatar"><span>{profile.handle.slice(0,2)}</span><i/></div><div className="operator-identity"><span>LOCAL OPERATOR RECORD // VERIFIED</span><h2>{profile.handle}</h2><p>DAEMONCORE ACADEMY OPERATOR</p><div><span><i/> ACTIVE STATUS</span><span>RECORD // LOCAL-FIRST</span><span>JOINED // {joined}</span></div></div><div className="operator-level"><span>CURRENT LEVEL</span><strong>LEVEL {String(profile.level).padStart(2, '0')}</strong><div><i style={{ width: `${levelProgress}%` }}/></div><small>{profile.xp.toLocaleString()} TOTAL XP // {1000-(profile.xp%1000)} XP TO NEXT LEVEL</small></div></section>
    <section className="operator-metrics"><div><Zap/><span>TOTAL EXPERIENCE</span><strong>{profile.xp.toLocaleString()}</strong><small>EARNED IN RECORDED WORK</small></div><div><Crosshair/><span>MISSIONS CLEARED</span><strong>{(profile.completedMissions || []).length}</strong><small>{missionAttempts.length} ATTEMPTS LOGGED</small></div><div><BookOpen/><span>LESSONS MASTERED</span><strong>{lessons.length}</strong><small>{courseProgress}% COURSE COMPLETION</small></div><div><Flame/><span>ACTIVE STREAK</span><strong>{profile.streak} DAYS</strong><small>PERSONAL BEST // {profile.bestStreak}</small></div></section>
    <div className="operator-layout"><section><div className="operator-section-head"><div><span>OPERATOR DECORATIONS</span><h3>Achievements</h3></div><strong>{unlocked.size} / {achievements.length}</strong></div><div className="achievement-grid">{achievements.map(({ id, title, desc, icon: Icon }) => <article className={unlocked.has(id) ? 'unlocked' : ''} key={id}><div><Icon size={23}/>{unlocked.has(id) ? <Check size={11}/> : <LockKeyhole size={11}/>}</div><span>{unlocked.has(id) ? 'ACQUIRED' : 'LOCKED'}</span><h4>{title}</h4><p>{desc}</p></article>)}</div></section><aside><div className="readiness-card"><div className="readiness-ring"><strong>{courseProgress}</strong><span>COURSE</span></div><h3>Record integrity</h3><p>Every number here is derived from a locally stored completion or scored attempt. No cohort, percentile, or readiness score is invented.</p><div><span>COURSE COMPLETION</span><strong>{courseProgress}%</strong></div><div><span>PRACTICAL MASTERY</span><strong>{practicalAverage}%</strong></div><div><span>DRILL ACCURACY</span><strong>{accuracy}%</strong></div><div><span>BEST MISSION</span><strong>{bestMission||'—'}</strong></div></div><div className="clearance-card"><ShieldCheck/><div><span>COURSE STATUS</span><strong>{courseProgress===100?'FULL SPECTRUM // COMPLETE':'FULL SPECTRUM // IN PROGRESS'}</strong><small>{lessons.length} / {course.lessons.length} VALIDATED LESSONS</small></div></div></aside></div>
  </div>
}

export function PhaseBadge({ complete, live }) {
  if (complete) return <span className="phase-cleared"><Check size={11}/> CLEARED</span>
  return <span className="phase-live"><Activity size={11}/> {live ? 'PHASE 3 RANGE' : 'SIMULATION'}</span>
}

export function RangeEngineCard() {
  const api = window.daemoncore?.range
  const [status, setStatus] = useState(api ? { state: 'checking' } : { state: 'preview' })
  useEffect(() => {
    if (!api) return
    api.status().then(setStatus).catch(error => setStatus({ state: 'offline', reason: error.message }))
  }, [api])
  const ready = ['ready', 'sealed'].includes(status.state)
  return <div className={`range-engine-card ${ready ? 'ready' : status.state}`}><div className="engine-mark"><Terminal size={19}/><i/></div><div><span>PHASE 3 RANGE ENGINE</span><strong>{status.state === 'checking' ? 'PROBING LOCAL RUNTIME' : ready ? `DOCKER ${status.version || ''} // READY` : status.state === 'preview' ? 'WEB PREVIEW // SIMULATION PATH' : 'DOCKER DESKTOP REQUIRED'}</strong><small>{ready ? 'Containment is verified again before every shell opens.' : status.reason || 'Install and start Docker Desktop to unlock the unrestricted sealed shell.'}</small></div><div className="engine-policies"><span><ShieldCheck/> INTERNAL NETWORK</span><span><HardDrive/> ZERO HOST MOUNTS</span><span><LockKeyhole/> AUTO-TEARDOWN</span></div><em>{ready ? 'READY' : status.state === 'checking' ? 'CHECKING' : 'OFFLINE'}</em></div>
}
