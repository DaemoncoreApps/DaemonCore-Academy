export const missionCatalog = [
  { id: 'ghost-port', track: 'NETWORK', difficulty: 'FOUNDATIONAL', title: 'The Ghost Port', brief: 'A routine service audit found an undocumented listener inside the approved training subnet. Profile it and document the exposure.', time: '25 min', xp: 450, icon: 'network', tags: ['Live Docker', 'Enumeration'], objectives: ['Review the supplied host inventory', 'Compare documented and observed services', 'Identify the anomalous listener', 'Submit a concise evidence note'] },
  { id: 'broken-trust', track: 'WEB + API', difficulty: 'INTERMEDIATE', title: 'Broken Trust', brief: 'A live synthetic portal crosses a tenant boundary it should not. Interrogate the API and prove the missing object authorization decision.', time: '40 min', xp: 780, icon: 'key', tags: ['Live Docker', 'API authorization'], objectives: ['Map the authentication and export flow', 'Request the operator-owned synthetic account', 'Test one approved cross-tenant object', 'Submit the broken authorization condition'] },
  { id: 'night-shift', track: 'DETECTION', difficulty: 'ADVANCED', title: 'Night Shift', brief: 'A sealed forensic workstation contains a verified endpoint evidence pack. Query the raw artifacts and reconstruct the suspicious sequence.', time: '60 min', xp: 1250, icon: 'activity', tags: ['Live Docker', 'Forensics'], objectives: ['Validate the supplied evidence manifest', 'Build a chronological process timeline', 'Isolate the high-confidence sequence', 'Submit an evidence-backed hypothesis'] },
  { id: 'token-afterlife', track: 'WEB + API', difficulty: 'INTERMEDIATE', title: 'Token Afterlife', brief: 'A password recovery event claims to secure the account, but an older authenticated session may still survive. Prove the lifecycle failure against a live identity service.', time: '45 min', xp: 900, icon: 'shield', tags: ['Live Docker', 'Session lifecycle'], objectives: ['Establish the old session state', 'Trigger the approved password recovery event', 'Retest the original session token', 'Submit the invalidation failure'] },
  { id: 'policy-collision', track: 'CLOUD', difficulty: 'ADVANCED', title: 'Policy Collision', brief: 'A synthetic analytics role inherits broader object access than its project requires. Inspect effective policy and prove one designated cross-project read.', time: '55 min', xp: 1150, icon: 'layers', tags: ['Live Docker', 'Cloud IAM'], objectives: ['Inspect the effective access policy', 'Read the role-owned analytics object', 'Test the designated finance object', 'Submit the excessive access path'] },
  { id: 'artifact-zero', track: 'SUPPLY CHAIN', difficulty: 'ADVANCED', title: 'Artifact Zero', brief: 'A release candidate has an SBOM, a digest, and an attestation bundle. Verify the evidence and determine whether the deployed artifact is actually covered by trusted provenance.', time: '60 min', xp: 1300, icon: 'box', tags: ['Live Docker', 'Provenance'], objectives: ['Verify the evidence manifest', 'Inspect the release and SBOM identity', 'Compare the deployed digest with attestations', 'Submit the provenance gap'] },
]

