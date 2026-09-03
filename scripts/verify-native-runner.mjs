import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { EngagementStore } = require('../electron/engagement-store.cjs')
const { TrustAuthority } = require('../electron/trust-authority.cjs')

const directory = await mkdtemp(path.join(tmpdir(), 'daemoncore-native-runner-'))
const now = new Date('2026-09-03T16:00:00.000Z')
const safeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: value => Buffer.from(value, 'utf8'),
  decryptString: value => value.toString('utf8'),
  getSelectedStorageBackend: () => 'dpapi',
}
const waitFor = async predicate => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const value = predicate()
    if (value) return value
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  throw new Error('Timed out waiting for native runner state')
}

try {
  const trust = new TrustAuthority(directory, { safeStorage, platform: 'win32', now: () => now })
  await trust.initialize()
  await trust.enroll({ fullName: 'Morgan Chen', organization: 'Example Security', email: 'morgan@example.com', role: 'Principal Tester' })

  let call = 0
  const toolBridge = {
    startInventory: async ({ address, ports, onOutput }) => {
      call += 1
      assert.equal(address, '93.184.216.34')
      assert.deepEqual(ports, [22, 443])
      onOutput({ channel: 'stderr', text: 'Nmap scan initiated\n', at: now.toISOString() })
      if (call === 1) return {
        engine: 'native-nmap',
        engineVersion: 'Nmap 7.98',
        pid: 4242,
        cancel: () => false,
        completion: Promise.resolve({
          engine: 'native-nmap',
          engineVersion: 'Nmap 7.98',
          host: { address, state: 'up' },
          ports: [{ protocol: 'tcp', port: 443, state: 'open', service: 'https' }],
          summary: { tested: 2, open: 1, elapsedSeconds: 0.4 },
        }),
      }
      let rejectCompletion
      const completion = new Promise((resolve, reject) => { rejectCompletion = reject })
      return {
        engine: 'native-nmap',
        engineVersion: 'Nmap 7.98',
        pid: 4343,
        cancel: () => { rejectCompletion(new Error('Tool process stopped by SIGTERM')); return true },
        completion,
      }
    },
  }
  const fieldops = new EngagementStore(directory, {
    entitlement: () => ({ fieldOps: true }),
    trust,
    toolBridge,
    now: () => now,
    lookup: async () => [{ address: '93.184.216.34', family: 4 }],
  })
  await fieldops.initialize()
  const created = await fieldops.create({
    name: 'Authorized native review',
    client: 'Example Corp',
    authorizationReference: 'SOW-NATIVE-101',
    approverName: 'Jordan Rivera',
    approverEmail: 'jordan@example.com',
    policyLevel: 'validate',
    executionProfile: 'professional',
    networkMode: 'external',
    targets: 'app.example.com',
    ports: '22,443',
    validFrom: '2026-09-03T15:00:00.000Z',
    validUntil: '2026-09-04T15:00:00.000Z',
    attested: true,
  })
  const engagementId = created.engagements[0].id

  await fieldops.startToolJob({ engagementId, toolId: 'nmap', target: 'app.example.com', attested: true })
  const completed = await waitFor(() => fieldops.snapshot().operatorJobs.find(job => job.status === 'completed'))
  assert.equal(completed.engine, 'native-nmap')
  assert.match(completed.output, /Nmap scan initiated/)
  assert.ok(completed.captureId)
  assert.equal(fieldops.snapshot().captures[0].type, 'native-tool-run')
  assert.equal(fieldops.snapshot().captureIntegrity, true)

  await fieldops.startToolJob({ engagementId, toolId: 'nmap', target: 'app.example.com', attested: true })
  const running = await waitFor(() => fieldops.snapshot().operatorJobs.find(job => job.status === 'running'))
  await fieldops.cancelToolJob(running.id)
  const cancelled = await waitFor(() => fieldops.snapshot().operatorJobs.find(job => job.id === running.id && job.status === 'cancelled'))
  assert.equal(cancelled.captureId, null)
  assert.match(cancelled.outcome, /Stopped by the operator/)

  await assert.rejects(() => fieldops.startToolJob({ engagementId, toolId: 'nuclei', target: 'app.example.com', attested: true }), /executes Nmap natively/)
  await assert.rejects(() => fieldops.startToolJob({ engagementId, toolId: 'nmap', target: 'outside.example.com', attested: true }), /outside the signed engagement/)

  console.log('Native runner verified // signed scope, pinned address, background lifecycle, live output, cancellation, and sealed evidence')
} finally {
  await rm(directory, { recursive: true, force: true })
}
