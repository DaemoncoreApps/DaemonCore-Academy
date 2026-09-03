import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, Check, Database, Download, FileInput, Gauge, Network, RefreshCw, ShieldCheck, TerminalSquare, Wrench } from 'lucide-react'

export function ExecutionFabric({ engagement, onCapabilities, onExportManifest, onImportEvidence }) {
  const [capabilities, setCapabilities] = useState(null)
  const [selectedTool, setSelectedTool] = useState('nmap')
  const [target, setTarget] = useState(engagement.targets[0])
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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

  return <section className="execution-fabric">
    <header className="fabric-hero">
      <div>
        <span>FIELDOPS // EXECUTION FABRIC</span>
        <h2>Your tools.<br/><em>One signed operation.</em></h2>
        <p>Discover the workstation toolchain, export machine-readable scope for customer-controlled runners, and seal third-party JSON or SARIF output into the engagement evidence chain.</p>
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
    <footer><ShieldCheck/><p><strong>Professional freedom stays attributable.</strong> Execution manifests carry the exact signed targets, ports, policy, capacity, operator fingerprint, and validity window. High-intensity workloads remain the responsibility of the customer-controlled runner and its approved test plan.</p></footer>
  </section>
}
