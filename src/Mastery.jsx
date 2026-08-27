import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Award, BarChart3, Check, CheckCircle2, Clock3, FileText, RotateCcw, ShieldCheck, Target, X } from 'lucide-react'
import { capstones, deriveMastery, buildRemediation } from './mastery-data.js'
import { course } from './content.js'
import './mastery.css'

const clamp = value => Math.max(0, Math.min(100, Math.round(value)))

function DomainMatrix({ domains }) {
  return <div className="domain-matrix">{domains.map(domain => <article key={domain.id} className={domain.status.toLowerCase()}>
    <header><span>{domain.label}</span><em>{domain.status}</em></header>
    <strong>{domain.evidence ? domain.score : '—'}<small>{domain.evidence ? '%' : ''}</small></strong>
    <div><i style={{ width: `${domain.score}%` }}/></div>
    <footer>{domain.evidence} SCORED EVIDENCE POINT{domain.evidence === 1 ? '' : 'S'}</footer>
  </article>)}</div>
}

function CapstoneCard({ capstone, attempts, onStart }) {
  const mine = attempts.filter(attempt => attempt.capstoneId === capstone.id)
  const best = mine.length ? Math.max(...mine.map(attempt => attempt.score)) : null
  return <article className="capstone-card">
    <div className="capstone-code"><span>{capstone.code}</span><em>{capstone.difficulty}</em></div>
    <h3>{capstone.title}</h3><strong>{capstone.subtitle}</strong><p>{capstone.brief}</p>
    <div className="capstone-meta"><span><Clock3/> {capstone.duration} MIN</span><span><Target/> {capstone.nodes.length} DECISIONS</span><span><FileText/> DOSSIER</span></div>
    <footer><div><span>BEST VERIFIED SCORE</span><strong>{best === null ? 'NOT ATTEMPTED' : `${best}%`}</strong></div><button onClick={() => onStart(capstone)}>{mine.length ? 'Re-enter capstone' : 'Initialize capstone'} <ArrowRight/></button></footer>
  </article>
}

