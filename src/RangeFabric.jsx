import { useEffect, useState } from 'react'
import { Check, Fingerprint, PackageCheck, ShieldAlert } from 'lucide-react'

const previewPacks = [
  ['identity-citadel', 'Identity Citadel', 'PROTOCOL-NATIVE'],
  ['ghost-port', 'The Ghost Port', 'MULTI-SERVICE'],
  ['web-range', 'Web Forge', 'CASE ENGINE'],
  ['enterprise-range', 'Enterprise Forge', 'CASE ENGINE'],
  ['artifact-zero', 'Artifact Zero', 'CONTAINER'],
  ['broken-trust', 'Broken Trust', 'CONTAINER'],
  ['night-shift', 'Night Shift', 'CONTAINER'],
  ['policy-collision', 'Policy Collision', 'CONTAINER'],
  ['token-afterlife', 'Token Afterlife', 'CONTAINER'],
].map(([id,title,kind])=>({id,title,kind,digest:null,state:'desktop'}))

export function RangeFabric() {
  const api=window.daemoncore?.range
  const [packs,setPacks]=useState(previewPacks)
  const [state,setState]=useState(api?'checking':'preview')
  useEffect(()=>{
    if(!api)return
    let active=true
    const inspect=async()=>{
      try{
        const index=await api.packIndex()
        const results=await Promise.all(index.packs.map(async pack=>{
          try{const result=await api.verifyPack(pack.id);return{...pack,state:result.verified?'verified':'failed'}}
          catch{return{...pack,state:'failed'}}
        }))
        if(active){setPacks(results);setState(results.every(pack=>pack.state==='verified')?'verified':'failed')}
      }catch{if(active)setState('failed')}
    }
    inspect()
    return()=>{active=false}
  },[api])
  const featured=packs.find(pack=>pack.id==='identity-citadel')
  return <section className={`range-fabric ${state}`}>
    <div className="fabric-head"><div className="fabric-icon"><Fingerprint/></div><div><span>RANGE FABRIC // CONTENT-ADDRESSED</span><h3>Pack integrity registry</h3><p>Every environment is fingerprinted before Docker receives a launch request.</p></div><strong>{state==='verified'?'9 / 9 VERIFIED':state==='checking'?'VERIFYING':state==='failed'?'INTEGRITY FAULT':'DESKTOP GATE'}</strong></div>
    <div className="fabric-grid">
      <article className="citadel-card"><div><span>NEW PROTOCOL RANGE</span><h4>{featured?.title||'Identity Citadel'}</h4><p>A real Samba Active Directory realm with DNS, Kerberos, LDAP, and SMB inside an internal-only network. Build evidence from native protocol behavior—not canned terminal output.</p></div><div className="protocol-row"><b>DNS</b><b>KERBEROS</b><b>LDAP</b><b>SMB</b></div></article>
      <div className="pack-ledger">{packs.map(pack=><div className={pack.state} key={pack.id}>{pack.state==='failed'?<ShieldAlert/>:<Check/>}<span><strong>{pack.title}</strong><small>{pack.id==='identity-citadel'?'PROTOCOL-NATIVE':pack.kind||'SEALED PACK'}</small></span><code>{pack.digest?pack.digest.slice(0,12):'VERIFY ON DESKTOP'}</code></div>)}</div>
    </div>
    <div className="fabric-contract"><PackageCheck/><span><strong>LAUNCH CONTRACT</strong> Hash match → internal network → zero host mounts → blocked egress → disposable runtime</span></div>
  </section>
}
