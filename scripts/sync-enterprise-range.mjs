import { mkdir,writeFile } from 'node:fs/promises'
import { enterpriseLabCatalog } from '../src/enterprise-labs.js'
const directory=new URL('../ranges/enterprise-range/',import.meta.url)
await mkdir(directory,{recursive:true})
const cases=enterpriseLabCatalog.map(lab=>({id:lab.id,title:lab.title,category:lab.category,difficulty:lab.difficulty,brief:lab.brief,submission:lab.submission,scope:{classification:'SYNTHETIC ENTERPRISE EVIDENCE',principals:[`${lab.category}_OPERATOR`,`${lab.category}_COMPARISON`],objects:[`${lab.id.toUpperCase()}_RESOURCE`],stopCondition:'one effective-control difference'},baseline:{decision:'EXPECTED_ALLOW',source:`${lab.category}_CONTROL_PLANE`,evidence:`${lab.title} documented path matches the approved principal and object`,confidence:'DIRECT'},compare:{decision:'BOUNDARY_DIFFERENCE',source:`${lab.category}_CONTROL_PLANE`,evidence:`${lab.title} comparison changes one principal, object, policy, or state variable`,confidence:'DIRECT',untested:['production impact','unlisted principals','unlisted objects']}}))
await writeFile(new URL('cases.json',directory),`${JSON.stringify(cases,null,2)}\n`,'utf8')
console.log(`Synchronized ${cases.length} Enterprise Forge cases`)
