import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {enterpriseCourses,enterpriseLessons} from '../src/enterprise-curriculum.js'
import {enterpriseLabCatalog} from '../src/enterprise-labs.js'

assert.equal(enterpriseCourses.length,6,'Enterprise Academy must ship six specialist pathways')
assert.ok(enterpriseCourses.every(course=>course.lessons.length===12&&course.estimatedMinutes===720),'Every enterprise pathway needs twelve hours of instruction')
assert.equal(enterpriseLessons.length,72,'Enterprise expansion must ship 72 lessons')
assert.equal(new Set(enterpriseLessons.map(lesson=>lesson.id)).size,72,'Enterprise lesson ids must be unique')
assert.ok(enterpriseLessons.every(lesson=>lesson.sections.length===4&&lesson.steps.length===4),'Every enterprise lesson needs four instruction and workshop stages')
assert.ok(enterpriseLessons.every(lesson=>lesson.interactive.nodes.length===3&&lesson.references.length===2),'Every enterprise lesson needs a scored review board and primary references')
assert.ok(enterpriseLessons.every(lesson=>JSON.stringify(lesson).length>4500),'Enterprise lessons must meet the depth floor')
assert.equal(enterpriseLabCatalog.length,48,'Enterprise Forge must ship 48 cases')
assert.equal(new Set(enterpriseLabCatalog.map(lab=>lab.id)).size,48,'Enterprise case ids must be unique')
assert.ok(enterpriseLabCatalog.every(lab=>lab.steps.length===4&&lab.submission&&lab.hint),'Every enterprise case needs four steps and evidence submission')
assert.ok(enterpriseLessons.every(lesson=>enterpriseLabCatalog.some(lab=>lab.id===lesson.labId)),'Every enterprise lesson must map to a shipped case')

const cases=JSON.parse(await readFile(new URL('../ranges/enterprise-range/cases.json',import.meta.url),'utf8'))
assert.deepEqual(cases.map(item=>item.id),enterpriseLabCatalog.map(item=>item.id),'Container cases must match the UI catalog')
const compose=await readFile(new URL('../ranges/enterprise-range/compose.yaml',import.meta.url),'utf8')
assert.match(compose,/internal:\s*true/);assert.match(compose,/cap_drop:\s*\[ALL\]/);assert.match(compose,/read_only:\s*true/);assert.doesNotMatch(compose,/ports:/);assert.doesNotMatch(compose,/volumes:/)
console.log(`Phase 14 verified: ${enterpriseCourses.length} pathways, ${enterpriseLessons.length} lessons, ${enterpriseLabCatalog.length} sealed enterprise cases`)
