import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { webCourse, webLessons } from '../src/web-curriculum.js'
import { webLabCatalog } from '../src/web-labs.js'

assert.equal(webLessons.length, 27, 'Web specialist path must ship 27 lessons')
assert.equal(webCourse.estimatedMinutes, 1485, 'Web specialist path must contain 24h45m of instruction')
assert.ok(webLessons.every(lesson => lesson.sections.length === 4 && lesson.steps.length === 4), 'Every Web lesson needs four instructional sections and workshops')
assert.ok(webLessons.every(lesson => lesson.objectives.length >= 3 && lesson.references.length >= 2 && lesson.check.options.length === 4), 'Every Web lesson needs objectives, sources, and validation')
assert.ok(webLessons.every(lesson => lesson.interactive?.nodes?.length >= 3), 'Every Web lesson needs an interactive decision room')
assert.equal(new Set(webLessons.map(lesson => lesson.id)).size, webLessons.length, 'Lesson ids must be unique')

assert.equal(webLabCatalog.length, 22, 'Web Forge must ship 22 live conditions')
assert.equal(new Set(webLabCatalog.map(lab => lab.id)).size, webLabCatalog.length, 'Lab ids must be unique')
assert.ok(webLabCatalog.every(lab => lab.steps.length === 4 && lab.submission && lab.hint), 'Every lab needs four steps, a submission, and guidance')
assert.ok(webLessons.every(lesson => webLabCatalog.some(lab => lab.id === lesson.labId)), 'Every lesson must map to a live lab')

const synchronized=JSON.parse(await readFile(new URL('../ranges/web-range/labs.json', import.meta.url),'utf8'))
assert.deepEqual(synchronized.map(lab=>lab.id),webLabCatalog.map(lab=>lab.id),'Docker scenario contracts must match the application catalog')
const compose=await readFile(new URL('../ranges/web-range/compose.yaml',import.meta.url),'utf8')
assert.match(compose,/internal:\s*true/)
assert.match(compose,/cap_drop:\s*\[ALL\]/)
assert.match(compose,/read_only:\s*true/)
assert.doesNotMatch(compose,/ports:/)
assert.doesNotMatch(compose,/volumes:/)

console.log(`Phase 13 verified: ${webLessons.length} lessons, ${webCourse.estimatedMinutes} minutes, ${webLabCatalog.length} sealed Web Forge conditions`)
