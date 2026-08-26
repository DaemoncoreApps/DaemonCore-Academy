import assert from 'node:assert/strict'
import { course } from '../src/content.js'

assert.equal(course.lessons.length,20)
assert.ok(course.estimatedMinutes>=900)
for(const lesson of course.lessons){
  assert.ok(['FOUNDATION','PRACTITIONER'].includes(lesson.level),`${lesson.id} needs a level`)
  assert.ok(lesson.outcome?.length>=40,`${lesson.id} needs a concrete outcome`)
  assert.ok(lesson.objectives?.length>=3,`${lesson.id} needs at least three objectives`)
  assert.ok(lesson.prerequisites?.length>=2,`${lesson.id} needs prerequisites`)
  assert.equal(lesson.steps?.length,lesson.sections.length,`${lesson.id} needs one workshop step per section`)
  for(const workshop of lesson.steps){
    assert.ok(workshop.title?.length>=8)
    assert.ok(workshop.instruction?.length>=45)
    assert.ok(workshop.command?.length>=12)
    assert.ok(workshop.expected?.length>=12)
    assert.ok(workshop.analysis?.length>=45)
  }
  assert.ok(lesson.exercise?.brief?.length>=40,`${lesson.id} needs an operator exercise`)
  assert.ok(lesson.exercise?.deliverable?.length>=30,`${lesson.id} needs a deliverable`)
  assert.ok(lesson.exercise?.success?.length>=3,`${lesson.id} needs success criteria`)
  assert.ok(lesson.references?.length>=1,`${lesson.id} needs primary references`)
  assert.ok(lesson.references.every(reference=>reference.url.startsWith('https://')))
}

console.log(`Phase 6 verified // ${course.lessons.length} practical lessons, ${course.estimatedMinutes} minutes, commands, artifacts, and primary references`)
