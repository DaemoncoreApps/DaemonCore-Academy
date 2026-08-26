import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { DataStore } = require('../electron/data-store.cjs')
const directory = await mkdtemp(path.join(tmpdir(), 'daemoncore-data-'))

try {
  const store = new DataStore(directory)
  let state = await store.initialize()
  assert.equal(state.profile.handle, null)
  assert.equal(state.profile.xp, 0)
  assert.equal(state.profile.activity.length, 0)

  state = await store.onboard('night_shift')
  assert.equal(state.profile.handle, 'NIGHT_SHIFT')
  await assert.rejects(() => store.onboard('second'), /already exists/)

  await store.record({ type: 'lesson', id: 'rules-of-engagement', title: 'Scope and rules of engagement', minutes: 18 })
  await store.record({ type: 'drill', id: 'protocol-recognition', title: 'Protocol recognition', correct: 3, total: 3 })
  state = await store.record({ type: 'mission', id: 'ghost-port', title: 'The Ghost Port', score: 430, hints: 0, seconds: 240 })
  assert.equal(state.profile.xp, 970)
  assert.deepEqual(state.profile.completedLessons, ['rules-of-engagement'])
  assert.deepEqual(state.profile.completedMissions, ['ghost-port'])
  assert.equal(state.profile.weeklyMinutes, 18)
  assert.ok(state.profile.achievements.includes('clean-sweep'))
  assert.ok(state.profile.achievements.includes('evidence-led'))

  const reloaded = new DataStore(directory)
  state = await reloaded.initialize()
  assert.equal(state.profile.xp, 970)
  assert.equal(state.profile.drillAttempts.length, 1)
  assert.equal(state.profile.missionAttempts.length, 1)

  await reloaded.updateSettings({ reduceMotion: true, compactMode: true })
  await writeFile(reloaded.file, '{broken json', 'utf8')
  const recovered = new DataStore(directory)
  state = await recovered.initialize()
  assert.equal(state.profile.handle, 'NIGHT_SHIFT')
  assert.equal(state.profile.xp, 970)

  const persisted = JSON.parse(await readFile(recovered.file, 'utf8'))
  assert.equal(persisted.schemaVersion, 1)
  console.log('Operator record verified // atomic write, reload, and backup recovery')
} finally {
  await rm(directory, { recursive: true, force: true })
}