export function MasteryPage({ profile, onStart, onOpenLesson }) {
  const domains = useMemo(() => deriveMastery(profile), [profile])
  const remediation = useMemo(() => buildRemediation(profile), [profile])
  const attempts = profile.capstoneAttempts || []
  const verified = attempts.filter(attempt => attempt.passed).length
  const measured = domains.filter(domain => domain.evidence).length
  const score = clamp(domains.reduce((sum, domain) => sum + domain.score, 0) / domains.length)
  return <div className="page mastery-page">
    <section className="mastery-hero"><div><span>DAEMONCORE MASTERY GRID // EVIDENCE-DERIVED</span><h2>Prove the judgment.<br/><em>Keep the receipts.</em></h2><p>Completion is not competence. This grid combines practical lesson scores with capstone decisions and shows exactly where the operator has—or has not—produced evidence.</p></div><div className="mastery-score"><span>VERIFIED MASTERY</span><strong>{score}%</strong><small>{measured} / {domains.length} DOMAINS MEASURED</small><small>{verified} PASSED CAPSTONE ATTEMPT{verified === 1 ? '' : 'S'}</small></div></section>
    <div className="mastery-section-head"><div><span>DOMAIN DIAGNOSTICS</span><h3>Operational signal</h3></div><p>No percentiles. No fabricated cohort data. Every score traces to recorded work.</p></div>
    <DomainMatrix domains={domains}/>
    <div className="mastery-layout"><section><div className="mastery-section-head"><div><span>PRINCIPAL PRACTICUM</span><h3>Capstone operations</h3></div><strong>03 LIVE DOSSIERS</strong></div><div className="capstone-grid">{capstones.map(capstone => <CapstoneCard key={capstone.id} capstone={capstone} attempts={attempts} onStart={onStart}/>)}</div></section>
      <aside className="remediation-rail"><header><BarChart3/><div><span>ADAPTIVE PATH</span><h3>Next best work</h3></div></header><p>Assigned from the lowest-confidence domains in the local operator record.</p>{remediation.map((item, index) => { const lesson = course.lessons.find(entry => entry.id === item.lessonId); return <button key={item.domain} onClick={() => lesson && onOpenLesson(lesson)}><span>0{index + 1} // {item.score}% SIGNAL</span><strong>{item.label}</strong><p>{item.reason}</p><em>{lesson?.title} <ArrowRight/></em></button>})}</aside>
    </div>
  </div>
}

function scoreAttempt(capstone, answers) {
  const domain = {}, domainTotal = {}
  let correct = 0
  capstone.nodes.forEach((node, index) => {
    const selected = answers[index]
    const right = selected === node.answer
    if (right) correct += 1
    const touched = new Set(node.choices[node.answer].domains)
    touched.forEach(id => { domainTotal[id] = (domainTotal[id] || 0) + 1; domain[id] = (domain[id] || 0) + (right ? 1 : 0) })
  })
  return { score: Math.round(correct / capstone.nodes.length * 100), domainScores: Object.fromEntries(Object.entries(domain).map(([id, value]) => [id, Math.round(value / domainTotal[id] * 100)])), correct }
}

export function CapstoneRunner({ capstone, onExit, onComplete }) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selected, setSelected] = useState(null)
  const [finished, setFinished] = useState(false)
  const node = capstone.nodes[index]
  const result = finished ? scoreAttempt(capstone, answers) : null
  const choose = choiceIndex => { if (selected !== null) return; setSelected(choiceIndex); setAnswers(current => [...current, choiceIndex]) }
  const advance = () => { if (index === capstone.nodes.length - 1) setFinished(true); else { setIndex(value => value + 1); setSelected(null) } }
  if (finished) return <div className="capstone-shell result"><section><div className={`capstone-seal ${result.score >= 80 ? 'pass' : ''}`}>{result.score >= 80 ? <ShieldCheck/> : <X/>}</div><span>{result.score >= 80 ? 'CAPSTONE STANDARD VERIFIED' : 'REMEDIATION REQUIRED'}</span><h1>{result.score}%</h1><p>{result.score >= 80 ? 'The decision trail is ready to be written to the operator record.' : 'A professional capstone requires four of five defensible decisions. Log the attempt to update the adaptive path, or review the missed signals and run it again.'}</p><div className="result-ledger">{capstone.nodes.map((entry, i) => <div key={entry.signal}><i className={answers[i] === entry.answer ? 'good' : 'bad'}/><span>{entry.signal}</span><strong>{answers[i] === entry.answer ? 'VERIFIED' : 'MISSED'}</strong></div>)}</div><div className="result-actions"><button onClick={onExit}><ArrowLeft/> Exit without logging</button>{result.score >= 80 ? <button className="primary" onClick={() => onComplete({ type: 'capstone', id: capstone.id, title: capstone.title, score: result.score, domainScores: result.domainScores, decisions: answers, total: capstone.nodes.length })}>Seal attempt <Award/></button> : <><button onClick={() => onComplete({ type: 'capstone', id: capstone.id, title: capstone.title, score: result.score, domainScores: result.domainScores, decisions: answers, total: capstone.nodes.length })}>Log remediation <BarChart3/></button><button className="primary" onClick={() => { setIndex(0); setAnswers([]); setSelected(null); setFinished(false) }}>Run again <RotateCcw/></button></>}</div></section></div>
  return <div className="capstone-shell"><header><div><button onClick={onExit}><ArrowLeft/></button><div><span>{capstone.code} // SEALED DECISION ROOM</span><strong>{capstone.title}</strong></div></div><div><span>NODE {index + 1} / {capstone.nodes.length}</span><span><Clock3/> GUIDED {capstone.duration} MIN</span><em>LOCAL EVIDENCE ONLY</em></div></header><div className="capstone-progress"><i style={{ width: `${((index + (selected !== null ? 1 : 0)) / capstone.nodes.length) * 100}%` }}/></div><main><aside><span>CASE OBJECTIVE</span><p>{capstone.outcome}</p><div>{capstone.nodes.map((entry, i) => <span key={entry.signal} className={i === index ? 'active' : i < index ? 'complete' : ''}>{i < index ? <Check/> : String(i + 1).padStart(2, '0')} {entry.signal}</span>)}</div></aside><section><div className="artifact-pane"><header><span>EVIDENCE ARTIFACT // {node.signal}</span><FileText/></header><pre>{node.artifact}</pre></div><h1>{node.prompt}</h1><div className="capstone-choices">{node.choices.map((choice, choiceIndex) => <button key={choice.label} disabled={selected !== null} onClick={() => choose(choiceIndex)} className={`${selected === choiceIndex ? 'selected' : ''} ${selected !== null && choiceIndex === node.answer ? 'correct' : ''} ${selected === choiceIndex && choiceIndex !== node.answer ? 'wrong' : ''}`}><span>{String.fromCharCode(65 + choiceIndex)}</span><strong>{choice.label}</strong>{selected !== null && choiceIndex === node.answer && <CheckCircle2/>}</button>)}</div>{selected !== null && <div className={`capstone-feedback ${selected === node.answer ? 'correct' : ''}`}><strong>{selected === node.answer ? 'DECISION ACCEPTED' : 'DECISION REJECTED'}</strong><p>{node.feedback}</p></div>}<button className="capstone-next" disabled={selected === null} onClick={advance}>{index === capstone.nodes.length - 1 ? 'Compile decision ledger' : 'Commit decision'} <ArrowRight/></button></section></main></div>
}
