import {createHash} from 'node:crypto'
import {readdir,readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
const root=path.join(process.cwd(),'ranges'),entries=[]
for(const item of await readdir(root,{withFileTypes:true})){
  if(!item.isDirectory())continue
  try{
    const scenario=await readFile(path.join(root,item.name,'scenario.json')),compose=await readFile(path.join(root,item.name,'compose.yaml')),manifest=JSON.parse(scenario)
    const digest=createHash('sha256').update(scenario).update('\0').update(compose).digest('hex')
    entries.push({id:manifest.id,title:manifest.title,engine:manifest.engine,digest,scenarioBytes:scenario.length,composeBytes:compose.length})
  }catch{}
}
entries.sort((a,b)=>a.id.localeCompare(b.id))
await writeFile(path.join(root,'index.json'),`${JSON.stringify({schemaVersion:1,algorithm:'sha256',generatedAt:new Date().toISOString(),packs:entries},null,2)}\n`,'utf8')
console.log(`Indexed ${entries.length} content-addressed range packs`)
