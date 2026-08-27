import assert from 'node:assert/strict'
import { advancedLessons } from '../src/advanced-lessons.js'
import { course } from '../src/content.js'

assert.equal(advancedLessons.length, 8)
assert.equal(new Set(advancedLessons.map(lesson => lesson.id)).size, 8)
assert.equal(advancedLessons.reduce((total, lesson) => total + lesson.minutes, 0), 480)

for (const lesson of advancedLessons) {
  assert.equal(lesson.level, 'ADVANCED')
  assert.equal(lesson.minutes, 60)
  assert.equal(lesson.sections.length, 4)
  assert.equal(lesson.steps.length, 4)
  assert.ok(JSON.stringify(lesson).length >= 5300, `${lesson.id} is too thin for an advanced lesson`)
  assert.ok(lesson.sections.every(section => section.body.length >= 130))
  assert.ok(lesson.steps.every(workshop => workshop.analysis.length >= 65 && workshop.expected.length >= 25))
  assert.equal(lesson.interactive.nodes.length, 3)
  assert.ok(lesson.interactive.nodes.every(node => node.feedback.length >= 65 && node.signal.length >= 18))
  assert.equal(lesson.references.length, 2)
  assert.ok(lesson.references.every(reference => reference.url.startsWith('https://')))
  assert.equal(lesson.exercise.success.length, 3)
  assert.ok(lesson.check.rationale.length >= 60)
}

assert.deepEqual(course.lessons.slice(-8).map(lesson => lesson.id), advancedLessons.map(lesson => lesson.id))
console.log('Phase 11 verified // 8 advanced lessons // 32 workshops // 24 scored decisions // 480 minutes')
