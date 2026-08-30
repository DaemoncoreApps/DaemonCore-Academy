const { execFile } = require('child_process')

const NMAP_IMAGE = 'instrumentisto/nmap:7.98-r2'

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

function nmapArguments(address, ports) {
  if (!/^[0-9a-f:.]+$/i.test(address)) throw new Error('Tool Bridge requires a pinned IP address')
  if (!Array.isArray(ports) || !ports.length || ports.length > 128 || ports.some(port => !Number.isInteger(port) || port < 1 || port > 65535)) throw new Error('Tool Bridge requires 1 to 128 authorized ports')
  return ['-sT', '-Pn', '-n', '--reason', '-sV', '--version-all', '--max-retries', '2', '--host-timeout', '5m', '-p', [...new Set(ports)].sort((a, b) => a - b).join(','), '-oX', '-', address]
}

class ToolBridge {
  constructor(options = {}) {
    this.execute = options.execute || execute
    this.image = options.image || NMAP_IMAGE
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

  async inventory({ address, ports }) {
    const engine = await this.selectEngine(), args = nmapArguments(address, ports)
    try {
      const result = await this.execute(engine.file, [...engine.prefix, ...args], 360_000)
      const parsed = parseNmapXml(result.stdout)
      if (!parsed.ports.length && !/<nmaprun\b/.test(result.stdout)) throw new Error('The engine returned no Nmap XML')
      return { engine: engine.kind, engineVersion: engine.version, profile: 'deep-service-version', invocation: { scan: 'TCP connect', hostDiscovery: 'disabled', dns: 'disabled', serviceDetection: 'all probes', retries: 2, timeout: '5m' }, ...parsed }
    } catch (error) {
      const detail = String(error.stderr || error.message || 'Unknown Tool Bridge failure').trim().slice(0, 500)
      throw new Error(`Nmap Tool Bridge failed: ${detail}`)
    }
  }
}

module.exports = { ToolBridge, NMAP_IMAGE, nmapArguments, parseNmapXml }
