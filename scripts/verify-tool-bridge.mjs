import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require=createRequire(import.meta.url)
const {ToolBridge,nmapArguments,parseNmapXml}=require('../electron/tool-bridge.cjs')

const xml=`<?xml version="1.0"?>
<nmaprun scanner="nmap" version="7.98"><host><status state="up" reason="conn-refused"/><address addr="192.168.50.10" addrtype="ipv4"/><ports>
<port protocol="tcp" portid="22"><state state="open" reason="syn-ack"/><service name="ssh" product="OpenSSH" version="9.8" method="probed" conf="10"><cpe>cpe:/a:openbsd:openssh:9.8</cpe></service></port>
<port protocol="tcp" portid="443"><state state="closed" reason="conn-refused"/><service name="https" method="table" conf="3"/></port>
</ports><times srtt="100"/></host><runstats><finished elapsed="1.42"/></runstats></nmaprun>`

const parsed=parseNmapXml(xml)
assert.equal(parsed.scannerVersion,'7.98')
assert.deepEqual(parsed.host,{address:'192.168.50.10',addressType:'ipv4',state:'up',reason:'conn-refused'})
assert.equal(parsed.ports[0].product,'OpenSSH')
assert.equal(parsed.ports[0].confidence,10)
assert.deepEqual(parsed.ports[0].cpe,['cpe:/a:openbsd:openssh:9.8'])
assert.deepEqual(parsed.summary,{tested:2,open:1,elapsedSeconds:1.42})

const args=nmapArguments('192.168.50.10',[443,22,443])
assert.equal(args.at(-1),'192.168.50.10')
assert.equal(args[args.indexOf('-p')+1],'22,443')
assert.throws(()=>nmapArguments('example.com',[443]),/pinned IP/)
assert.throws(()=>nmapArguments('192.168.50.10',[]),/1 to 128/)

const calls=[]
const bridge=new ToolBridge({execute:async(file,command)=>{calls.push({file,command});if(command[0]==='--version')return{stdout:'Nmap version 7.98\n',stderr:''};return{stdout:xml,stderr:''}}})
const result=await bridge.inventory({address:'192.168.50.10',ports:[22,443]})
assert.equal(result.engine,'native-nmap')
assert.equal(result.profile,'deep-service-version')
assert.equal(result.ports[0].service,'ssh')
assert.equal(calls[1].file,'nmap')
assert.ok(calls[1].command.includes('--version-all'))
assert.ok(calls[1].command.includes('-sT'))

const dockerCalls=[]
const dockerBridge=new ToolBridge({execute:async(file,command)=>{dockerCalls.push({file,command});if(file==='nmap')throw new Error('not installed');if(command[0]==='version')return{stdout:'27.2.0\n',stderr:''};return{stdout:xml,stderr:''}}})
const dockerResult=await dockerBridge.inventory({address:'192.168.50.10',ports:[22]})
assert.equal(dockerResult.engine,'docker-nmap')
assert.deepEqual(dockerCalls[2].command.slice(0,3),['run','--rm','instrumentisto/nmap:7.98-r2'])

console.log('Tool Bridge verified // pinned targets, declared ports, native Nmap, Docker fallback, and structured XML evidence')