export const additionalMissionScenarios = {
  'token-afterlife': {
    target: 'session-target:8081', subnet: 'SEALED IDENTITY RANGE', classification: 'DC-LAB // LIVE SESSION TARGET',
    intro: 'The designated training identity completed password recovery. Establish the original session, trigger the approved reset, and retest only that original token to determine whether the server invalidated it.',
    commands: [
      { command: 'curl -s -H "Authorization: Bearer session-old" http://session-target:8081/profile', label: 'Establish old session state', output: ['{"user":"training-operator","session":"session-old","passwordGeneration":1,"authorized":true}'], objective: 0, evidence: 'The designated original session is valid before recovery.' },
      { command: 'curl -s -X POST -H "Authorization: Bearer recovery-token" http://session-target:8081/password-reset', label: 'Trigger approved recovery', output: ['{"status":"password-reset","passwordGeneration":2,"sessionsRevoked":false}'], objective: 1, evidence: 'Password generation advances, but the service reports no session revocation.' },
      { command: 'curl -s -H "Authorization: Bearer session-old" -H "X-Validation-Phase: after-reset" http://session-target:8081/profile', label: 'Retest original token', output: ['{"user":"training-operator","session":"session-old","passwordGeneration":2,"authorized":true}'], objective: 2, evidence: 'The pre-reset session remains authorized after password recovery.' },
      { command: 'dc-submit "old session survives password reset"', label: 'Submit lifecycle failure', output: ['FINDING ACCEPTED', 'Category: session invalidation failure', 'Evidence threshold: SATISFIED', 'Scope adherence: VERIFIED'], objective: 3 },
    ],
    hint: 'Record the original session response, trigger the one approved recovery event, then replay only the same token.',
  },
  'policy-collision': {
    target: 'object-target:8082', subnet: 'SEALED CLOUD CONTROL PLANE', classification: 'DC-LAB // LIVE IAM TARGET',
    intro: 'The analytics role should read only its own project. Inspect the live effective-policy view, establish expected access, then request the one designated finance object to test the boundary.',
    commands: [
      { command: 'curl -s http://object-target:8082/effective-policy', label: 'Inspect effective policy', output: ['{"principal":"analytics-role","action":"object:Get","resource":"project/*","organizationDeny":["object:Delete"]}'], objective: 0, evidence: 'The analytics role receives object:Get over the wildcard project resource.' },
      { command: 'curl -s -H "Authorization: Bearer analytics-role" http://object-target:8082/objects/analytics-daily', label: 'Read owned object', output: ['{"object":"analytics-daily","project":"analytics","classification":"synthetic","authorized":true}'], objective: 1, evidence: 'The role correctly reads its designated analytics object.' },
      { command: 'curl -s -H "Authorization: Bearer analytics-role" http://object-target:8082/objects/finance-q4', label: 'Test designated finance object', output: ['{"object":"finance-q4","project":"finance","classification":"synthetic","authorized":true}'], objective: 2, evidence: 'The analytics role reads the designated finance object through wildcard effective access.' },
      { command: 'dc-submit "analytics role has wildcard cross-project read"', label: 'Submit excessive access path', output: ['FINDING ACCEPTED', 'Category: excessive cloud IAM scope', 'Effective path: VERIFIED', 'Scope adherence: VERIFIED'], objective: 3 },
    ],
    hint: 'Start with the effective policy. Prove expected access before testing only finance-q4 as the approved foreign object.',
  },
  'artifact-zero': {
    target: 'BUILD-RELEASE-042', subnet: 'SEALED PROVENANCE WORKSTATION', classification: 'DC-LAB // LIVE SUPPLY-CHAIN EVIDENCE',
    intro: 'Release 042 includes a digest, SBOM, and trusted-attestation set. Verify the files, identify the deployed subject, then determine whether any trusted attestation actually covers that digest.',
    commands: [
      { command: 'sha256sum -c /opt/evidence/SHA256SUMS', label: 'Verify evidence manifest', output: ['/opt/evidence/release.json: OK', '/opt/evidence/sbom.json: OK', '/opt/evidence/attestations.json: OK'], objective: 0, evidence: 'All three supply-chain evidence files match the supplied SHA-256 manifest.' },
      { command: `jq -r '[.release,.image,.digest] | @tsv' /opt/evidence/release.json && jq -r '.components[] | [.name,.version] | @tsv' /opt/evidence/sbom.json`, label: 'Inspect release identity', output: ['042 registry.dc-lab/checkout sha256:dc042', 'checkout-api 4.2.0', 'dc-auth-lib 2.8.1'], objective: 1, evidence: 'Release 042 deploys checkout digest sha256:dc042 and declares two SBOM components.' },
      { command: `jq -r '.trusted[] | [.subject,.builder] | @tsv' /opt/evidence/attestations.json`, label: 'Compare trusted subjects', output: ['sha256:dc041 builder-prod', 'sha256:dc040 builder-prod'], objective: 2, evidence: 'Trusted attestations cover earlier digests but not deployed digest sha256:dc042.' },
      { command: 'dc-submit "release digest lacks trusted attestation"', label: 'Submit provenance gap', output: ['FINDING ACCEPTED', 'Category: unverified release provenance', 'Evidence threshold: SATISFIED', 'Scope adherence: VERIFIED'], objective: 3 },
    ],
    hint: 'Integrity of the evidence files is not the same as provenance for the deployed subject. Compare the exact release digest.',
  },
}
