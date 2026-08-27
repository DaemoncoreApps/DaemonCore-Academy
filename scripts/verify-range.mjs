import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { RangeOrchestrator } = require('../electron/range-orchestrator.cjs')
const rangeRoot = path.join(process.cwd(), 'ranges')
const scenarioIds = ['ghost-port', 'broken-trust', 'night-shift']
const manifests = new Map()

for (const id of scenarioIds) {
  const scenarioRoot = path.join(rangeRoot, id)
  const compose = await readFile(path.join(scenarioRoot, 'compose.yaml'), 'utf8')
  const scenario = JSON.parse(await readFile(path.join(scenarioRoot, 'scenario.json'), 'utf8'))
  manifests.set(id, scenario)
  assert.equal(scenario.schemaVersion, 1)
  assert.equal(scenario.id, id)
  assert.equal(scenario.networkPolicy, 'internal-only')
  assert.equal(scenario.objectives.length, 4)
  assert.ok(scenario.operatorContainer)
  assert.ok(scenario.targetContainer)
  assert.ok(scenario.network)
  assert.match(compose, /internal:\s*true/)
  assert.doesNotMatch(compose, /^\s+ports:/m)
  assert.doesNotMatch(compose, /^\s+volumes:/m)
  assert.doesNotMatch(compose, /privileged:\s*true/)
  assert.equal((compose.match(/cap_drop:\s*\[ALL\]/g) || []).length, id === 'ghost-port' ? 3 : 2)
  assert.equal((compose.match(/no-new-privileges:true/g) || []).length, id === 'ghost-port' ? 3 : 2)
}

const ghostCompose = await readFile(path.join(rangeRoot, 'ghost-port', 'compose.yaml'), 'utf8')
assert.match(ghostCompose, /container_name:\s*dc-ghost-chaos/)
assert.match(ghostCompose, /mem_limit:\s*512m/)

const trustTarget = await readFile(path.join(rangeRoot, 'broken-trust', 'target', 'server.mjs'), 'utf8')
assert.match(trustTarget, /Bearer dc-student-token/)
assert.match(trustTarget, /'vx-104'/)
assert.match(trustTarget, /'vx-207'/)

const evidenceRoot = path.join(rangeRoot, 'night-shift', 'operator', 'evidence')
const sums = await readFile(path.join(evidenceRoot, 'SHA256SUMS'), 'utf8')
for (const filename of ['events.json', 'processes.csv']) {
  const content = await readFile(path.join(evidenceRoot, filename))
  const digest = createHash('sha256').update(content).digest('hex')
  assert.ok(sums.includes(`${digest}  /opt/evidence/${filename}`))
}

const orchestrator = new RangeOrchestrator(rangeRoot)
for (const id of scenarioIds) assert.deepEqual(await orchestrator.manifest(id), manifests.get(id))
await assert.rejects(() => orchestrator.manifest('../outside'), /Unknown range scenario/)
const availability = await orchestrator.availability()
assert.equal(typeof availability.available, 'boolean')
assert.equal(availability.engine, 'docker')
const maximum = orchestrator.normalizeChaosPlan({ profile: 'spike', durationSeconds: 999, requestsPerSecond: 9999, concurrency: 999, p95LimitMs: 99999, errorRateLimit: 99 })
assert.deepEqual(maximum, { profile: 'spike', durationSeconds: 60, requestsPerSecond: 500, concurrency: 100, p95LimitMs: 10000, errorRateLimit: 80 })
assert.throws(() => orchestrator.normalizeChaosPlan({ profile: 'flood' }), /Unsupported sealed-range/)

console.log(`Range catalog verified // 3 sealed scenarios // docker ${availability.available ? availability.version : 'offline'}`)
