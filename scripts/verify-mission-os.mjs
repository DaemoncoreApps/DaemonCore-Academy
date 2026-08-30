import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const missionOS = require('../shared/mission-os.json')
const { DataStore } = require('../electron/data-store.cjs')
const { caseVariantFor, debriefFor } = require('../electron/adaptive-range.cjs')

assert.equal(missionOS.domains.length, 6)
assert.equal(missionOS.questions.length, 12)
assert.equal(new Set(missionOS.questions.map(question => question.id)).size, 12)
assert.equal(missionOS.pathways.length, 6)
assert.deepEqual(missionOS.flagshipMissions, ['ghost-port', 'broken-trust', 'night-shift'])
for (const domain of missionOS.domains) assert.equal(missionOS.questions.filter(question => question.domain === domain.id).length, 2)
for (const pathway of missionOS.pathways) {
  assert.equal(pathway.stages.length, 3)
  assert.ok(Object.values(pathway.weights).every(weight => Number.isInteger(weight) && weight > 0))
}
assert.equal(caseVariantFor('ghost-port', '000000000001').id, caseVariantFor('ghost-port', '000000000001').id)
assert.equal(caseVariantFor('identity-citadel', '000000000001'), null)
const debrief = debriefFor('ghost-port', { evidence: [{}, {}, {}, {}], hints: [], stats: { failedExecutions: 0, rejectedEvidence: 0 } }, 600, 5)
assert.equal(debrief.overall, 100)
assert.equal(debrief.dimensions.length, 4)

const directory = await mkdtemp(path.join(tmpdir(), 'daemoncore-mission-os-'))
try {
  const store = new DataStore(directory)
  await store.initialize()
  await store.onboard('route_test')
  const correctAnswers = Object.fromEntries(missionOS.questions.map(question => [question.id, question.answer]))
  let state = await store.updateMissionOS({ action: 'assessment', answers: correctAnswers })
  assert.equal(state.schemaVersion, 6)
  assert.equal(state.profile.missionOS.assessment.overall, 100)
  assert.ok(missionOS.pathways.some(pathway => pathway.id === state.profile.missionOS.assessment.recommendedPathway))
  assert.ok(Object.values(state.profile.missionOS.assessment.scores).every(result => result.score === 100))
  state = await store.updateMissionOS({ action: 'select-pathway', pathwayId: 'detection-response' })
  assert.equal(state.profile.missionOS.selectedPathway, 'detection-response')
  const reloaded = new DataStore(directory)
  state = await reloaded.initialize()
  assert.equal(state.profile.missionOS.selectedPathway, 'detection-response')
  await assert.rejects(() => reloaded.updateMissionOS({ action: 'select-pathway', pathwayId: 'made-up-role' }), /Unknown/)
  await assert.rejects(() => reloaded.updateMissionOS({ action: 'assessment', answers: {} }), /missing or invalid/)
  state = await reloaded.updateMissionOS({ action: 'reset-assessment' })
  assert.equal(state.profile.missionOS.assessment, null)
  console.log('Mission OS verified // six routes, scored diagnostic, durable operator state')
} finally {
  await rm(directory, { recursive: true, force: true })
}
