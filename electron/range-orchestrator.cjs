const { execFile } = require('child_process')
const { readFile } = require('fs/promises')
const path = require('path')

const PROJECT = 'daemoncore-ghost-port'
const NETWORK = 'dc-ghost-range'
const OPERATOR = 'dc-ghost-operator'
const TARGET = 'dc-ghost-target'
const CHAOS_WORKER = 'dc-ghost-chaos'
const ALLOWED_SCENARIOS = new Set(['ghost-port'])

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
    return ['compose', '--project-name', PROJECT, '--file', path.join(this.scenarioPath(id), 'compose.yaml'), ...args]
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

  async status() {
    const availability = await this.availability()
    if (!availability.available) return { ...availability, state: 'offline' }
    if (!this.activeScenario) return { ...availability, state: 'ready' }
    try {
      const { stdout } = await runDocker(['inspect', '--format', '{{.State.Running}}', OPERATOR], { timeout: 5_000 })
      return { ...availability, state: stdout.trim() === 'true' ? 'sealed' : 'stopped', scenario: this.activeScenario }
    } catch {
      return { ...availability, state: 'stopped', scenario: this.activeScenario }
    }
  }

  async waitForHealthy() {
    for (let attempt = 0; attempt < 45; attempt += 1) {
      try {
        const { stdout } = await runDocker(['inspect', '--format', '{{.State.Health.Status}}', TARGET], { timeout: 5_000 })
        if (stdout.trim() === 'healthy') return
        if (stdout.trim() === 'unhealthy') throw new Error('Range target failed its health check')
      } catch (error) {
        if (error.message === 'Range target failed its health check') throw error
      }
      await delay(1_000)
    }
    throw new Error('Range target did not become healthy in time')
  }

  async verifyContainment() {
    const { stdout: internal } = await runDocker(['network', 'inspect', NETWORK, '--format', '{{.Internal}}'])
    if (internal.trim() !== 'true') throw new Error('Containment check failed: range network is not internal')

    for (const container of [OPERATOR, TARGET, CHAOS_WORKER]) {
      const { stdout } = await runDocker(['inspect', container, '--format', '{{json .Mounts}}'])
      const mounts = JSON.parse(stdout.trim() || '[]')
      const hostMounts = mounts.filter(mount => mount.Type === 'bind' || mount.Type === 'volume')
      if (hostMounts.length !== 0) throw new Error(`Containment check failed: ${container} has a host mount`)
    }

    let egressBlocked = false
    try {
      await runDocker(['exec', OPERATOR, 'sh', '-lc', 'curl --silent --show-error --max-time 2 https://example.com >/dev/null 2>&1'], { timeout: 5_000 })
    } catch {
      egressBlocked = true
    }
    if (!egressBlocked) throw new Error('Containment check failed: internet egress is reachable')

    return { internalNetwork: true, hostMounts: 0, egressBlocked: true, network: NETWORK }
  }

  async start(id) {
    return this.serialize(async () => {
      const availability = await this.availability()
      if (!availability.available) throw new Error(availability.reason)
      await this.stopInternal()
      const cwd = this.scenarioPath(id)
      try {
        await runDocker(this.composeArgs(id, 'up', '--detach', '--build', '--remove-orphans'), { cwd, timeout: 8 * 60_000 })
        await this.waitForHealthy()
        const containment = await this.verifyContainment()
        this.activeScenario = id
        return { state: 'sealed', scenario: id, containment, manifest: await this.manifest(id) }
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
    try {
      const { stdout, stderr } = await runDocker(['exec', OPERATOR, 'sh', '-lc', command], { timeout: 45_000 })
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

  async stopInternal(id = this.activeScenario || 'ghost-port') {
    if (!ALLOWED_SCENARIOS.has(id)) return { state: 'stopped' }
    try {
      await runDocker(this.composeArgs(id, 'down', '--volumes', '--remove-orphans', '--timeout', '3'), { cwd: this.scenarioPath(id), timeout: 60_000 })
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    } finally {
      this.activeScenario = null
    }
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
