import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'

const require = createRequire(import.meta.url)
const { RangeOrchestrator } = require('../electron/range-orchestrator.cjs')
const { CONTRACTS, MODES, matchesObjective, normalizeMode, publicContract } = require('../electron/adaptive-range.cjs')
const { sealReceipt, verifyReceipt } = require('../electron/range-integrity.cjs')

assert.deepEqual(Object.keys(MODES), ['guided', 'assisted', 'blind', 'professional'])
assert.equal(Object.keys(CONTRACTS).length, 7)
assert.ok(Object.values(CONTRACTS).every(contract => contract.objectives.length === 4))
assert.equal(normalizeMode(), 'assisted')
assert.throws(() => normalizeMode('speedrun'), /Unknown mission mode/)
const exposed = publicContract('ghost-port')
assert.equal(exposed.objectives.length, 4)
assert.equal('patterns' in exposed.objectives[0], false, 'validator patterns must stay behind the desktop bridge')

assert.equal(matchesObjective('ghost-port', 0, 'dc-archive-02 22/tcp 445/tcp'), true)
assert.equal(matchesObjective('ghost-port', 1, '8088/tcp open http'), true)
assert.equal(matchesObjective('ghost-port', 1, '8088/tcp closed http'), false)

const range = new RangeOrchestrator(process.cwd())
range.activeScenario = 'ghost-port'
range.activeReceipt = sealReceipt({ schemaVersion: 2, receiptId: 'launch', scenario: 'ghost-port' })
range.activeSession = { sessionId: 'session-test', scenario: 'ghost-port', mode: 'blind', seed: 'A1B2C3D4E5F6', startedAt: new Date().toISOString(), hints: [], evidence: [] }

const executions = [
  range.recordExecution('awk investigation', 'dc-archive-02 22/tcp 445/tcp', '', 0),
  range.recordExecution('custom scanner', '8088/tcp open http', '', 0),
  range.recordExecution('inspect service', '{"service":"Archive Console","authentication":false}', '', 0),
  range.recordExecution('submit finding', 'FINDING ACCEPTED\nScope adherence: VERIFIED', '', 0),
]
assert.throws(() => range.validateObjective('ghost-port', 1, executions[1].executionId), /in order/)
for (const [index, execution] of executions.entries()) {
  const result = range.validateObjective('ghost-port', index, execution.executionId)
  assert.equal(result.accepted, true)
  assert.equal(result.evidence.objectiveIndex, index)
  assert.match(result.evidence.executionDigest, /^[a-f0-9]{64}$/)
}
const completed = range.completeMission('ghost-port')
assert.equal(completed.mode, 'blind')
assert.equal(completed.objectives.length, 4)
assert.match(completed.evidenceDigest, /^[a-f0-9]{64}$/)
assert.equal(verifyReceipt(completed.receipt), true)
assert.equal(verifyReceipt({ ...completed.receipt, score: 1 }), false)
assert.deepEqual(range.completeMission('ghost-port'), completed, 'mission completion must be idempotent')
await assert.rejects(() => range.execute('ghost-port', 'echo late'), /already complete/)

range.activeSession = { sessionId: 'pro-test', scenario: 'ghost-port', mode: 'professional', seed: 'ABCDEF123456', startedAt: new Date().toISOString(), hints: [], evidence: [] }
assert.throws(() => range.requestHint('ghost-port'), /does not provide hints/)

const modalCss = await readFile(new URL('../src/adaptive-range.css', import.meta.url), 'utf8')
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
const closeSource = await readFile(new URL('../src/ModalClose.jsx', import.meta.url), 'utf8')
assert.match(modalCss, /\.modal-close\{[^}]*width:48px;[^}]*height:48px/)
assert.match(modalCss, /\.modal-close:focus-visible/)
assert.match(appSource, /event\.key!==['"]Escape['"]/)
assert.match(closeSource, /aria-label=/)

console.log('Phase 16 verified // adaptive modes, backend evidence validation, sealed results, and reliable modal controls')
