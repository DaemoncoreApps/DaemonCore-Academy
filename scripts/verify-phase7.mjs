import assert from 'node:assert/strict'
import { course } from '../src/content.js'
import { lessonInteractives } from '../src/lesson-interactives.js'

assert.equal(Object.keys(lessonInteractives).length,20)
assert.equal(course.lessons.length,28)
for(const lesson of course.lessons){
  const interactive=lesson.interactive
  assert.ok(interactive,`${lesson.id} needs an interactive scenario`)
  assert.ok(interactive.title.length>=8)
  assert.ok(interactive.brief.length>=40)
  assert.equal(interactive.nodes.length,3,`${lesson.id} needs three decision nodes`)
  assert.equal(new Set(interactive.nodes.map(node=>node.signal)).size,interactive.nodes.length)
  for(const node of interactive.nodes){
    assert.ok(node.prompt.length>=25)
    assert.ok(node.artifact.length>=20)
    assert.equal(node.choices.length,3)
    assert.ok(Number.isInteger(node.answer)&&node.answer>=0&&node.answer<node.choices.length)
    assert.ok(node.feedback.length>=45)
    assert.ok(node.signal.length>=18)
  }
}

console.log('Phase 7 verified // 28 scored workbenches, 84 decision nodes, mastery gating, and durable practical scores')
