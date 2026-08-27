const { execFile } = require('child_process')
const { createHash } = require('crypto')
const { readFile } = require('fs/promises')
const path = require('path')

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
      return {
        available: false,
        engine: 'docker',
        reason: missing ? 'Docker Desktop is not installed or is not on PATH.' : 'Docker Desktop is installed but its engine is not running.',
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
    const scenario = await readFile(path.join(this.scenarioPath(id), 'scenario.json'))
    const compose = await readFile(path.join(this.scenarioPath(id), 'compose.yaml'))
    const digest = createHash('sha256').update(scenario).update('\0').update(compose).digest('hex')
    if (digest !== entry.digest) throw new Error('Range pack integrity verification failed')
    return { verified: true, algorithm: index.algorithm, digest, pack: entry }
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

  async start(id) {
    return this.serialize(async () => {
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
        return { state: 'sealed', scenario: id, containment, integrity, manifest }
      } catch (error) {
        await this.stopInternal(id).catch(() => {})
        throw new Error(error.stderr?.trim() || error.message || 'Range startup failed')
      }
    })
  }

  async execute(id, command) {
    if (id !== this.activeScenario) throw new Error('This range is not active')
    if (typeof command !== 'string' || !command.trim()) return { stdout: '', stderr: '', exitCode: 0 }
    if (command.length > 4_096) throw new Error('Command exceeds the range console limit')
    const manifest = await this.manifest(id)
    try {
      const { stdout, stderr } = await runDocker(['exec', manifest.operatorContainer, 'sh', '-lc', command], { timeout: 45_000 })
      return { stdout, stderr, exitCode: 0 }
    } catch (error) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || 'Command failed',
        exitCode: Number.isInteger(error.code) ? error.code : 1,
      }
    }
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
