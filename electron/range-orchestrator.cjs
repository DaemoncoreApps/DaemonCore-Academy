const { execFile } = require('child_process')
const { createHash, randomBytes, randomUUID } = require('crypto')
const { readFile } = require('fs/promises')
const path = require('path')
const { fingerprintPack, sealReceipt } = require('./range-integrity.cjs')
const { caseVariantFor, contractFor, debriefFor, matchesObjective, normalizeMode, publicContract, MODES } = require('./adaptive-range.cjs')

const CHAOS_WORKER = 'dc-ghost-chaos'
const ALLOWED_SCENARIOS = new Set(['ghost-port', 'broken-trust', 'night-shift', 'token-afterlife', 'policy-collision', 'artifact-zero', 'identity-citadel', 'web-range', 'enterprise-range'])

function runDocker(args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile('docker', args, {
      cwd: options.cwd,
      windowsHide: true,
      timeout: options.timeout || 30_000,
      maxBuffer: 2 * 1024 * 1024,
      encoding: 'utf8',
    }, (error, stdout = '', stderr = '') => {
      if (error) {
        error.stdout = stdout
        error.stderr = stderr
        reject(error)
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

class RangeOrchestrator {
  constructor(rangeRoot) {
    this.rangeRoot = rangeRoot
    this.activeScenario = null
    this.activeReceipt = null
    this.activeSession = null
    this.executions = new Map()
    this.operation = Promise.resolve()
  }

  scenarioPath(id) {
    if (!ALLOWED_SCENARIOS.has(id)) throw new Error('Unknown range scenario')
    return path.join(this.rangeRoot, id)
  }

  composeArgs(id, ...args) {
    return ['compose', '--project-name', `daemoncore-${id}`, '--file', path.join(this.scenarioPath(id), 'compose.yaml'), ...args]
  }

  containers(manifest) {
    return [...new Set([...(manifest.containers || []), manifest.operatorContainer, manifest.targetContainer, manifest.chaosWorkerContainer].filter(Boolean))]
  }

  async availability() {
    try {
      const { stdout } = await runDocker(['version', '--format', '{{.Server.Version}}'], { timeout: 8_000 })
      return { available: true, engine: 'docker', version: stdout.trim() }
    } catch (error) {
      const missing = error.code === 'ENOENT'
      const detail = `${error.message || ''} ${error.stderr || ''}`
      const denied = error.code === 'EACCES' || /permission denied|docker\.sock|access is denied/i.test(detail)
      return {
        available: false,
        engine: 'docker',
        reason: missing
          ? 'Docker is not installed or is not on PATH.'
          : denied
            ? 'Docker is installed, but this account cannot access the engine. Check Docker socket or group permissions and sign in again.'
            : 'Docker is installed, but its engine is not running.',
      }
    }
  }

  async manifest(id) {
    return JSON.parse(await readFile(path.join(this.scenarioPath(id), 'scenario.json'), 'utf8'))
  }

  async packIndex() {
    const index = JSON.parse(await readFile(path.join(this.rangeRoot, 'index.json'), 'utf8'))
    return { ...index, packs: index.packs.filter(pack => ALLOWED_SCENARIOS.has(pack.id)) }
  }

  async verifyPack(id) {
    this.scenarioPath(id)
    const index = await this.packIndex()
    const entry = index.packs.find(pack => pack.id === id)
    if (!entry) throw new Error('Range pack is not present in the integrity index')
    const current = await fingerprintPack(this.scenarioPath(id))
    if (current.digest !== entry.digest) throw new Error('Range pack integrity verification failed')
    return { verified: true, algorithm: index.algorithm, digest: current.digest, fileCount: current.fileCount, totalBytes: current.totalBytes, pack: entry }
  }

  async diagnostics() {
    const index = await this.packIndex()
    const packResults = await Promise.all(index.packs.map(async pack => {
      try { const result = await this.verifyPack(pack.id); return { id: pack.id, title: pack.title, status: 'pass', digest: result.digest, fileCount: result.fileCount, totalBytes: result.totalBytes } }
      catch (error) { return { id: pack.id, title: pack.title, status: 'fail', reason: error.message } }
    }))
    const availability = await this.availability()
    let compose = { available: false, version: null }
    if (availability.available) {
      try { const { stdout } = await runDocker(['compose', 'version', '--short'], { timeout: 8_000 }); compose = { available: true, version: stdout.trim() } } catch (error) { compose = { available: false, reason: error.message } }
    }
    return {
      ready: availability.available && compose.available && packResults.every(pack => pack.status === 'pass'),
      checkedAt: new Date().toISOString(),
      runtime: availability,
      compose,
      packs: packResults,
      policy: { internalNetwork: true, hostMounts: 0, egressBlocked: true, publishedPorts: 0 },
    }
  }

  async status() {
    const availability = await this.availability()
    if (!availability.available) return { ...availability, state: 'offline' }
    if (!this.activeScenario) return { ...availability, state: 'ready' }
    try {
      const manifest = await this.manifest(this.activeScenario)
      const { stdout } = await runDocker(['inspect', '--format', '{{.State.Running}}', manifest.operatorContainer], { timeout: 5_000 })
      return { ...availability, state: stdout.trim() === 'true' ? 'sealed' : 'stopped', scenario: this.activeScenario }
    } catch {
      return { ...availability, state: 'stopped', scenario: this.activeScenario }
    }
  }

  receipt() {
    if (!this.activeReceipt) throw new Error('No active range receipt is available')
    return JSON.parse(JSON.stringify(this.activeReceipt))
  }

  async waitForHealthy(manifest) {
    for (let attempt = 0; attempt < 45; attempt += 1) {
      try {
        const { stdout } = await runDocker(['inspect', '--format', '{{.State.Health.Status}}', manifest.targetContainer], { timeout: 5_000 })
        if (stdout.trim() === 'healthy') return
        if (stdout.trim() === 'unhealthy') throw new Error('Range target failed its health check')
      } catch (error) {
        if (error.message === 'Range target failed its health check') throw error
      }
      await delay(1_000)
    }
    throw new Error('Range target did not become healthy in time')
  }

  async verifyContainment(manifest) {
    const { stdout: internal } = await runDocker(['network', 'inspect', manifest.network, '--format', '{{.Internal}}'])
    if (internal.trim() !== 'true') throw new Error('Containment check failed: range network is not internal')

    for (const container of this.containers(manifest)) {
      const { stdout } = await runDocker(['inspect', container, '--format', '{{json .Mounts}}'])
      const mounts = JSON.parse(stdout.trim() || '[]')
      const hostMounts = mounts.filter(mount => mount.Type === 'bind' || mount.Type === 'volume')
      if (hostMounts.length !== 0) throw new Error(`Containment check failed: ${container} has a host mount`)
    }

    let egressBlocked = false
    try {
      await runDocker(['exec', manifest.operatorContainer, 'sh', '-lc', 'curl --silent --show-error --max-time 2 https://example.com >/dev/null 2>&1'], { timeout: 5_000 })
    } catch {
      egressBlocked = true
    }
    if (!egressBlocked) throw new Error('Containment check failed: internet egress is reachable')

    return { internalNetwork: true, hostMounts: 0, egressBlocked: true, network: manifest.network }
  }

  async start(id, options = {}) {
    return this.serialize(async () => {
      const mode = normalizeMode(options.mode)
      const availability = await this.availability()
      if (!availability.available) throw new Error(availability.reason)
      const integrity = await this.verifyPack(id)
      await this.stopInternal()
      const cwd = this.scenarioPath(id)
      const manifest = await this.manifest(id)
      try {
        await runDocker(this.composeArgs(id, 'up', '--detach', '--build', '--remove-orphans'), { cwd, timeout: 8 * 60_000 })
        await this.waitForHealthy(manifest)
        const containment = await this.verifyContainment(manifest)
        this.activeScenario = id
        const startedAt = new Date().toISOString()
        const seed = randomBytes(6).toString('hex').toUpperCase()
        const receipt = sealReceipt({ schemaVersion: 2, receiptId: randomUUID(), scenario: id, mode, seed, startedAt, runtime: { engine: availability.engine, version: availability.version }, pack: { algorithm: integrity.algorithm, digest: integrity.digest, fileCount: integrity.fileCount }, containment, operatorContainer: manifest.operatorContainer, targetContainer: manifest.targetContainer })
        this.activeReceipt = receipt
        this.activeSession = { sessionId: randomUUID(), scenario: id, mode, seed, startedAt, hints: [], evidence: [], caseVariant: caseVariantFor(id, seed), stats: { executions: 0, failedExecutions: 0, rejectedEvidence: 0 } }
        this.executions.clear()
        return { state: 'sealed', scenario: id, containment, integrity, receipt, manifest, session: this.sessionSnapshot(), contract: publicContract(id) }
      } catch (error) {
        let targetLogs = ''
        try {
          const { stdout, stderr } = await runDocker(['logs', '--tail', '120', manifest.targetContainer], { timeout: 8_000 })
          targetLogs = `${stdout}${stderr}`.trim()
        } catch {}
        await this.stopInternal(id).catch(() => {})
        const cause = error.stderr?.trim() || error.message || 'Range startup failed'
        throw new Error(targetLogs ? `${cause}\n\nTARGET STARTUP LOG\n${targetLogs}` : cause)
      }
    })
  }

  async execute(id, command) {
    if (id !== this.activeScenario) throw new Error('This range is not active')
    if (this.activeSession?.completed) throw new Error('This adaptive mission is already complete')
    if (typeof command !== 'string' || !command.trim()) return { stdout: '', stderr: '', exitCode: 0 }
    if (command.length > 4_096) throw new Error('Command exceeds the range console limit')
    const manifest = await this.manifest(id)
    try {
      const { stdout, stderr } = await runDocker(['exec', manifest.operatorContainer, 'sh', '-lc', command], { timeout: 45_000 })
      return this.recordExecution(command, stdout, stderr, 0)
    } catch (error) {
      return this.recordExecution(command, error.stdout || '', error.stderr || error.message || 'Command failed', Number.isInteger(error.code) ? error.code : 1)
    }
  }

  recordExecution(command, stdout, stderr, exitCode) {
    if (!this.activeSession) throw new Error('No adaptive mission session is active')
    this.activeSession.stats ||= { executions: 0, failedExecutions: 0, rejectedEvidence: 0 }
    const execution = { executionId: randomUUID(), command, stdout, stderr, exitCode, at: new Date().toISOString() }
    execution.digest = createHash('sha256').update(JSON.stringify(execution)).digest('hex')
    this.executions.set(execution.executionId, execution)
    this.activeSession.stats.executions += 1
    if (exitCode !== 0) this.activeSession.stats.failedExecutions += 1
    while (this.executions.size > 200) this.executions.delete(this.executions.keys().next().value)
    return { ...execution }
  }

  sessionSnapshot() {
    if (!this.activeSession) throw new Error('No adaptive mission session is active')
    return JSON.parse(JSON.stringify(this.activeSession))
  }

  contract(id) {
    this.scenarioPath(id)
    return publicContract(id)
  }

  validateObjective(id, objectiveIndex, executionId) {
    if (id !== this.activeScenario || !this.activeSession) throw new Error('This adaptive mission is not active')
    if (this.activeSession.completed) throw new Error('This adaptive mission is already complete')
    const index = Number(objectiveIndex)
    if (!Number.isInteger(index) || index < 0) throw new Error('Invalid mission objective')
    if (index !== this.activeSession.evidence.length) throw new Error('Mission objectives must be proven in order')
    const execution = this.executions.get(executionId)
    if (!execution) throw new Error('Evidence must reference an execution from this active run')
    if (execution.exitCode !== 0) { this.activeSession.stats.rejectedEvidence += 1; return { accepted: false, objectiveIndex: index, reason: 'The evidence command did not exit successfully.' } }
    const output = `${execution.stdout}\n${execution.stderr}`
    if (!matchesObjective(id, index, output)) { this.activeSession.stats.rejectedEvidence += 1; return { accepted: false, objectiveIndex: index, reason: 'The latest output does not yet prove this objective.' } }
    const definition = contractFor(id).objectives[index]
    const evidence = { objectiveIndex: index, label: definition.label, evidence: definition.evidence, executionId, executionDigest: execution.digest, acceptedAt: new Date().toISOString() }
    this.activeSession.evidence.push(evidence)
    return { accepted: true, evidence, progress: this.activeSession.evidence.length, total: contractFor(id).objectives.length }
  }

  requestHint(id) {
    if (id !== this.activeScenario || !this.activeSession) throw new Error('This adaptive mission is not active')
    if (this.activeSession.completed) throw new Error('This adaptive mission is already complete')
    const mode = MODES[this.activeSession.mode]
    if (this.activeSession.hints.length >= mode.hints) throw new Error(this.activeSession.mode === 'professional' ? 'Professional mode does not provide hints.' : 'No more guidance is available for this run.')
    const index = Math.min(this.activeSession.evidence.length, contractFor(id).objectives.length - 1)
    const entry = { objectiveIndex: index, text: contractFor(id).objectives[index].hint, requestedAt: new Date().toISOString(), penalty: 75 }
    this.activeSession.hints.push(entry)
    return { ...entry, used: this.activeSession.hints.length, remaining: mode.hints - this.activeSession.hints.length }
  }

  completeMission(id) {
    if (id !== this.activeScenario || !this.activeSession) throw new Error('This adaptive mission is not active')
    if (this.activeSession.completed) return JSON.parse(JSON.stringify(this.activeSession.completed))
    const contract = contractFor(id)
    if (this.activeSession.evidence.length !== contract.objectives.length) throw new Error('Every objective needs accepted evidence before mission completion')
    const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(this.activeSession.startedAt)) / 1000))
    const mode = MODES[this.activeSession.mode]
    const rawScore = contract.baseScore - this.activeSession.hints.length * 75 - Math.floor(seconds / 60) * 10
    const score = Math.max(250, Math.round(rawScore * mode.multiplier))
    const evidenceDigest = createHash('sha256').update(JSON.stringify(this.activeSession.evidence)).digest('hex')
    const debrief = debriefFor(id, this.activeSession, seconds, this.executions.size)
    const summary = { schemaVersion: 2, sessionId: this.activeSession.sessionId, scenario: id, mode: this.activeSession.mode, seed: this.activeSession.seed, caseVariant: this.activeSession.caseVariant, startedAt: this.activeSession.startedAt, completedAt: new Date().toISOString(), seconds, hints: this.activeSession.hints.length, score, evidenceDigest, objectives: this.activeSession.evidence, debrief }
    const receipt = sealReceipt({ ...summary, type: 'adaptive-mission-result', receiptId: randomUUID(), launchReceiptDigest: this.activeReceipt?.digest || null })
    this.activeSession.completed = { ...summary, receipt }
    return JSON.parse(JSON.stringify(this.activeSession.completed))
  }

  normalizeChaosPlan(input = {}) {
    const clamp = (value, minimum, maximum, fallback) => Math.max(minimum, Math.min(maximum, Math.round(Number(value) || fallback)))
    const profile = String(input.profile || 'ramp')
    if (!['baseline', 'ramp', 'spike', 'soak'].includes(profile)) throw new Error('Unsupported sealed-range Chaos profile')
    return {
      profile,
      durationSeconds: clamp(input.durationSeconds, 10, 60, 20),
      requestsPerSecond: clamp(input.requestsPerSecond, 10, 500, 100),
      concurrency: clamp(input.concurrency, 1, 100, 25),
      p95LimitMs: clamp(input.p95LimitMs, 100, 10_000, 1_000),
      errorRateLimit: clamp(input.errorRateLimit, 1, 80, 20),
    }
  }

  async chaosStatus() {
    if (this.activeScenario !== 'ghost-port') return { state: 'offline', status: 'idle', reason: 'The sealed range is not active.' }
    try {
      const { stdout } = await runDocker(['exec', CHAOS_WORKER, 'cat', '/tmp/daemoncore-chaos.json'], { timeout: 5_000 })
      return { state: 'sealed', ...JSON.parse(stdout.trim()) }
    } catch {
      return { state: 'sealed', status: 'idle', phase: 'standby' }
    }
  }

  async startChaos(input) {
    if (this.activeScenario !== 'ghost-port') throw new Error('Start the sealed Ghost Port range before arming Chaos Engine')
    const current = await this.chaosStatus()
    if (['running', 'recovering'].includes(current.status)) throw new Error('A sealed-range Chaos experiment is already active')
    const plan = this.normalizeChaosPlan(input)
    await runDocker(['exec', CHAOS_WORKER, 'sh', '-lc', 'rm -f /tmp/daemoncore-chaos.json /tmp/daemoncore-chaos.json.tmp /tmp/daemoncore-chaos.stop'])
    await runDocker(['exec', '--detach', CHAOS_WORKER, 'node', '/opt/chaos/load-runner.mjs', plan.profile, String(plan.durationSeconds), String(plan.requestsPerSecond), String(plan.concurrency), String(plan.p95LimitMs), String(plan.errorRateLimit)])
    for (let attempt = 0; attempt < 25; attempt += 1) {
      await delay(100)
      const status = await this.chaosStatus()
      if (status.status !== 'idle') return status
    }
    throw new Error('The sealed Chaos Worker did not publish startup telemetry')
  }

  async abortChaos() {
    if (this.activeScenario !== 'ghost-port') throw new Error('The sealed range is not active')
    await runDocker(['exec', CHAOS_WORKER, 'touch', '/tmp/daemoncore-chaos.stop'], { timeout: 5_000 })
    return this.chaosStatus()
  }

  async stopInternal(id) {
    const scenarios = id ? [id] : this.activeScenario ? [this.activeScenario] : [...ALLOWED_SCENARIOS]
    for (const scenario of scenarios) {
      if (!ALLOWED_SCENARIOS.has(scenario)) continue
      try {
        await runDocker(this.composeArgs(scenario, 'down', '--volumes', '--remove-orphans', '--timeout', '3'), { cwd: this.scenarioPath(scenario), timeout: 60_000 })
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
    }
    this.activeScenario = null
    this.activeReceipt = null
    this.activeSession = null
    this.executions.clear()
    return { state: 'stopped' }
  }

  async stop() {
    return this.serialize(() => this.stopInternal())
  }

  serialize(operation) {
    const next = this.operation.then(operation, operation)
    this.operation = next.catch(() => {})
    return next
  }
}

module.exports = { RangeOrchestrator }
