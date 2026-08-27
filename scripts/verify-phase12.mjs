import assert from 'node:assert/strict'
import { capstones, masteryDomains, deriveMastery, buildRemediation } from '../src/mastery-data.js'
import { course } from '../src/content.js'

assert.equal(capstones.length, 3)
assert.equal(masteryDomains.length, 6)
assert.equal(new Set(capstones.map(capstone => capstone.id)).size, 3)
assert.equal(capstones.reduce((total, capstone) => total + capstone.nodes.length, 0), 15)
assert.ok(capstones.reduce((total, capstone) => total + capstone.duration, 0) >= 240)
const lessonIds = new Set(course.lessons.map(lesson => lesson.id))
assert.ok(masteryDomains.every(domain => domain.lessonIds.every(id => lessonIds.has(id))), 'Every adaptive route must resolve to a real lesson')

for (const capstone of capstones) {
  assert.equal(capstone.nodes.length, 5)
  assert.ok(capstone.domains.length >= 4)
  assert.ok(capstone.brief.length >= 120)
  assert.ok(capstone.outcome.length >= 100)
  for (const node of capstone.nodes) {
    assert.equal(node.choices.length, 3)
    assert.ok(node.answer >= 0 && node.answer < node.choices.length)
    assert.ok(node.artifact.length >= 100)
    assert.ok(node.feedback.length >= 100)
    assert.ok(node.choices[node.answer].impact > 0)
    assert.ok(node.choices[node.answer].domains.length >= 1)
  }
}

const empty = { completedLessons: [], lessonAttempts: [], capstoneAttempts: [] }
assert.ok(deriveMastery(empty).every(domain => domain.score === 0 && domain.status === 'UNMEASURED'))
assert.equal(buildRemediation(empty).length, 3)

const measured = {
  completedLessons: ['active-directory-graphs'],
  lessonAttempts: [{ lessonId: 'active-directory-graphs', practicalScore: 80 }],
  capstoneAttempts: [{ capstoneId: 'night-glass', score: 80, domainScores: { identity: 100, evidence: 60 } }],
}
const identity = deriveMastery(measured).find(domain => domain.id === 'identity')
assert.equal(identity.score, 91)
assert.equal(identity.status, 'MASTERED')
assert.equal(identity.evidence, 2)
const fullStandardScore = Math.round(deriveMastery(measured).reduce((sum, domain) => sum + domain.score, 0) / masteryDomains.length)
assert.equal(fullStandardScore, 25, 'Unmeasured domains must remain visible in the full-standard score')

console.log('Phase 12 verified // 3 capstones // 15 evidence decisions // 6 adaptive mastery domains')
