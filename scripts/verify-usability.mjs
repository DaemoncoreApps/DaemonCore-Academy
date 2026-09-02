import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [app, guide, lesson, store, onboarding, warRoom, warRoomStyles] = await Promise.all([
  read('src/App.jsx'),
  read('src/AcademyGuide.jsx'),
  read('src/phase2.jsx'),
  read('electron/data-store.cjs'),
  read('src/production.jsx'),
  read('src/FieldOpsWarRoom.jsx'),
  read('src/fieldops-war-room.css'),
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
assert.match(warRoom, /OPERATOR.*PERMIT.*WINDOW.*EVIDENCE/s)
assert.match(warRoom, /DECLARE.*ACQUIRE.*PROVE/s)
assert.match(warRoom, /Diagnostics.*Campaigns.*Evidence vault.*Findings.*Chaos Engine/s)
assert.match(warRoom, /document\.querySelector\('\.fieldops-layout'\)\?\.scrollIntoView/)
assert.match(warRoomStyles, /prefers-reduced-motion:reduce/)
assert.match(warRoomStyles, /war-module-deck>button\.active/)

console.log('Usability contract verified // first-run guide, command boundaries, guided range handoff, persistent next action, and FieldOps command routing')
