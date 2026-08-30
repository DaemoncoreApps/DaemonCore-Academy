import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdir,writeFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import path from 'node:path'

const require=createRequire(import.meta.url)
const {RangeOrchestrator}=require('../electron/range-orchestrator.cjs')
const root=path.resolve('ranges')
const artifacts=path.resolve('artifacts')
const range=new RangeOrchestrator(root)
const checks=[]

async function execute(name,command,expected){
  const result=await range.execute('identity-citadel',command)
  assert.equal(result.exitCode,0,`${name} failed: ${result.stderr}`)
  const output=`${result.stdout}\n${result.stderr}`.trim()
  assert.match(output,expected,`${name} returned an unexpected result`)
  checks.push({name,command,output})
}

let launch
try{
  launch=await range.start('identity-citadel')
  assert.equal(launch.state,'sealed')
  assert.equal(launch.integrity.verified,true)
  assert.equal(launch.containment.internalNetwork,true)
  assert.equal(launch.containment.hostMounts,0)
  assert.equal(launch.containment.egressBlocked,true)
  await execute('DNS service discovery','dig +short _kerberos._tcp.daemoncore.lab SRV @10.77.0.10',/88\s+dc01\.daemoncore\.lab\./i)
  await execute('Kerberos ticket acquisition',`printf 'Operator-Lab-42!\n' | kinit lab.operator@DAEMONCORE.LAB && klist`,/lab\.operator@DAEMONCORE\.LAB[\s\S]*krbtgt\/DAEMONCORE\.LAB/i)
  await execute('LDAP delegated edge',`ldapsearch -LLL -Q -Y GSSAPI -H ldap://dc01.daemoncore.lab -b 'DC=daemoncore,DC=lab' '(&(objectClass=group)(cn=Backup Operators Lab))' cn member`,/Backup Operators Lab[\s\S]*svc\.backup/i)
  await execute('SMB authentication',`smbclient -L //dc01.daemoncore.lab -U 'lab.operator%Operator-Lab-42!'`,/IPC\$/i)
  await execute('Finding acceptance',`dc-submit 'delegated backup service account expands administrative reach'`,/FINDING ACCEPTED[\s\S]*DAEMONCORE\.LAB SEALED/i)
  const report={schemaVersion:1,certification:'identity-citadel-runtime',certifiedAt:new Date().toISOString(),commit:process.env.GITHUB_SHA||null,runner:process.env.RUNNER_OS||process.platform,launchReceipt:launch.receipt,checks}
  report.digest=createHash('sha256').update(JSON.stringify(report)).digest('hex')
  await mkdir(artifacts,{recursive:true})
  await writeFile(path.join(artifacts,'identity-citadel-runtime-certification.json'),`${JSON.stringify(report,null,2)}\n`)
  console.log(`Identity Citadel runtime certified // ${checks.length} protocol checks // ${report.digest}`)
}finally{
  await range.stop().catch(error=>console.error(`Range teardown warning: ${error.message}`))
}
