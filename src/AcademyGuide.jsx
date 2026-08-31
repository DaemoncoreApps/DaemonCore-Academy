import { ArrowRight, BookOpen, CheckCircle2, Compass, FlaskConical, HelpCircle, ShieldCheck, Terminal } from 'lucide-react'

const stages = [
  { icon: BookOpen, code: '01 // LEARN', title: 'Read the method', body: 'Lesson command blocks are worked examples. They never execute from the lesson page.' },
  { icon: FlaskConical, code: '02 // PRACTICE', title: 'Use the workbench', body: 'Make the decisions and produce the required artifact inside the lesson.' },
  { icon: Terminal, code: '03 // LAUNCH', title: 'Enter a sealed range', body: 'Live commands run only after you explicitly launch a Docker range and see containment verified.' },
  { icon: ShieldCheck, code: '04 // PROVE', title: 'Submit evidence', body: 'The range validates the outcome, seals the evidence, and writes completion to your local record.' },
]

export function AcademyWorkflowGuide({ onClose, onNavigate }) {
  return <div className="modal-backdrop academy-guide-backdrop">
    <section className="academy-guide" role="dialog" aria-modal="true" aria-labelledby="academy-guide-title">
      <header><div><Compass/><span>FIRST RUN // HOW DAEMONCORE WORKS</span></div><button onClick={() => onClose()} aria-label="Close workflow guide">SKIP FOR NOW</button></header>
      <div className="academy-guide-intro"><span>THE OPERATOR LOOP</span><h2 id="academy-guide-title">Know exactly where you are.<br/><em>Know exactly what to do next.</em></h2><p>DaemonCore separates instruction from live execution. Nothing on a lesson page runs against your computer or a target.</p></div>
      <div className="academy-guide-stages">{stages.map(({ icon: Icon, code, title, body }) => <article key={code}><Icon/><span>{code}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      <div className="academy-guide-boundary"><ShieldCheck/><div><strong>How to recognize a live terminal</strong><p>You must select <b>Launch range</b>, wait for <b>Containment verified</b>, and see a prompt beginning with <code>root@dc-</code>. Everywhere else, commands are instructional examples.</p></div></div>
      <footer><button className="guide-secondary" onClick={() => onNavigate('missionos')}>Build my route <Compass/><ArrowRight/></button><button className="guide-primary" onClick={() => onNavigate('academy')}>Start in Academy <BookOpen/><ArrowRight/></button></footer>
    </section>
  </div>
}

export function WorkflowDock({ page, profile, onNavigate, onOpenGuide }) {
  const lessons = profile.completedLessons?.length || 0
  const missions = profile.completedMissions?.length || 0
  const hasRoute = Boolean(profile.missionOS?.assessment)
  const state = lessons === 0
    ? { code: 'START HERE', title: 'Open your first Academy lesson', body: 'Read the method, finish its in-app workbench, then take the knowledge check.', page: 'academy', action: 'Open Academy', Icon: BookOpen }
    : missions === 0
      ? { code: 'NEXT LIVE STEP', title: 'Try a Guided Lab Range', body: 'Live commands run only inside the sealed Docker terminal after containment is verified.', page: 'labs', action: 'Open Lab Range', Icon: Terminal }
      : !hasRoute
        ? { code: 'BUILD YOUR ROUTE', title: 'Take the Mission OS diagnostic', body: 'Twelve decisions turn your recorded work into a visible next-best path.', page: 'missionos', action: 'Open Mission OS', Icon: Compass }
        : { code: 'OPERATOR LOOP', title: 'Learn. Practice. Launch. Prove.', body: 'Mission OS recommends the next stage from work recorded on this device.', page: 'missionos', action: 'View active route', Icon: CheckCircle2 }
  const active = page === state.page
  const StateIcon = state.Icon
  return <section className="workflow-dock">
    <div className="workflow-dock-icon"><StateIcon/></div>
    <div><span>{state.code} // CURRENT GUIDANCE</span><strong>{state.title}</strong><p>{state.body}</p></div>
    <div className="workflow-loop"><span className={page === 'academy' ? 'active' : ''}>LEARN</span><i/><span className={['labs','webforge','enterprise'].includes(page) ? 'active' : ''}>LAUNCH</span><i/><span className={page === 'mastery' ? 'active' : ''}>PROVE</span></div>
    <button className="workflow-help" onClick={onOpenGuide}><HelpCircle/> How this works</button>
    <button className="workflow-action" disabled={active} onClick={() => onNavigate(state.page)}>{active ? 'You are here' : state.action}<ArrowRight/></button>
  </section>
}
