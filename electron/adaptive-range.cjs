const MODES = Object.freeze({
  guided: { label: 'Guided', multiplier: 1, hints: 4 },
  assisted: { label: 'Assisted', multiplier: 1.15, hints: 3 },
  blind: { label: 'Blind', multiplier: 1.35, hints: 2 },
  professional: { label: 'Professional', multiplier: 1.5, hints: 0 },
})

const objective = (label, evidence, patterns, hint) => ({ label, evidence, patterns, hint })

const CONTRACTS = Object.freeze({
  'ghost-port': {
    baseScore: 450,
    tools: ['filesystem inventory', 'service discovery', 'HTTP inspection', 'finding submission'],
    objectives: [
      objective('Establish the approved service baseline', 'Approved inventory identifies dc-archive-02 and its documented services.', [/dc-archive-02/i, /22\/tcp/i, /445\/tcp/i], 'The approved inventory is already mounted in the operator workspace.'),
      objective('Prove a service exists outside that baseline', 'Observed service evidence identifies TCP 8088 as reachable on the archive target.', [/8088\/tcp/i, /open/i], 'Compare the documented ports with a direct observation of the archive target.'),
      objective('Characterize the undocumented listener', 'Application evidence identifies the unauthenticated Archive Console.', [/archive console/i, /authentication["':\s]+false/i], 'Interrogate the newly observed service and preserve its identity and access behavior.'),
      objective('Submit a bounded finding', 'The range accepted the undocumented-service finding.', [/finding accepted/i, /scope adherence:\s*verified/i], 'Submit only the condition proven by the three preserved signals.'),
    ],
  },
  'broken-trust': {
    baseScore: 780,
    tools: ['HTTP client', 'bearer authentication', 'object comparison', 'finding submission'],
    objectives: [
      objective('Map the application decision flow', 'Flow evidence identifies bearer authentication and caller-selected account lookup.', [/bearer token accepted/i, /account query selected/i], 'Begin with application behavior before testing an authorization boundary.'),
      objective('Establish expected access', 'The operator identity can retrieve its owned VX-104 record.', [/vx-104/i, /training-operator/i, /ember/i], 'Prove the normal case with the operator-owned synthetic record.'),
      objective('Prove the designated cross-tenant read', 'The same operator identity retrieves the approved foreign VX-207 record.', [/vx-207/i, /obsidian/i, /synthetic-peer/i], 'Change only the designated object identifier and preserve the returned ownership context.'),
      objective('Submit the authorization failure', 'The range accepted a broken object authorization finding.', [/finding accepted/i, /broken object-level authorization/i], 'Name the missing server-side decision, not merely the exposed record.'),
    ],
  },
  'night-shift': {
    baseScore: 1250,
    tools: ['SHA-256 verification', 'JSON analysis', 'timeline construction', 'hypothesis submission'],
    objectives: [
      objective('Verify evidence integrity', 'The supplied event and process artifacts match their SHA-256 manifest.', [/events\.json:\s*ok/i, /processes\.csv:\s*ok/i], 'Do not interpret evidence until its supplied integrity record is verified.'),
      objective('Build the relevant chronology', 'A timeline links the updater, shell, archive, and synthetic connection.', [/powershell/i, /archive created/i, /synthetic sink/i], 'Order the event records and retain process, parent, action, and time.'),
      objective('Separate the high-confidence sequence', 'Triage isolates the three linked high-severity events.', [/encoded child process/i, /archive created/i, /connection to synthetic sink/i], 'Filter on the evidence field that expresses confidence, then test whether the events form one chain.'),
      objective('Submit an evidence-backed hypothesis', 'The range accepted a coherent updater-sequence hypothesis.', [/hypothesis accepted/i, /evidence chain:\s*coherent/i], 'State a bounded hypothesis and preserve room for alternative explanations.'),
    ],
  },
  'token-afterlife': {
    baseScore: 900,
    tools: ['HTTP client', 'session token', 'recovery event', 'finding submission'],
    objectives: [
      objective('Establish the pre-reset session state', 'The designated original session is authorized before recovery.', [/session-old/i, /passwordGeneration["':\s]+1/i, /authorized["':\s]+true/i], 'Record the original token state before causing the approved lifecycle transition.'),
      objective('Trigger the approved recovery event', 'Password generation advances while session revocation remains false.', [/password-reset/i, /passwordGeneration["':\s]+2/i, /sessionsRevoked["':\s]+false/i], 'Use the supplied recovery path once and preserve the server response.'),
      objective('Retest the exact original token', 'The pre-reset token remains authorized after password recovery.', [/session-old/i, /passwordGeneration["':\s]+2/i, /authorized["':\s]+true/i], 'Replay only the original session after the reset and compare generations.'),
      objective('Submit the lifecycle failure', 'The range accepted a session invalidation finding.', [/finding accepted/i, /session invalidation failure/i], 'Describe the missing invalidation control rather than the reset itself.'),
    ],
  },
  'policy-collision': {
    baseScore: 1150,
    tools: ['policy inspection', 'authorized object request', 'boundary comparison', 'finding submission'],
    objectives: [
      objective('Inspect effective access', 'Effective policy grants object:Get over a wildcard project resource.', [/analytics-role/i, /object:Get/i, /project\/\*/i], 'Start with evaluated policy rather than inferring access from a role name.'),
      objective('Establish the intended read', 'The analytics role can read its owned analytics object.', [/analytics-daily/i, /project["':\s]+analytics/i, /authorized["':\s]+true/i], 'Prove the expected project path before crossing the designated boundary.'),
      objective('Prove the designated foreign-object read', 'The analytics role reads the approved finance object.', [/finance-q4/i, /project["':\s]+finance/i, /authorized["':\s]+true/i], 'Request only the named foreign object and retain its project identity.'),
      objective('Submit excessive effective access', 'The range accepted the wildcard cross-project path.', [/finding accepted/i, /excessive cloud iam scope/i], 'Connect the effective wildcard to the one proven cross-project read.'),
    ],
  },
  'artifact-zero': {
    baseScore: 1300,
    tools: ['SHA-256 verification', 'JSON inspection', 'subject comparison', 'finding submission'],
    objectives: [
      objective('Verify the evidence bundle', 'Release, SBOM, and attestation files match their supplied manifest.', [/release\.json:\s*ok/i, /sbom\.json:\s*ok/i, /attestations\.json:\s*ok/i], 'Integrity of the inputs comes before provenance analysis.'),
      objective('Identify the deployed subject', 'Release evidence binds checkout 4.2.0 to digest sha256:dc042.', [/sha256:dc042/i, /checkout-api/i, /4\.2\.0/i], 'Extract immutable identity from the release and compare it with the SBOM subject.'),
      objective('Compare trusted attestation subjects', 'Trusted attestations name older digests and do not cover dc042.', [/sha256:dc041/i, /sha256:dc040/i, /builder-prod/i], 'List exact trusted subjects; a matching builder name is insufficient.'),
      objective('Submit the provenance gap', 'The range accepted the uncovered release-digest finding.', [/finding accepted/i, /unverified release provenance/i], 'Name the missing trusted subject coverage, not a checksum failure.'),
    ],
  },
  'identity-citadel': {
    baseScore: 1600,
    tools: ['DNS discovery', 'Kerberos authentication', 'LDAP with GSSAPI', 'finding submission'],
    objectives: [
      objective('Discover the realm control plane', 'DNS identifies dc01.daemoncore.lab as the Kerberos service.', [/88\s+dc01\.daemoncore\.lab\./i], 'Query the realm service records rather than assuming the controller address.'),
      objective('Acquire and inspect an operator ticket', 'The designated operator receives a DAEMONCORE.LAB TGT.', [/lab\.operator@daemoncore\.lab/i, /krbtgt\/daemoncore\.lab/i], 'Authenticate the supplied operator and inspect the resulting credential cache.'),
      objective('Prove the delegated identity edge', 'Ticket-protected LDAP shows svc.backup in Backup Operators Lab.', [/backup operators lab/i, /svc\.backup/i], 'Use the operator ticket to query the exact delegated group membership.'),
      objective('Submit the bounded identity finding', 'The range accepted the designated delegation finding.', [/finding accepted/i, /daemoncore\.lab sealed/i], 'Do not infer domain-wide control from the lab group name.'),
    ],
  },
    'web-range': {
    baseScore: 1100,
    tools: ['HTTP client', 'response comparison', 'scenario inspection', 'finding submission'],
    objectives: [
      objective(
        'Read the selected scenario contract',
        'The operator retrieved the selected Web Forge lab brief.',
        [/boundary["':\s]+SEALED_DOCKER_ONLY/i, /stopCondition["':\s]+one controlled comparison/i],
        'Retrieve the selected lab brief from the sealed web target before testing it.'
      ),
      objective(
        'Establish the positive control',
        'The expected behavior or normal request path is preserved as baseline evidence.',
        [/200|accepted|authorized|expected|guide|training operator|approved-public-mock/i],
        'Run the normal or documented request first and preserve the response.'
      ),
      objective(
        'Run the designated security comparison',
        'A controlled comparison produces the lab-specific security signal.',
        [/DC_|false|true|BOUNDARY|synthetic|unauthenticated|49|tenant|algorithmPinned|fieldAuthorization|invariantEnforced|atomic|workUnitsAllocated/i],
        'Change only the variable identified by the selected lab and preserve the resulting difference.'
      ),
      objective(
        'Submit the evidence-backed condition',
        'The sealed target accepted the Web Forge finding.',
        [/FINDING ACCEPTED/i, /evidenceThreshold["':\s]+SATISFIED/i, /scope["':\s]+SEALED/i],
        'Submit the exact condition from the selected lab contract without adding untested impact.'
      ),
    ],
  },

  'enterprise-range': {
    baseScore: 1400,
    tools: ['case inspection', 'control comparison', 'JSON analysis', 'finding submission'],
    objectives: [
      objective(
        'Read the selected enterprise case contract',
        'The operator retrieved the selected Enterprise Forge scope.',
        [/classification["':\s]+SYNTHETIC ENTERPRISE EVIDENCE/i, /stopCondition["':\s]+one effective-control difference/i],
        'Inspect the selected case scope before evaluating any control evidence.'
      ),
      objective(
        'Establish the documented positive control',
        'The baseline identifies the documented expected allow decision.',
        [/phase["':\s]+baseline/i, /EXPECTED_ALLOW/i, /confidence["':\s]+DIRECT/i],
        'Use dc-case with the baseline phase and preserve the documented decision.'
      ),
      objective(
        'Calculate the designated effective-control comparison',
        'The comparison identifies the bounded control difference.',
        [/phase["':\s]+compare/i, /BOUNDARY_DIFFERENCE/i, /confidence["':\s]+DIRECT/i],
        'Use dc-case with the compare phase and preserve only the designated difference.'
      ),
      objective(
        'Submit the evidence-calibrated condition',
        'The sealed target accepted the Enterprise Forge finding.',
        [/FINDING ACCEPTED/i, /evidenceThreshold["':\s]+SATISFIED/i, /scope["':\s]+SEALED/i],
        'Submit the exact effective-control condition defined by the selected case.'
      ),
    ],
  },
})

const FLAGSHIP_VARIANTS = Object.freeze({
  'ghost-port': [
    { id: 'inventory-drift', label: 'Inventory Drift', brief: 'Treat the approved inventory as the source of truth and prove only the undocumented exposure.' },
    { id: 'service-ownership', label: 'Service Ownership', brief: 'Prioritize service identity and access behavior before assigning operational impact.' },
    { id: 'change-control', label: 'Change Control', brief: 'Frame the evidence as a change-control exception without assuming compromise.' },
  ],
  'broken-trust': [
    { id: 'tenant-boundary', label: 'Tenant Boundary', brief: 'Prove the exact cross-tenant decision failure with the minimum authorized requests.' },
    { id: 'object-ownership', label: 'Object Ownership', brief: 'Preserve owner and tenant context so the authorization conclusion survives review.' },
    { id: 'control-design', label: 'Control Design', brief: 'Separate successful authentication from the missing object authorization check.' },
  ],
  'night-shift': [
    { id: 'timeline-first', label: 'Timeline First', brief: 'Lead with integrity and chronology before interpreting the suspicious sequence.' },
    { id: 'signal-separation', label: 'Signal Separation', brief: 'Distinguish linked high-confidence events from routine endpoint noise.' },
    { id: 'alternative-hypothesis', label: 'Alternative Hypothesis', brief: 'State what the evidence supports while preserving plausible alternative explanations.' },
  ],
})

function caseVariantFor(id, seed) {
  const variants = FLAGSHIP_VARIANTS[id]
  if (!variants) return null
  const index = Number.parseInt(String(seed || '0').slice(-4), 16) % variants.length
  return variants[index]
}

function debriefFor(id, session, seconds, executionCount) {
  const failed = session.stats?.failedExecutions || 0
  const rejected = session.stats?.rejectedEvidence || 0
  const targetSeconds = { 'ghost-port': 1500, 'broken-trust': 2400, 'night-shift': 3600 }[id] || 2700
  const dimensions = [
    { id: 'evidence', label: 'Evidence coverage', score: Math.round(session.evidence.length / contractFor(id).objectives.length * 100) },
    { id: 'independence', label: 'Operator independence', score: Math.max(0, 100 - session.hints.length * 22) },
    { id: 'method', label: 'Method discipline', score: Math.max(40, 100 - failed * 8 - rejected * 5) },
    { id: 'tempo', label: 'Time discipline', score: Math.max(50, Math.min(100, Math.round(targetSeconds / Math.max(1, seconds) * 100))) },
  ]
  const weakest = [...dimensions].sort((a, b) => a.score - b.score)[0]
  const strengths = dimensions.filter(dimension => dimension.score >= 90).map(dimension => dimension.label)
  return {
    dimensions,
    overall: Math.round(dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length),
    executionCount,
    strengths: strengths.length ? strengths : ['Objective completion'],
    remediation: weakest.score < 80 ? `Re-run in a higher-autonomy mode and focus on ${weakest.label.toLowerCase()}.` : 'Advance to the next route stage or repeat in Professional mode.',
    nextAction: session.hints.length ? 'Repeat without guidance and preserve the same evidence threshold.' : 'Export the sealed receipt, then advance to the next Mission OS stage.',
  }
}

function normalizeMode(value) {
  const mode = String(value || 'assisted').toLowerCase()
  if (!MODES[mode]) throw new Error('Unknown mission mode')
  return mode
}

function contractFor(id) {
  const contract = CONTRACTS[id]
  if (!contract) throw new Error('Adaptive mission contract is unavailable')
  return contract
}

function matchesObjective(id, index, output) {
  const objectiveContract = contractFor(id).objectives[index]
  if (!objectiveContract) throw new Error('Unknown mission objective')
  return objectiveContract.patterns.every(pattern => pattern.test(String(output || '')))
}

function publicContract(id) {
  const contract = contractFor(id)
  return {
    modes: MODES,
    tools: contract.tools,
    objectives: contract.objectives.map(({ label }) => ({ label })),
  }
}

module.exports = { CONTRACTS, FLAGSHIP_VARIANTS, MODES, caseVariantFor, contractFor, debriefFor, matchesObjective, normalizeMode, publicContract }
