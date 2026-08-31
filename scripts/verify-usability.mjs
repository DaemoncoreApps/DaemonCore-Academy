import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [app, guide, lesson, store, onboarding] = await Promise.all([
  read('src/App.jsx'),
  read('src/AcademyGuide.jsx'),
  read('src/phase2.jsx'),
  read('electron/data-store.cjs'),
  read('src/production.jsx'),
])

assert.match(guide, /LEARN.*PRACTICE.*LAUNCH.*PROVE/s)
assert.match(guide, /Nothing on a lesson page runs against your computer or a target/)
assert.match(guide, /root@dc-/)
assert.match(app, /defaultMode=\{operator\.completedMissions\?\.length\?'assisted':'guided'\}/)
assert.match(app, /academyGuideComplete:true/)
assert.match(lesson, /REFERENCE COMMAND \/\/ NOT RUN HERE/)
assert.match(lesson, /This page does not execute them/)
assert.match(lesson, /LIVE COMMAND DESTINATION/)
assert.doesNotMatch(lesson, /RUN \/ REPRODUCE/)
assert.match(store, /academyGuideComplete: false/)
assert.match(store, /academyGuideComplete: Boolean\(next\?\.academyGuideComplete\)/)
assert.match(onboarding, /Initialize and show me around/)

console.log('Usability contract verified // first-run guide, command boundaries, guided range handoff, and persistent next action')
