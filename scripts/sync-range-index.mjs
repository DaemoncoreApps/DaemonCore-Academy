import {createRequire} from 'node:module'
import {readdir,readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
const require=createRequire(import.meta.url)
const {fingerprintPack}=require('../electron/range-integrity.cjs')
const root=path.join(process.cwd(),'ranges'),entries=[]
for(const item of await readdir(root,{withFileTypes:true})){
  if(!item.isDirectory())continue
  try{
    const scenario=await readFile(path.join(root,item.name,'scenario.json')),manifest=JSON.parse(scenario)
    const fingerprint=await fingerprintPack(path.join(root,item.name))
    entries.push({id:manifest.id,title:manifest.title,engine:manifest.engine,...fingerprint})
  }catch{}
}
entries.sort((a,b)=>a.id.localeCompare(b.id))
await writeFile(path.join(root,'index.json'),`${JSON.stringify({schemaVersion:2,algorithm:'sha256-tree-v1',generatedAt:new Date().toISOString(),packs:entries},null,2)}\n`,'utf8')
console.log(`Indexed ${entries.length} content-addressed range packs`)
