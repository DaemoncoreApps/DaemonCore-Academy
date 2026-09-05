import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const run = promisify(execFile)
const root = fileURLToPath(new URL('..', import.meta.url))
const probe = path.join(root, 'scripts', 'data-store-process-probe.cjs')
const directory = await mkdtemp(path.join(tmpdir(), 'daemoncore-process-restart-'))
const require = createRequire(import.meta.url)
const { DataStore } = require('../electron/data-store.cjs')

try {
  const first = JSON.parse((await run(process.execPath, [probe, directory, 'onboard', 'restart_test'])).stdout)
  assert.equal(first.handle, 'RESTART_TEST')

  const reopened = JSON.parse((await run(process.execPath, [probe, directory, 'snapshot'])).stdout)
  assert.equal(reopened.handle, 'RESTART_TEST')
  assert.equal(reopened.createdAt, first.createdAt)

  const migrationDirectory = await mkdtemp(path.join(tmpdir(), 'daemoncore-fallback-migration-'))
  try {
    const store = new DataStore(migrationDirectory)
    await store.initialize()
    const migrated = await store.migrateFallback({ schemaVersion: 6, profile: { handle: 'browser_backup', xp: 240, completedLessons: ['rules-of-engagement'] } })
    assert.equal(migrated.profile.handle, 'BROWSER_BACKUP')
    assert.equal(migrated.profile.xp, 240)
    const reloaded = new DataStore(migrationDirectory)
    assert.equal((await reloaded.initialize()).profile.handle, 'BROWSER_BACKUP')
  } finally {
    await rm(migrationDirectory, { recursive: true, force: true })
  }

  const [preload, main, app] = await Promise.all([
    readFile(path.join(root, 'electron', 'preload.cjs'), 'utf8'),
    readFile(path.join(root, 'electron', 'main.cjs'), 'utf8'),
    readFile(path.join(root, 'src', 'App.jsx'), 'utf8'),
  ])
  assert.doesNotMatch(preload, /require\(['"]\.\.\/package\.json['"]\)/)
  assert.match(preload, /sendSync\('app:version'\)/)
  assert.match(preload, /data:migrate-fallback/)
  assert.match(main, /ipcMain\.on\('app:version'/)
  assert.match(main, /data:migrate-fallback/)
  assert.match(app, /version as packageVersion/)
  assert.match(app, /window\.daemoncore\?\.version\|\|packageVersion/)
  assert.doesNotMatch(app, /6\.0 PREVIEW/)
  assert.match(app, /api\.migrateFallback\(fallback\)/)
  assert.match(app, /localStorage\.setItem\('daemoncore-state-v1'/)

  console.log('Desktop persistence verified // sandbox-safe preload, two-process restart, browser fallback migration, and mirrored recovery state')
} finally {
  await rm(directory, { recursive: true, force: true })
}
