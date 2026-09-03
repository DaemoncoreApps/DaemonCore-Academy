const { execFile, spawn } = require('child_process')
const { randomBytes } = require('crypto')

const NMAP_IMAGE = 'instrumentisto/nmap:7.98-r2'

const TOOL_CATALOG = Object.freeze([
  { id: 'nmap', label: 'Nmap', category: 'Discovery', command: 'nmap', versionArgs: ['--version'], integration: 'native', purpose: 'Service and version inventory' },
  { id: 'docker', label: 'Docker Engine', category: 'Runtime', command: 'docker', versionArgs: ['version', '--format', '{{.Server.Version}}'], integration: 'native', purpose: 'Contained adapters and Academy ranges' },
  { id: 'nuclei', label: 'Nuclei', category: 'Validation', command: 'nuclei', versionArgs: ['-version'], integration: 'evidence', purpose: 'Template-driven assessment evidence' },
  { id: 'k6', label: 'Grafana k6', category: 'Resilience', command: 'k6', versionArgs: ['version'], integration: 'evidence', purpose: 'Customer-managed performance evidence' },
  { id: 'locust', label: 'Locust', category: 'Resilience', command: 'locust', versionArgs: ['--version'], integration: 'evidence', purpose: 'Customer-managed workload evidence' },
  { id: 'tshark', label: 'Wireshark / TShark', category: 'Network', command: 'tshark', versionArgs: ['--version'], integration: 'evidence', purpose: 'Packet and protocol evidence' },
  { id: 'hashcat', label: 'Hashcat', category: 'Credential audit', command: 'hashcat', versionArgs: ['--version'], integration: 'evidence', purpose: 'Offline credential-audit evidence' },
])

function execute(file, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout
        error.stderr = stderr
        reject(error)
        return
      }
      resolve({ stdout: String(stdout), stderr: String(stderr) })
    })
  })
}

function spawnExecution(file, args, options = {}) {
  const child = spawn(file, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = '', stderr = '', settled = false, timeout
  const maxBytes = options.maxBytes || 8 * 1024 * 1024
  const append = (channel, chunk) => {
    const text = String(chunk)
    if (channel === 'stdout') stdout = (stdout + text).slice(-maxBytes)
    else stderr = (stderr + text).slice(-maxBytes)
    options.onOutput?.({ channel, text, at: new Date().toISOString() })
  }
  child.stdout.on('data', chunk => append('stdout', chunk))
  child.stderr.on('data', chunk => append('stderr', chunk))
  const completion = new Promise((resolve, reject) => {
    child.once('error', error => {
      settled = true
      clearTimeout(timeout)
      reject(error)
    })
    child.once('close', (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (code === 0) resolve({ stdout, stderr, code, signal })
      else {
        const error = new Error(signal ? `Tool process stopped by ${signal}` : `Tool process exited with code ${code}`)
        error.stdout = stdout
        error.stderr = stderr
        error.code = code
        error.signal = signal
        reject(error)
      }
    })
  })
  if (options.timeoutMs) timeout = setTimeout(() => child.kill('SIGTERM'), options.timeoutMs)
  return {
    pid: child.pid,
    completion,
    cancel: () => {
      if (settled) return false
      child.kill('SIGTERM')
      setTimeout(() => { if (!settled) child.kill('SIGKILL') }, 2_000).unref()
      return true
    },
  }
}

const decodeXml = value => String(value || '')
  .replaceAll('&quot;', '"')
  .replaceAll('&apos;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&amp;', '&')

function attributes(source) {
  return Object.fromEntries([...String(source || '').matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], decodeXml(match[2])]))
}

function parseNmapXml(xml) {
  const run = attributes(xml.match(/<nmaprun\b([^>]*)>/)?.[1])
  const status = attributes(xml.match(/<status\b([^>]*)\/?\s*>/)?.[1])
  const address = attributes(xml.match(/<address\b([^>]*)\/?\s*>/)?.[1])
  const ports = [...xml.matchAll(/<port\b([^>]*)>([\s\S]*?)<\/port>/g)].map(match => {
    const port = attributes(match[1]), body = match[2], state = attributes(body.match(/<state\b([^>]*)\/?\s*>/)?.[1]), service = attributes(body.match(/<service\b([^>]*)>/)?.[1] || body.match(/<service\b([^>]*)\/?\s*>/)?.[1])
    return {
      protocol: port.protocol || 'tcp',
      port: Number(port.portid),
      state: state.state || 'unknown',
      reason: state.reason || null,
      service: service.name || null,
      product: service.product || null,
      version: service.version || null,
      extraInfo: service.extrainfo || null,
      tunnel: service.tunnel || null,
      method: service.method || null,
      confidence: service.conf ? Number(service.conf) : null,
      cpe: [...body.matchAll(/<cpe>([^<]+)<\/cpe>/g)].map(item => decodeXml(item[1])).slice(0, 10),
    }
  })
  const finished = attributes(xml.match(/<finished\b([^>]*)\/?\s*>/)?.[1])
  return {
    scanner: run.scanner || 'nmap',
    scannerVersion: run.version || null,
    host: { address: address.addr || null, addressType: address.addrtype || null, state: status.state || 'unknown', reason: status.reason || null },
    ports,
    summary: { tested: ports.length, open: ports.filter(item => item.state === 'open').length, elapsedSeconds: finished.elapsed ? Number(finished.elapsed) : null },
  }
}

