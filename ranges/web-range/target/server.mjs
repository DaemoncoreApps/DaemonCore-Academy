import http from 'node:http'
import { exec } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const labs = JSON.parse(await readFile(new URL('./labs.json', import.meta.url), 'utf8'))
const byId = new Map(labs.map(lab => [lab.id, lab]))
const state = { theme:'light', passwordGeneration:1, couponUses:0, cache:null }
const json = (response, status, body, headers={}) => { response.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store',...headers});response.end(JSON.stringify(body)) }
const text = (response, status, body, headers={}) => { response.writeHead(status, {'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store',...headers});response.end(body) }
const body = request => new Promise((resolve,reject)=>{let value='';request.on('data',chunk=>{value+=chunk;if(value.length>256_000)request.destroy()});request.on('end',()=>resolve(value));request.on('error',reject)})
const token = request => String(request.headers.authorization||'').replace(/^Bearer\s+/i,'')
const run = command => new Promise(resolve=>exec(command,{timeout:1500,maxBuffer:16_384},(error,stdout,stderr)=>resolve({error:Boolean(error),stdout,stderr})))

async function fetchJson(url) {
  return new Promise((resolve,reject)=>{
    const request=http.get(url,{timeout:1500},response=>{let data='';response.on('data',chunk=>data+=chunk);response.on('end',()=>resolve({status:response.statusCode,body:data}))})
    request.on('timeout',()=>request.destroy(new Error('timeout')));request.on('error',reject)
  })
}

const server=http.createServer(async(request,response)=>{
  try {
    const url=new URL(request.url,'http://web-target:8080')
    const host=String(request.headers.host||'').split(':')[0]
    if(url.pathname==='/health')return json(response,200,{status:'ok',labs:labs.length})
    if(host==='public-mock'&&url.pathname==='/status')return json(response,200,{service:'approved-public-mock',classification:'synthetic'})
    if(host==='internal-canary'&&url.pathname==='/status')return json(response,200,{service:'internal-only-canary',classification:'synthetic',signal:'DC_INTERNAL_042'})
    if(url.pathname.startsWith('/labs/')&&url.pathname.endsWith('/brief')){
      const id=url.pathname.split('/')[2],lab=byId.get(id)
      return lab?json(response,200,{...lab,boundary:'SEALED_DOCKER_ONLY',stopCondition:'one controlled comparison'}):json(response,404,{error:'unknown lab'})
    }
    if(url.pathname==='/search')return text(response,200,`<main>Search results for ${url.searchParams.get('q')||''}</main>`)
    if(url.pathname==='/profile'){
      const marker=url.searchParams.get('user')==='marker'?'<img src=x data-dc-marker=1>':'Training Operator'
      return text(response,200,`<div id="profile"></div><script>profile.innerHTML=${JSON.stringify(marker)}</script>`,{'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'"})
    }
    if(url.pathname==='/preferences'&&request.method==='POST'){state.theme=url.searchParams.get('theme')||'light';return json(response,200,{changed:true,theme:state.theme,origin:request.headers.origin||null,csrfValidated:false})}
    if(url.pathname==='/cors/profile')return json(response,200,{user:'lab-operator',classification:'synthetic'},{'Access-Control-Allow-Origin':request.headers.origin||'*','Access-Control-Allow-Credentials':'true'})
    if(url.pathname==='/catalog'){
      const category=url.searchParams.get('category')||'';const injected=/\bor\b.*=.*|--/i.test(category)
      const records=injected?[{id:1,category:'books'},{id:2,category:'books'},{id:3,category:'hardware'}]:[{id:1,category:'books'},{id:2,category:'books'}]
      return json(response,200,{query:`SELECT * FROM catalog WHERE category = '${category}'`,records})
    }
    if(url.pathname==='/lookup'&&request.method==='POST'){
      const input=JSON.parse(await body(request)||'{}');const injected=typeof input.user==='object'&&input.user?.$ne!==undefined
      return json(response,200,{query:input,records:injected?[{user:'lab-alice'},{user:'lab-bob'}]:[{user:'lab-alice'}]})
    }
    if(url.pathname==='/diagnose'){
      const hostInput=url.searchParams.get('host')||'';const result=await run(`printf 'reachable:%s\\n' ${hostInput}`)
      return json(response,200,{shellSource:`printf 'reachable:%s\\n' ${hostInput}`,stdout:result.stdout.trim(),stderr:result.stderr.trim()})
    }
    if(url.pathname==='/files'){
      const name=url.searchParams.get('name')||''
      if(name.includes('..'))return text(response,200,'DC_WEB_RANGE_CANARY_042')
      if(name==='guide.txt')return text(response,200,'Web Forge public guide')
      return json(response,404,{error:'not found'})
    }
    if(url.pathname==='/upload'&&request.method==='POST'){
      const raw=await body(request);const declared=(raw.match(/Content-Type: ([^\r\n]+)/i)||[])[1]||'unknown';const filename=(raw.match(/filename="([^"]+)/i)||[])[1]||'unknown'
      return json(response,200,{accepted:true,filename,declaredType:declared,contentDecoded:false,storage:'public-render-root'})
    }
    if(url.pathname==='/xml'&&request.method==='POST'){
      const raw=await body(request);return json(response,200,{parsed:true,id:raw.includes('<!ENTITY')?'DC_WEB_RANGE_CANARY_042':(raw.match(/<id>(.*?)<\/id>/)||[])[1]||null,externalEntities:raw.includes('<!ENTITY')})
    }
    if(url.pathname==='/welcome'){
      const name=url.searchParams.get('name')||'';return text(response,200,`Welcome ${name.replace(/\{\{\s*7\s*\*\s*7\s*\}\}/g,'49')}`)
    }
    if(url.pathname==='/object'&&request.method==='POST'){
      const input=JSON.parse(await body(request)||'{}');return json(response,200,input.type==='DebugMarker'?{type:input.type,callback:'DC_DEBUG_CALLBACK_EXECUTED'}:{type:'Note',text:input.text||''})
    }
    if(url.pathname==='/fetch'){
      const destination=url.searchParams.get('url')||'';if(!/^http:\/\//.test(destination))return json(response,400,{error:'http only'})
      const fetched=await fetchJson(destination);return json(response,200,{destination,status:fetched.status,response:JSON.parse(fetched.body)})
    }
    if(url.pathname==='/me')return json(response,token(request)==='SESSION_OLD'?200:401,{user:'lab-operator',session:token(request),passwordGeneration:state.passwordGeneration,authorized:token(request)==='SESSION_OLD'})
    if(url.pathname==='/reset'&&request.method==='POST'){state.passwordGeneration+=1;return json(response,200,{reset:true,passwordGeneration:state.passwordGeneration,sessionsRevoked:false})}
    if(url.pathname.startsWith('/orders/')){
      const id=url.pathname.split('/').pop(),tenant=id.startsWith('A-')?'A':'B';return json(response,200,{id,tenant,requestedBy:token(request)||null,authorized:true})
    }
    if(url.pathname==='/admin')return json(response,['GOOD_LAB_JWT','ALG_CONFUSION_LAB_JWT'].includes(token(request))?200:401,{role:'admin',synthetic:true,acceptedToken:token(request),algorithmPinned:false})
    if(url.pathname==='/oauth/authorize'){
      const redirect=url.searchParams.get('redirect_uri')||'';if(!redirect.startsWith('https://academy.lab'))return json(response,400,{error:'redirect rejected'})
      response.writeHead(302,{Location:`${redirect}?code=DC_SYNTHETIC_CODE&state=${encodeURIComponent(url.searchParams.get('state')||'')}`});return response.end()
    }
    if(url.pathname==='/graphql'&&request.method==='POST'){
      const input=JSON.parse(await body(request)||'{}'),sensitive=String(input.query||'').includes('billingToken')
      return json(response,200,{data:{me:{id:'U-7',name:sensitive?undefined:'Training Operator',...(sensitive?{billingToken:'DC_BILLING_SYNTHETIC'}:{})}},fieldAuthorization:false})
    }
    if(url.pathname==='/order/7')return json(response,200,{id:7,quantity:1,total:100,invariant:'quantity must be positive'})
    if(url.pathname==='/order/7/update'&&request.method==='POST')return json(response,200,{updated:true,quantity:-1,total:-100,invariantEnforced:false})
    if(url.pathname==='/coupon/status')return json(response,200,{remaining:Math.max(0,1-state.couponUses),uses:state.couponUses})
    if(url.pathname==='/coupon/apply'&&request.method==='POST'){
      const available=state.couponUses<1;await new Promise(resolve=>setTimeout(resolve,250));if(available)state.couponUses+=1
      return json(response,200,{accepted:available,uses:state.couponUses,atomic:false})
    }
    if(url.pathname==='/cache/home'){
      const forwarded=request.headers['x-forwarded-host'];if(forwarded)state.cache={html:`<a href="https://${forwarded}/account">Account</a>`,key:'/cache/home'}
      const cached=state.cache||{html:'<a href="https://academy.lab/account">Account</a>',key:'/cache/home'}
      return text(response,200,cached.html,{'X-Cache-Key':cached.key,'X-Cache':state.cache?'HIT':'MISS','Cache-Control':'public, max-age=60'})
    }
    if(url.pathname==='/report'){
      const rows=Math.max(1,Number(url.searchParams.get('rows'))||10),expand=url.searchParams.get('expand')||'none',workUnits=rows*(expand==='all'?25:1)
      return json(response,workUnits>10_000?429:200,{requestedRows:rows,expand,workUnitsAllocated:workUnits,budgetCheckedAfterAllocation:true})
    }
    if(url.pathname==='/submit'&&request.method==='POST'){
      const input=JSON.parse(await body(request)||'{}'),lab=byId.get(input.id),condition=String(input.condition||'').toLowerCase().trim()
      if(!lab)return json(response,404,{accepted:false,error:'unknown lab'})
      const accepted=condition===lab.submission.toLowerCase()
      return json(response,accepted?200:422,accepted?{accepted:true,status:'FINDING ACCEPTED',lab:lab.id,evidenceThreshold:'SATISFIED',scope:'SEALED'}:{accepted:false,status:'CONDITION REJECTED',hint:'Describe the missing decision without adding untested impact.'})
    }
    return json(response,404,{error:'route not found',path:url.pathname})
  } catch(error) { return json(response,500,{error:error.message}) }
})

server.listen(8080,'0.0.0.0')
