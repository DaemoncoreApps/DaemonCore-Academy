const trackData = [
  ['identity',['Trust Cartography','LDAP Boundary','Ticket Chain','Inherited Control','Policy Precedence','Delegation Reach','Certificate Authority','Tier Crossing']],
  ['cloud',['Account Graph','Effective IAM','Workload Trust','Storage Boundary','Network Path','Key Authority','Audit Coverage','Guardrail Drift']],
  ['detection',['Source Contract','Process Lineage','Connection Join','Identity Sequence','Analytic Logic','Threshold Study','Triage Ledger','Incident Timeline']],
  ['host',['Host State','Sudo Decision','Capability Edge','Unit Trust','Scheduled Path','Secret Boundary','Service Exposure','Policy Enforcement']],
  ['container',['Image Chain','Pod Boundary','RBAC Graph','Workload Identity','Network Matrix','Admission Order','Node Trust','Tenant Isolation']],
  ['supply',['Source Trust','Dependency Graph','SBOM Quality','Build Boundary','Provenance Subject','Signer Authority','Registry Control','Release Custody']],
]

export const enterpriseLabCatalog=trackData.flatMap(([domain,titles])=>titles.map((title,index)=>{
  const id=`${domain}-${String(index+1).padStart(2,'0')}`
  return {id,title,category:domain.toUpperCase(),difficulty:index<2?'FOUNDATION':index<6?'INTERMEDIATE':'ADVANCED',minutes:index<2?40:index<6?55:70,xp:index<2?500:index<6?750:1000,
    brief:`A synthetic ${domain} evidence pack contains one documented control path and one designated comparison. Calculate the effective decision behind ${title.toLowerCase()} and stop after the bounded difference is proven.`,
    submission:'effective control differs from documented boundary',objectives:['Read the exact synthetic case boundary','Establish the documented positive control','Calculate one controlled comparison','Submit the evidence-calibrated condition'],
    steps:[
      {label:'Read case contract',command:`dc-case ${id} scope`,evidence:`Case ${id} identifies the authorized principals, objects, sources, and stop condition.`},
      {label:'Establish positive control',command:`dc-case ${id} baseline`,evidence:`The documented ${domain} path produces its expected effective decision.`},
      {label:'Calculate comparison',command:`dc-case ${id} compare`,evidence:`One designated variable changes the effective control result for ${title.toLowerCase()}.`},
      {label:'Submit bounded condition',command:`dc-submit ${id} "effective control differs from documented boundary"`,evidence:'Enterprise Forge accepts the condition and seals the evidence ledger.'},
    ],hint:'Do not start with impact. Read scope, prove the positive control, change one variable, and walk the complete effective-decision chain.'}
}))
