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
const {sealReceipt,verifyReceipt}=require('../electron/range-integrity.cjs')
const identity=missionCatalog.find(mission=>mission.id==='identity-citadel')
assert.ok(identity,'Identity Citadel must ship in the mission catalog')
const scenario=additionalMissionScenarios['identity-citadel']
assert.equal(scenario.commands.length,4,'Identity Citadel needs a complete evidence sequence')
assert.match(scenario.commands.map(step=>step.command).join('\n'),/dig[\s\S]*kinit[\s\S]*ldapsearch/,'The mission must use native identity protocols')
const range=path.join(root,'ranges','identity-citadel')
const compose=await readFile(path.join(range,'compose.yaml'),'utf8')
const dockerfile=await readFile(path.join(range,'domain-controller','Dockerfile'),'utf8')
const entrypoint=await readFile(path.join(range,'domain-controller','entrypoint.sh'),'utf8')
assert.match(compose,/internal:\s*true/)
assert.match(compose,/read_only:\s*true/)
assert.doesNotMatch(compose,/ports:/)
assert.doesNotMatch(compose,/volumes:/)
assert.doesNotMatch(compose,/privileged:\s*true/)
assert.doesNotMatch(compose,/tmpfs:\s*\[/,'tmpfs mount options must not use ambiguous inline YAML')
assert.match(compose,/cap_drop:\s*\[ALL\]/)
assert.match(compose,/cap_add:\s*\[CHOWN, DAC_OVERRIDE, NET_BIND_SERVICE, SETGID, SETUID, SYS_ADMIN\]/)
assert.match(dockerfile,/samba-ad-provision/)
assert.match(entrypoint,/samba-tool domain provision/)
assert.match(entrypoint,/samba-tool[^\n]*user create/)
const orchestrator=new RangeOrchestrator(path.join(root,'ranges'))
const index=await orchestrator.packIndex()
assert.equal(index.packs.length,9,'Range Fabric must index all nine bundled packs')
assert.equal(index.schemaVersion,2,'Range Fabric must use full-tree index schema')
assert.equal(index.algorithm,'sha256-tree-v1')
const verified=await orchestrator.verifyPack('identity-citadel')
assert.equal(verified.verified,true)
assert.ok(verified.fileCount>=7,'The complete Identity Citadel file tree must be indexed')
const diagnostics=await orchestrator.diagnostics()
assert.ok(diagnostics.packs.every(pack=>pack.status==='pass'),'Every bundled pack must pass preflight')
const receipt=sealReceipt({schemaVersion:1,scenario:'identity-citadel',pack:{digest:verified.digest},containment:{internalNetwork:true}})
assert.equal(verifyReceipt(receipt),true,'Untouched launch receipts must verify')
assert.equal(verifyReceipt({...receipt,scenario:'ghost-port'}),false,'Edited launch receipts must fail verification')
const scratch=await mkdtemp(path.join(tmpdir(),'daemoncore-pack-'))
try{
  await cp(path.join(root,'ranges'),scratch,{recursive:true})
  const candidate=path.join(scratch,'identity-citadel','domain-controller','Dockerfile')
  await writeFile(candidate,`${await readFile(candidate,'utf8')}\n# tampered\n`)
  const tampered=new RangeOrchestrator(scratch)
  await assert.rejects(()=>tampered.verifyPack('identity-citadel'),/integrity verification failed/)
  await cp(path.join(root,'ranges'),scratch,{recursive:true,force:true})
  await writeFile(path.join(scratch,'identity-citadel','untracked-payload.sh'),'echo unexpected\n')
  await assert.rejects(()=>new RangeOrchestrator(scratch).verifyPack('identity-citadel'),/integrity verification failed/)
}finally{await rm(scratch,{recursive:true,force:true})}
console.log('Phase 15 verified: full-tree packs, runtime preflight, receipt integrity, tamper and injection rejection')
