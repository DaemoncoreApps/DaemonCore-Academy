import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Database, Download, Hexagon, LockKeyhole, RotateCcw, ShieldCheck, SlidersHorizontal, X } from 'lucide-react'

export function LoadingScreen() {
  return <div className="boot-screen"><div className="boot-logo"><Hexagon size={68}/><i/></div><span>DAEMONCORE ACADEMY</span><strong>Loading operator record…</strong></div>
}

export function Onboarding({ onComplete }) {
  const [handle, setHandle] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const submit = async event => {
    event.preventDefault(); setError('')
    try { await onComplete(handle) } catch (caught) { setError(caught.message) }
  }
  return <div className="onboarding"><div className="onboarding-grid"/><main><div className="onboard-brand"><Hexagon size={42}/><i/></div><span>FIRST BOOT // OPERATOR REGISTRATION</span><h1>Build the record.<br/><em>Earn everything else.</em></h1><p>DaemonCore starts clean. No fake rank. No seeded XP. Your record is stored locally and only changes when you complete real work.</p><form onSubmit={submit}><label>OPERATOR HANDLE<input autoFocus value={handle} maxLength={20} onChange={e=>setHandle(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,''))} placeholder="NIGHTSHIFT"/><small>2–20 letters, numbers, underscores, or dashes</small></label><label className="roe-check"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>{accepted?<Check size={13}/>:null}</span><p>I will use DaemonCore only on systems I own or am explicitly authorized to test.</p></label>{error&&<div className="onboard-error">{error}</div>}<button disabled={!accepted||handle.length<2}>Initialize operator record <ArrowRight size={16}/></button></form><footer><ShieldCheck size={15}/> LOCAL-FIRST // NO ACCOUNT REQUIRED // EXPORT ANYTIME</footer></main></div>
}

export function SettingsPage({ data, onUpdate, onExport, onReset }) {
  const [resetOpen,setResetOpen]=useState(false),[confirmation,setConfirmation]=useState(''),[message,setMessage]=useState('')
  const settings=data.settings
  const exportData=async()=>{const result=await onExport();setMessage(result?.canceled?'Export canceled':result?.filePath?`Saved to ${result.filePath}`:'Record downloaded')}
  return <div className="page settings-page"><div className="page-intro"><div><span className="section-code">LOCAL CONTROL PLANE</span><h2>Settings &amp;<br/><em>operator data.</em></h2></div><p>No cloud dependency. Your progress belongs to you, and the export is plain JSON.</p></div><section className="settings-block"><header><SlidersHorizontal/><div><span>INTERFACE</span><h3>Display preferences</h3></div></header><label><div><strong>Reduce motion</strong><small>Disable nonessential animation and orbit effects.</small></div><input type="checkbox" checked={settings.reduceMotion} onChange={e=>onUpdate({...settings,reduceMotion:e.target.checked})}/><i/></label><label><div><strong>Compact navigation</strong><small>Start the side rail in compact mode.</small></div><input type="checkbox" checked={settings.compactMode} onChange={e=>onUpdate({...settings,compactMode:e.target.checked})}/><i/></label></section><section className="settings-block"><header><Database/><div><span>OPERATOR RECORD</span><h3>Backup and recovery</h3></div></header><div className="data-action"><div><strong>Export everything</strong><small>Lessons, attempts, scores, achievements, settings, and timestamps.</small></div><button onClick={exportData}><Download size={15}/> Export JSON</button></div><div className="data-action danger"><div><strong>Reset Academy</strong><small>Deletes the local operator record and returns to first boot.</small></div><button onClick={()=>setResetOpen(true)}><RotateCcw size={15}/> Reset data</button></div>{message&&<p className="settings-message">{message}</p>}</section>{resetOpen&&<div className="modal-backdrop"><div className="reset-modal"><button className="modal-close" onClick={()=>setResetOpen(false)}><X size={17}/></button><LockKeyhole size={28}/><span>DESTRUCTIVE OPERATION</span><h2>Erase the operator record?</h2><p>This removes all local progress. Export first if you may want it later.</p><label>TYPE RESET TO CONFIRM<input value={confirmation} onChange={e=>setConfirmation(e.target.value.toUpperCase())}/></label><button disabled={confirmation!=='RESET'} onClick={onReset}>Erase local record</button></div></div>}</div>
}

export function ArticleReader({ article, onClose }) {
  return <div className="article-reader"><aside><button onClick={onClose}><ArrowLeft size={15}/> Intel library</button><div><span>{article.type}</span><h2>{article.title}</h2><p>{article.readMinutes} MIN READ</p></div></aside><main><header><span>DAEMONCORE FIELD INTELLIGENCE</span><button onClick={onClose}><X size={17}/></button></header><article><span>{article.type} // VERIFIED CONTENT</span><h1>{article.title}</h1><p className="article-summary">{article.summary}</p>{article.sections.map(([title,body],i)=><section key={title}><em>0{i+1}</em><div><h3>{title}</h3><p>{body}</p></div></section>)}<footer>END OF FIELD NOTE // RETURN TO THE OPERATION WITH A BETTER QUESTION.</footer></article></main></div>
}
