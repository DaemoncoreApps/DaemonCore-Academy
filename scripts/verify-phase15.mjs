import assert from 'node:assert/strict'
import {cp, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import {additionalMissionScenarios, missionCatalog} from '../src/mission-catalog.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const require=createRequire(import.meta.url)
const {RangeOrchestrator}=require('../electron/range-orchestrator.cjs')
const identity=missionCatalog.find(mission=>mission.id==='identity-citadel')
assert.ok(identity,'Identity Citadel must ship in the mission catalog')
const scenario=additionalMissionScenarios['identity-citadel']
assert.equal(scenario.commands.length,4,'Identity Citadel needs a complete evidence sequence')
assert.match(scenario.commands.map(step=>step.command).join('\n'),/dig[\s\S]*kinit[\s\S]*ldapsearch/,'The mission must use native identity protocols')
const range=path.join(root,'ranges','identity-citadel')
const compose=await readFile(path.join(range,'compose.yaml'),'utf8')
const dockerfile=await readFile(path.join(range,'domain-controller','Dockerfile'),'utf8')
assert.match(compose,/internal:\s*true/)
assert.match(compose,/read_only:\s*true/)
assert.doesNotMatch(compose,/ports:/)
assert.doesNotMatch(compose,/volumes:/)
assert.match(compose,/cap_drop:\s*\[ALL\]/)
assert.match(dockerfile,/samba-tool domain provision/)
assert.match(dockerfile,/samba-tool[^\n]*user create/)
const orchestrator=new RangeOrchestrator(path.join(root,'ranges'))
const index=await orchestrator.packIndex()
assert.equal(index.packs.length,9,'Range Fabric must index all nine bundled packs')
assert.equal((await orchestrator.verifyPack('identity-citadel')).verified,true)
const scratch=await mkdtemp(path.join(tmpdir(),'daemoncore-pack-'))
try{
  await cp(path.join(root,'ranges'),scratch,{recursive:true})
  const candidate=path.join(scratch,'identity-citadel','compose.yaml')
  await writeFile(candidate,`${await readFile(candidate,'utf8')}\n# tampered\n`)
  const tampered=new RangeOrchestrator(scratch)
  await assert.rejects(()=>tampered.verifyPack('identity-citadel'),/integrity verification failed/)
}finally{await rm(scratch,{recursive:true,force:true})}
console.log('Phase 15 verified: protocol-native identity range, 9 indexed packs, tamper rejection')
