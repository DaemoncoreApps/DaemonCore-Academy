import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { executionPolicy } = require('../electron/execution-policy.cjs')
const { EngagementStore } = require('../electron/engagement-store.cjs')
const { ToolBridge } = require('../electron/tool-bridge.cjs')
const { TrustAuthority } = require('../electron/trust-authority.cjs')

assert.equal(executionPolicy('guarded').maxPorts, 128)
assert.equal(executionPolicy('professional').maxTargets, null)
assert.equal(executionPolicy('professional').maxPorts, null)
assert.equal(executionPolicy('professional').portConcurrency, 16)
assert.throws(() => executionPolicy('unbounded'), /supported execution profile/)

const directory = await mkdtemp(path.join(tmpdir(), 'daemoncore-fabric-'))
const safeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: value => Buffer.from(value, 'utf8'),
  decryptString: value => value.toString('utf8'),
  getSelectedStorageBackend: () => 'dpapi',
}
const now = new Date('2026-09-02T18:00:00.000Z')

try {
  const trust = new TrustAuthority(directory, { safeStorage, platform: 'win32', now: () => now })
  await trust.initialize()
  await trust.enroll({ fullName: 'Morgan Chen', organization: 'Example Security', email: 'morgan@example.com', role: 'Principal Tester' })

  const execute = async (file, args) => ({ stdout: `${file} ${args.join(' ')} version 1.0\n`, stderr: '' })
  const toolBridge = new ToolBridge({ execute })
  const fieldops = new EngagementStore(directory, { entitlement: () => ({ fieldOps: true }), trust, toolBridge, now: () => now })
  await fieldops.initialize()

  const ports = Array.from({ length: 129 }, (_, index) => index + 1).join(',')
  const state = await fieldops.create({
    name: 'Professional execution review',
    client: 'Example Corp',
    authorizationReference: 'SOW-EXEC-204',
    approverName: 'Jordan Rivera',
    approverEmail: 'jordan@example.com',
    policyLevel: 'stress',
    executionProfile: 'professional',
    networkMode: 'external',
    targets: 'app.example.com',
    ports,
    validFrom: '2026-09-02T17:00:00.000Z',
    validUntil: '2026-09-03T17:00:00.000Z',
    attested: true,
  })
  const engagement = state.engagements[0]
  assert.equal(engagement.executionProfile, 'professional')
  assert.equal(engagement.ports.length, 129)
  assert.equal(engagement.permit.executionProfile, 'professional')
  assert.equal(engagement.permit.executionCapacity.maxPorts, 129)
  assert.equal(engagement.permit.capacityChallenge, engagement.capacityChallenge)

  fieldops.resolveAuthorized = async () => [{ address: '93.184.216.34', family: 4 }]
  fieldops.getJson = async () => ({
    challenge: engagement.capacityChallenge,
    target: 'app.example.com',
    authorizationReference: 'SOW-EXEC-204',
    maxRequestsPerSecond: 500,
    maxDurationSeconds: 900,
    maxConcurrency: 80,
    validUntil: '2026-09-03T16:00:00.000Z',
  })
  await fieldops.verifyCapacityGrant({ engagementId: engagement.id, target: 'app.example.com', port: 80, secure: true })
  const loadBundle = await fieldops.createExecutionManifest({ engagementId: engagement.id, toolId: 'k6', target: 'app.example.com', path: '/health', secure: true, requestsPerSecond: 500, durationSeconds: 900, concurrency: 80 })
  assert.equal(loadBundle.manifest.workload.capacityGrant.digest.length, 64)
  assert.equal(loadBundle.manifest.workload.emergencyStopRequired, true)
  await assert.rejects(() => fieldops.createExecutionManifest({ engagementId: engagement.id, toolId: 'k6', target: 'app.example.com', path: '/', secure: true, requestsPerSecond: 501, durationSeconds: 60, concurrency: 20 }), /verified 500 req\/s grant/)

  const capabilities = await fieldops.capabilities()
  assert.equal(capabilities.tools.length, 7)
  assert.equal(capabilities.available, 7)
  assert.equal(capabilities.profiles.length, 2)

  const bundle = await fieldops.createExecutionManifest({ engagementId: engagement.id, toolId: 'nuclei' })
  assert.equal(bundle.manifest.scope.ports.length, 129)
  assert.equal(bundle.manifest.execution.profile, 'professional')
  assert.equal(TrustAuthority.verify(bundle.attestation, bundle.manifest), true)
  bundle.manifest.scope.ports.push(65535)
  assert.equal(TrustAuthority.verify(bundle.attestation, bundle.manifest), false)

  const sarif = { version: '2.1.0', runs: [{ tool: { driver: { name: 'Nuclei' } }, results: [{ ruleId: 'example-check', message: { text: 'Synthetic result' } }] }] }
  const capture = await fieldops.importToolEvidence({ engagementId: engagement.id, target: 'app.example.com', toolId: 'nuclei', fileName: 'review.sarif', format: 'sarif', document: sarif })
  assert.equal(capture.type, 'tool-evidence')
  assert.equal(capture.result.summary.results, 1)
  assert.equal(fieldops.snapshot().captureIntegrity, true)
  await assert.rejects(() => fieldops.importToolEvidence({ engagementId: engagement.id, target: 'outside.example.com', toolId: 'nuclei', format: 'json', document: {} }), /outside the signed engagement/)

  const tampered = structuredClone(engagement)
  tampered.executionProfile = 'guarded'
  assert.throws(() => fieldops.assertOperation(tampered, 'validate'), /no longer matches/)

  const [main, preload, ui] = await Promise.all([
    readFile(new URL('../electron/main.cjs', import.meta.url), 'utf8'),
    readFile(new URL('../electron/preload.cjs', import.meta.url), 'utf8'),
    readFile(new URL('../src/ExecutionFabric.jsx', import.meta.url), 'utf8'),
  ])
  assert.match(main, /fieldops:evidence-import/)
  assert.match(preload, /exportExecutionManifest/)
  assert.match(main, /fieldops:tool-job-start/)
  assert.match(preload, /startToolJob/)
  assert.match(preload, /verifyCapacityGrant/)
  assert.match(ui, /MANAGED NATIVE EXECUTION/)
  assert.match(ui, /VERIFIED LOAD AUTHORITY/)

  console.log('Execution Fabric verified // professional capacity, tool discovery, signed manifests, evidence intake, tamper rejection, and exact-scope enforcement')
} finally {
  await rm(directory, { recursive: true, force: true })
}
