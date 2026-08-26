import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { RangeOrchestrator } = require('../electron/range-orchestrator.cjs')
const root = process.cwd()
const rangeRoot = path.join(root, 'ranges')
const compose = await readFile(path.join(rangeRoot, 'ghost-port', 'compose.yaml'), 'utf8')
const scenario = JSON.parse(await readFile(path.join(rangeRoot, 'ghost-port', 'scenario.json'), 'utf8'))

assert.equal(scenario.schemaVersion, 1)
assert.equal(scenario.id, 'ghost-port')
assert.equal(scenario.networkPolicy, 'internal-only')
assert.equal(scenario.objectives.length, 4)
assert.match(compose, /internal:\s*true/)
assert.doesNotMatch(compose, /^\s+ports:/m)
assert.doesNotMatch(compose, /^\s+volumes:/m)
assert.doesNotMatch(compose, /privileged:\s*true/)
assert.equal((compose.match(/cap_drop:\s*\[ALL\]/g) || []).length, 2)
assert.equal((compose.match(/no-new-privileges:true/g) || []).length, 2)

const orchestrator = new RangeOrchestrator(rangeRoot)
assert.deepEqual(await orchestrator.manifest('ghost-port'), scenario)
await assert.rejects(() => orchestrator.manifest('../outside'), /Unknown range scenario/)
const availability = await orchestrator.availability()
assert.equal(typeof availability.available, 'boolean')
assert.equal(availability.engine, 'docker')

console.log(`Range contract verified // docker ${availability.available ? availability.version : 'offline'}`)
