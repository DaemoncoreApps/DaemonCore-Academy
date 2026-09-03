import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, Check, Database, Download, FileInput, Gauge, Network, Play, RefreshCw, ShieldCheck, Square, TerminalSquare, Wrench } from 'lucide-react'

const activeStatuses = new Set(['queued', 'starting', 'running', 'cancelling'])

export function ExecutionFabric({ engagement, jobs = [], onCapabilities, onExportManifest, onImportEvidence, onStartJob, onCancelJob, onRefresh }) {
  const [capabilities, setCapabilities] = useState(null)
  const [selectedTool, setSelectedTool] = useState('nmap')
  const [target, setTarget] = useState(engagement.targets[0])
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [attested, setAttested] = useState(false)
  const latestJob = jobs[0]
  const activeJob = jobs.find(job => activeStatuses.has(job.status))
  const hasActiveJob = Boolean(activeJob)
  const runnerAvailable = capabilities?.tools?.some(tool => ['nmap', 'docker'].includes(tool.id) && tool.available)

  const load = async refresh => {
    setBusy('refresh')
    setError('')
    try {
      setCapabilities(await onCapabilities(refresh))
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy('')
    }
  }

  useEffect(() => {
    let active = true
    onCapabilities(false)
      .then(result => { if (active) setCapabilities(result) })
      .catch(caught => { if (active) setError(caught.message) })
    return () => { active = false }
  }, [onCapabilities])

  useEffect(() => {
    if (!hasActiveJob) return undefined
    const timer = setInterval(() => onRefresh().catch(() => {}), 800)
    return () => clearInterval(timer)
  }, [hasActiveJob, onRefresh])

  const profile = useMemo(
    () => capabilities?.profiles?.find(item => item.id === engagement.executionProfile) || engagement.executionCapacity,
    [capabilities, engagement.executionCapacity, engagement.executionProfile],
  )

  const runAction = async (kind, action) => {
    setBusy(kind)
    setError('')
    setMessage('')
    try {
      const result = await action()
      if (result?.canceled) setMessage('Operation canceled. No evidence was changed.')
      else if (kind === 'manifest') setMessage(`Signed execution manifest exported // ${result.manifestId}`)
      else setMessage(`Evidence sealed into capture // ${result.captureId}`)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy('')
    }
  }

  const startNative = async () => {
    setBusy('run')
    setError('')
    setMessage('')
    try {
      await onStartJob({ engagementId: engagement.id, toolId: 'nmap', target, attested })
      setAttested(false)
      setMessage('Managed Nmap job queued. Live process output is streaming below.')
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy('')
    }
  }

  const cancelNative = async () => {
    if (!activeJob) return
    setError('')
    try {
      await onCancelJob(activeJob.id)
      setMessage('Stop requested. DaemonCore is terminating the managed process.')
    } catch (caught) {
      setError(caught.message)
    }
  }

  return <section className="execution-fabric">
    <header className="fabric-hero">
      <div>
        <span>FIELDOPS // EXECUTION FABRIC</span>
        <h2>Your tools.<br/><em>One signed operation.</em></h2>
        <p>Execute supported tools as managed background jobs, watch process output live, stop safely, and seal successful results into the engagement evidence chain.</p>
      </div>
      <div className="fabric-profile">
        <Gauge/>
        <span>EXECUTION PROFILE</span>
        <strong>{profile?.label || engagement.executionProfile || 'Guarded'}</strong>
        <small>{profile?.maxTargets || 100} TARGETS // {profile?.maxPorts || 128} PORTS // {profile?.portConcurrency || 4} SURVEY WORKERS</small>
      </div>
    </header>

    <div className="fabric-strip">
      <div><TerminalSquare/><span>DISCOVERED</span><strong>{capabilities?.available ?? '—'} / {capabilities?.total ?? '—'}</strong></div>
      <div><ShieldCheck/><span>PERMIT</span><strong>{engagement.permit ? 'SIGNED' : 'LEGACY'}</strong></div>
      <div><Network/><span>SCOPE</span><strong>{engagement.targets.length} × {engagement.ports.length}</strong></div>
      <button disabled={busy === 'refresh'} onClick={() => load(true)}><RefreshCw/> Rescan workstation</button>
    </div>

    <section className="native-console">
      <header><div><TerminalSquare/><span>MANAGED NATIVE EXECUTION</span><h3>Nmap service inventory</h3></div><strong className={activeJob ? 'live' : ''}>{activeJob ? activeJob.status.toUpperCase() : 'READY'}</strong></header>
      <div className="native-controls">
        <label>PINNED AUTHORIZED TARGET<select value={target} onChange={event => setTarget(event.target.value)}>{engagement.targets.map(item => <option key={item}>{item}</option>)}</select></label>
        <div><span>DECLARED PORT SET</span><strong>{engagement.ports.length} PORTS</strong><small>{engagement.ports.slice(0, 18).join(', ')}{engagement.ports.length > 18 ? '…' : ''}</small></div>
        <label className="native-attest"><input type="checkbox" checked={attested} onChange={event => setAttested(event.target.checked)}/><span>{attested && <Check/>}</span><p>This run is authorized by the active signed permit.</p></label>
        {activeJob ? <button className="stop" onClick={cancelNative} disabled={activeJob.status === 'cancelling'}><Square/> {activeJob.status === 'cancelling' ? 'STOPPING' : 'STOP JOB'}</button> : <button onClick={startNative} disabled={!attested || busy === 'run' || !runnerAvailable}><Play/> {busy === 'run' ? 'QUEUING' : 'RUN NMAP'}</button>}
      </div>
      <div className="native-output">
        <div><span>{latestJob ? `${latestJob.toolLabel.toUpperCase()} // ${latestJob.target} → ${latestJob.address}` : 'NO JOB SELECTED'}</span><strong>{latestJob?.engine?.toUpperCase() || 'WAITING'}</strong><em>{latestJob?.outcome || 'Start an authorized run to open the live process channel.'}</em></div>
        <pre>{latestJob?.output || '$ DaemonCore native runner ready.\n$ Scope and permit checks will run before process launch.'}</pre>
        {latestJob?.captureId && <footer><ShieldCheck/> RESULT SEALED // CAPTURE {latestJob.captureId.slice(0, 8)}</footer>}
      </div>
    </section>

    <div className="fabric-grid">
      {(capabilities?.tools || []).map(tool => <article className={tool.available ? 'available' : ''} key={tool.id}>
        <div className="fabric-tool-mark">{tool.available ? <Check/> : <Wrench/>}</div>
        <span>{tool.category} // {tool.integration === 'native' ? 'NATIVE ADAPTER' : 'EVIDENCE BRIDGE'}</span>
        <h3>{tool.label}</h3>
        <p>{tool.purpose}</p>
        <small>{tool.available ? tool.version : 'NOT DISCOVERED ON THIS WORKSTATION'}</small>
        <button onClick={() => {
          setSelectedTool(tool.id)
          runAction('manifest', () => onExportManifest({ engagementId: engagement.id, toolId: tool.id }))
        }} disabled={Boolean(busy)}><Download/> Export signed scope</button>
      </article>)}
    </div>

    <section className="fabric-intake">
      <div><Database/><span>EVIDENCE INTAKE</span><h3>Bring external results back under chain of custody.</h3><p>DaemonCore never executes imported content. It validates JSON, records the source hash, binds it to an authorized target, and seals the complete document as a reviewable capture.</p></div>
      <label>TOOL SOURCE<select value={selectedTool} onChange={event => setSelectedTool(event.target.value)}>{(capabilities?.tools || []).map(tool => <option key={tool.id} value={tool.id}>{tool.label}</option>)}</select></label>
      <label>AUTHORIZED TARGET<select value={target} onChange={event => setTarget(event.target.value)}>{engagement.targets.map(item => <option key={item}>{item}</option>)}</select></label>
      <button disabled={Boolean(busy) || !selectedTool} onClick={() => runAction('import', () => onImportEvidence({ engagementId: engagement.id, toolId: selectedTool, target }))}><FileInput/> {busy === 'import' ? 'SEALING EVIDENCE' : 'Import JSON / SARIF'} <ArrowRight/></button>
    </section>

    {error && <div className="fabric-message error">BLOCKED // {error}</div>}
    {message && <div className="fabric-message"><Activity/> {message}</div>}
    <footer><ShieldCheck/><p><strong>Native execution is permit-bound and attributable.</strong> DaemonCore passes a fixed argument array directly to the tool—never through a command shell—pins resolved destinations, retains job history, and seals completed output as evidence. External workload testing remains governed by the approved test plan.</p></footer>
  </section>
}