function nmapArguments(address, ports, maxPorts = 128) {
  if (!/^[0-9a-f:.]+$/i.test(address)) throw new Error('Tool Bridge requires a pinned IP address')
  if (!Array.isArray(ports) || !ports.length || ports.length > maxPorts || ports.some(port => !Number.isInteger(port) || port < 1 || port > 65535)) throw new Error(`Tool Bridge requires 1 to ${maxPorts} authorized ports`)
  return ['-sT', '-Pn', '-n', '--reason', '-sV', '--version-all', '--max-retries', '2', '--host-timeout', '5m', '-p', [...new Set(ports)].sort((a, b) => a - b).join(','), '-oX', '-', address]
}

class ToolBridge {
  constructor(options = {}) {
    this.execute = options.execute || execute
    this.spawnExecution = options.spawnExecution || spawnExecution
    this.image = options.image || NMAP_IMAGE
    this.capabilityCache = null
  }

  async selectEngine() {
    try {
      const probe = await this.execute('nmap', ['--version'], 10_000)
      return { kind: 'native-nmap', file: 'nmap', prefix: [], version: probe.stdout.split(/\r?\n/)[0] || 'Nmap' }
    } catch {}
    try {
      const probe = await this.execute('docker', ['version', '--format', '{{.Server.Version}}'], 15_000)
      return { kind: 'docker-nmap', file: 'docker', prefix: ['run', '--rm', this.image], version: `Docker ${probe.stdout.trim()} // ${this.image}` }
    } catch {
      throw new Error('Nmap Tool Bridge is unavailable. Install Nmap or start the Docker engine, then run this operation again.')
    }
  }

  async capabilities(options = {}) {
    const now = Date.now()
    if (!options.refresh && this.capabilityCache && now - this.capabilityCache.checkedAtMs < 60_000) return this.capabilityCache.value
    const tools = await Promise.all(TOOL_CATALOG.map(async tool => {
      try {
        const result = await this.execute(tool.command, tool.versionArgs, 10_000)
        const version = `${result.stdout || ''}\n${result.stderr || ''}`.trim().split(/\r?\n/).find(Boolean) || 'Available'
        return { id: tool.id, label: tool.label, category: tool.category, purpose: tool.purpose, integration: tool.integration, available: true, version: version.slice(0, 180) }
      } catch {
        return { id: tool.id, label: tool.label, category: tool.category, purpose: tool.purpose, integration: tool.integration, available: false, version: null }
      }
    }))
    const value = { checkedAt: new Date().toISOString(), tools, available: tools.filter(tool => tool.available).length, total: tools.length }
    this.capabilityCache = { checkedAtMs: now, value }
    return value
  }

  async inventory({ address, ports, maxPorts = 128, timeoutMs = 360_000 }) {
    const engine = await this.selectEngine(), args = nmapArguments(address, ports, maxPorts)
    try {
      const result = await this.execute(engine.file, [...engine.prefix, ...args], timeoutMs)
      const parsed = parseNmapXml(result.stdout)
      if (!parsed.ports.length && !/<nmaprun\b/.test(result.stdout)) throw new Error('The engine returned no Nmap XML')
      return { engine: engine.kind, engineVersion: engine.version, profile: 'deep-service-version', invocation: { scan: 'TCP connect', hostDiscovery: 'disabled', dns: 'disabled', serviceDetection: 'all probes', retries: 2, timeout: '5m' }, ...parsed }
    } catch (error) {
      const detail = String(error.stderr || error.message || 'Unknown Tool Bridge failure').trim().slice(0, 500)
      throw new Error(`Nmap Tool Bridge failed: ${detail}`)
    }
  }

  async startInventory({ address, ports, maxPorts = 128, timeoutMs = 360_000, onOutput }) {
    const engine = await this.selectEngine()
    const args = nmapArguments(address, ports, maxPorts)
    const containerName = engine.kind === 'docker-nmap' ? `daemoncore-nmap-${randomBytes(8).toString('hex')}` : null
    const command = containerName ? ['run', '--rm', '--name', containerName, this.image, '--stats-every', '2s', ...args] : ['--stats-every', '2s', ...args]
    const execution = this.spawnExecution(engine.file, command, { timeoutMs: containerName ? 0 : timeoutMs, onOutput })
    let timedOut = false
    const cancel = containerName ? () => {
      this.execute('docker', ['stop', '--time', '2', containerName], 10_000).catch(() => {}).finally(() => execution.cancel())
      return true
    } : execution.cancel
    const timeout = containerName ? setTimeout(() => { timedOut = true; cancel() }, timeoutMs) : null
    const completion = execution.completion.finally(() => clearTimeout(timeout)).catch(error => {
      if (timedOut) throw new Error('Nmap Tool Bridge exceeded the signed execution timeout')
      throw error
    })
    return {
      engine: engine.kind,
      engineVersion: engine.version,
      pid: execution.pid,
      cancel,
      completion: completion.then(result => {
        const parsed = parseNmapXml(result.stdout)
        if (!parsed.ports.length && !/<nmaprun\b/.test(result.stdout)) throw new Error('The engine returned no Nmap XML')
        return { engine: engine.kind, engineVersion: engine.version, profile: 'deep-service-version', invocation: { scan: 'TCP connect', hostDiscovery: 'disabled', dns: 'disabled', serviceDetection: 'all probes', retries: 2, timeout: '5m' }, ...parsed }
      }),
    }
  }
}

module.exports = { ToolBridge, TOOL_CATALOG, NMAP_IMAGE, nmapArguments, parseNmapXml, spawnExecution }
