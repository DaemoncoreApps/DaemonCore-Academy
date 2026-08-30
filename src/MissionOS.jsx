import { useMemo, useState } from 'react'
import { ArrowRight, Check, Compass, Crosshair, RotateCcw, Route, ShieldCheck, Sparkles, Target } from 'lucide-react'
import missionOS from '../shared/mission-os.json'

const stageProgress = (page, profile) => {
  if (page === 'academy') return Math.min(100, (profile.completedLessons?.length || 0) * 4)
  if (page === 'labs') return Math.min(100, Math.round((profile.completedMissions?.length || 0) / 7 * 100))
  if (page === 'webforge') return Math.min(100, Math.round((profile.completedWebLabs?.length || 0) / 22 * 100))
  if (page === 'enterprise') return Math.min(100, Math.round((profile.completedEnterpriseLabs?.length || 0) / 48 * 100))
  if (page === 'mastery') return profile.capstoneAttempts?.some(attempt => attempt.passed) ? 100 : 0
  return 0
}

function Assessment({ onComplete, busy }) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState(false)
  const question = missionOS.questions[index]
  const selected = answers[question.id]
  const choose = answer => { setAnswers(current => ({ ...current, [question.id]: answer })); setRevealed(true) }
  const advance = () => {
    if (index === missionOS.questions.length - 1) onComplete({ action: 'assessment', answers })
    else { setIndex(current => current + 1); setRevealed(false) }
  }
  return <div className="mission-os assessment-shell">
    <section className="mission-os-hero"><div><span>MISSION OS // ENTRY DIAGNOSTIC</span><h2>Find the signal.<br/><em>Build the right route.</em></h2><p>Twelve scenario decisions establish a local baseline across six operating domains. This is a diagnostic—not a certification or personality quiz.</p></div><div className="diagnostic-count"><strong>{String(index + 1).padStart(2, '0')}</strong><span>/ {missionOS.questions.length}</span></div></section>
    <section className="assessment-card"><header><span>{missionOS.domains.find(domain => domain.id === question.domain)?.label}</span><strong>{Math.round((index + 1) / missionOS.questions.length * 100)}% COMPLETE</strong></header><div className="assessment-meter"><i style={{ width: `${(index + 1) / missionOS.questions.length * 100}%` }}/></div><h3>{question.prompt}</h3><div className="assessment-options">{question.options.map((option, optionIndex) => <button key={option} className={`${selected === optionIndex ? 'selected' : ''} ${revealed && optionIndex === question.answer ? 'correct' : ''}`} disabled={revealed} onClick={() => choose(optionIndex)}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{revealed && optionIndex === question.answer && <Check/>}</button>)}</div>{revealed && <div className="assessment-rationale"><ShieldCheck/><div><strong>{selected === question.answer ? 'Signal locked.' : 'Recalibrate the decision.'}</strong><p>{question.rationale}</p></div></div>}<button className="mission-os-primary" disabled={!revealed || busy} onClick={advance}>{index === missionOS.questions.length - 1 ? 'Build my Mission OS' : 'Next scenario'} <ArrowRight/></button></section>
  </div>
}

export function MissionOSPage({ profile, onUpdate, onNavigate }) {
  const [busy, setBusy] = useState(false)
  const assessment = profile.missionOS?.assessment
  const selectedId = profile.missionOS?.selectedPathway || assessment?.recommendedPathway
  const selected = missionOS.pathways.find(pathway => pathway.id === selectedId)
  const update = async input => { setBusy(true); try { await onUpdate(input) } finally { setBusy(false) } }
  const pathwayProgress = useMemo(() => selected ? Math.round(selected.stages.reduce((sum, stage) => sum + stageProgress(stage.page, profile), 0) / selected.stages.length) : 0, [selected, profile])
  if (!assessment) return <Assessment busy={busy} onComplete={update}/>
  return <div className="page mission-os">
    <section className="mission-os-hero"><div><span>MISSION OS // ADAPTIVE OPERATOR ROUTE</span><h2>Your training now has<br/><em>a target state.</em></h2><p>The route reacts to recorded lessons, labs, enterprise cases, and capstones. Every percentage comes from work completed on this device.</p></div><div className="readiness-orb"><strong>{assessment.overall}</strong><span>BASELINE</span></div></section>
    <section className="domain-grid">{missionOS.domains.map(domain => { const result = assessment.scores[domain.id]; return <article key={domain.id}><header><span>{domain.label}</span><strong>{result.score}%</strong></header><div><i style={{ width: `${result.score}%` }}/></div><small>{result.correct} / {result.total} decisions</small></article> })}</section>
    <section className="pathway-section"><header><div><span>SIX PROFESSIONAL ROUTES</span><h3>Choose the operator you are building.</h3></div><button className="mission-os-reset" onClick={() => update({ action: 'reset-assessment' })}><RotateCcw/> Retake diagnostic</button></header><div className="pathway-grid">{missionOS.pathways.map(pathway => { const recommended = pathway.id === assessment.recommendedPathway; const active = pathway.id === selectedId; return <button key={pathway.id} className={`${active ? 'active' : ''}`} onClick={() => update({ action: 'select-pathway', pathwayId: pathway.id })}><div><Route/>{recommended && <span>RECOMMENDED</span>}</div><h4>{pathway.label}</h4><p>{pathway.role}</p><strong>{active ? 'ACTIVE ROUTE' : 'SELECT ROUTE'} <ArrowRight/></strong></button> })}</div></section>
    {selected && <section className="adaptive-plan"><header><div><span>ACTIVE PLAN // {selected.label.toUpperCase()}</span><h3>Next best work.</h3></div><div><strong>{pathwayProgress}%</strong><span>ROUTE PROGRESS</span></div></header><div className="plan-stages">{selected.stages.map((stage, index) => { const progress = stageProgress(stage.page, profile); return <article key={`${stage.page}-${stage.label}`}><span>{progress === 100 ? <Check/> : String(index + 1).padStart(2, '0')}</span><div><small>{progress === 100 ? 'RECORDED' : index === 0 || selected.stages.slice(0, index).every(previous => stageProgress(previous.page, profile) === 100) ? 'NEXT BEST ACTION' : 'UPCOMING'}</small><h4>{stage.label}</h4><div><i style={{ width: `${progress}%` }}/></div><p>{progress}% recorded completion</p></div><button onClick={() => onNavigate(stage.page)}>{progress === 100 ? 'Review' : 'Open'} <ArrowRight/></button></article> })}</div><footer><Compass/><div><strong>Adaptive means evidence-led.</strong><p>Mission OS recommends where to work next; it never invents readiness, rank, or employer outcomes.</p></div><Target/></footer></section>}
    <section className="mission-os-proof"><Crosshair/><div><span>WHAT CHANGED IN 6.0</span><strong>One diagnostic. Six routes. One visible record of capability.</strong></div><Sparkles/></section>
  </div>
}
