export const masteryDomains = [
  { id: 'network', label: 'Network evidence', lessonIds: ['recon-hypotheses', 'packet-evidence', 'ports-protocols', 'service-fingerprinting', 'segmentation-pivot-analysis'] },
  { id: 'identity', label: 'Identity & trust', lessonIds: ['identity-directory', 'active-directory-graphs', 'kerberos-trust-decisions', 'oauth-oidc-flows'] },
  { id: 'application', label: 'Application security', lessonIds: ['web-surface-mapping', 'auth-sessions', 'authorization-testing', 'injection-validation', 'api-security', 'ssrf-internal-trust'] },
  { id: 'platform', label: 'Host & platform', lessonIds: ['os-attack-surface', 'linux-privilege-paths', 'windows-privilege-paths', 'containers-supply-chain'] },
  { id: 'cloud', label: 'Cloud & delivery', lessonIds: ['cloud-control-plane', 'containers-supply-chain', 'secrets-credential-audit', 'cicd-provenance'] },
  { id: 'evidence', label: 'Evidence & reporting', lessonIds: ['rules-of-engagement', 'asset-inventory', 'evidence-quality', 'finding-report', 'vulnerability-validation', 'impact-cleanup'] },
]

const choice = (label, impact, domains) => ({ label, impact, domains })

export const capstones = [
  {
    id: 'night-glass',
    code: 'CAP-01',
    title: 'Night Glass',
    subtitle: 'Enterprise intrusion triage',
    duration: 75,
    difficulty: 'PROFESSIONAL',
    brief: 'A synthetic enterprise reports anomalous authentication, an unexplained service, and a privileged directory change. Build a defensible incident path without destroying volatile evidence.',
    outcome: 'Separate correlated evidence from coincidence, preserve the timeline, and recommend the smallest justified containment action.',
    domains: ['network', 'identity', 'platform', 'evidence'],
    nodes: [
      {
        signal: 'INITIAL TRIAGE',
        artifact: `08:41  VPN success  user=svc_reports src=198.51.100.24\n08:43  DC01 TGS request user=svc_reports service=cifs/FS01\n08:44  EDR alert     host=FS01 process=powershell.exe parent=reporting.exe\n08:46  Admin group   member=svc_reports actor=helpdesk.batch`,
        prompt: 'Which action preserves the most investigative value while reducing immediate risk?',
        choices: [
          choice('Disable every domain account and restart both hosts', -20, ['evidence']),
          choice('Snapshot the relevant identity and endpoint telemetry, then suspend svc_reports sessions', 20, ['identity', 'evidence']),
          choice('Delete reporting.exe and clear the PowerShell logs', -25, ['platform', 'evidence']),
        ],
        answer: 1,
        feedback: 'The evidence supports focused containment of the affected identity. Capturing telemetry before changing state preserves the chain needed to determine scope.',
      },
      {
        signal: 'TIMELINE JOIN',
        artifact: `VPN lease: 10.44.18.92 -> svc_reports\nFS01 4688: reporting.exe -> powershell.exe at 08:44:07\nProxy: FS01 -> 10.30.7.18:8443 at 08:44:19\nCMDB: 10.30.7.18 = internal deployment controller`,
        prompt: 'What is the strongest conclusion supported by these four records?',
        choices: [
          choice('The deployment controller is confirmed compromised', -10, ['evidence']),
          choice('The VPN source directly connected to the deployment controller', -10, ['network']),
          choice('Activity on FS01 preceded a connection to a sensitive internal control service', 20, ['network', 'evidence']),
        ],
        answer: 2,
        feedback: 'The joined records establish sequence and destination, not compromise or direct origin. Premium reporting distinguishes what the evidence proves from what remains a hypothesis.',
      },
      {
        signal: 'DIRECTORY CHANGE',
        artifact: `Group: Tier-0-Backup-Operators\nAdded member: svc_reports\nActor: helpdesk.batch\nChange ticket: CHG-8841 "Quarterly printer rollout"\nActor baseline: 2,184 password resets; 0 privileged group edits`,
        prompt: 'Which finding statement is technically defensible?',
        choices: [
          choice('helpdesk.batch is malicious and owns the domain', -15, ['identity', 'evidence']),
          choice('An anomalous privileged membership change conflicts with the cited ticket and actor baseline', 20, ['identity', 'evidence']),
          choice('The printer rollout caused a Kerberos vulnerability', -20, ['identity']),
        ],
        answer: 1,
        feedback: 'The mismatch is provable and high priority. Intent and full domain control are not yet established, so the finding must preserve that uncertainty.',
      },
      {
        signal: 'SERVICE CONTROL',
        artifact: `FS01 service: ReportSync\nImagePath: C:\\ProgramData\\ReportSync\\sync.exe\nBinary hash first seen: 08:42\nService account: LocalSystem\nDirectory ACL: BUILTIN\\Users:(OI)(CI)(M)`,
        prompt: 'What should the operator validate next?',
        choices: [
          choice('Whether a non-privileged principal could modify the service binary or its directory', 20, ['platform']),
          choice('Whether the filename contains the word sync', -15, ['platform']),
          choice('Whether LocalSystem has internet access by running an external scan', -20, ['network']),
        ],
        answer: 0,
        feedback: 'The privilege boundary depends on effective write access to the executed path. Validate the ACL and provenance inside the sealed evidence set before claiming escalation.',
      },
      {
        signal: 'EXECUTIVE CLOSEOUT',
        artifact: `Confirmed: anomalous identity use, privileged group edit, new SYSTEM service\nUnconfirmed: initial credential source, controller impact, data access\nContained: svc_reports sessions suspended; FS01 isolated after capture`,
        prompt: 'Which closeout recommendation best matches the evidence?',
        choices: [
          choice('Rebuild the entire enterprise immediately', -10, ['evidence']),
          choice('Declare no impact because exfiltration was not observed', -20, ['evidence']),
          choice('Rotate the affected identity, review Tier-0 changes, preserve FS01, and scope the deployment-controller connection', 20, ['identity', 'evidence']),
        ],
        answer: 2,
        feedback: 'The response is proportional, traceable to confirmed facts, and explicitly carries forward the unresolved control-service connection.',
      },
    ],
  },
  {
    id: 'broken-orbit',
    code: 'CAP-02',
    title: 'Broken Orbit',
    subtitle: 'Cloud control-plane compromise',
    duration: 80,
    difficulty: 'EXPERT',
    brief: 'A synthetic SaaS environment exposes an unusual role assumption, a workload identity with broad storage access, and an unsigned production deployment.',
    outcome: 'Reconstruct the control-plane path, identify the violated trust boundary, and produce a recovery sequence with verification points.',
    domains: ['identity', 'cloud', 'application', 'evidence'],
    nodes: [
      {
        signal: 'ROLE ASSUMPTION',
        artifact: `principal: ci-runner-prod\naction: AssumeRole SupportExport\nsource: workload pool build/preview\ncondition: repository startsWith "daemon/"\nsession tags: repository=daemon/docs-fork`,
        prompt: 'What is the core trust failure?',
        choices: [
          choice('The role name contains Support', -10, ['cloud']),
          choice('A mutable repository attribute is treated as sufficient production authorization', 20, ['identity', 'cloud']),
          choice('Session tags are always insecure', -15, ['identity']),
        ],
        answer: 1,
        feedback: 'The boundary relies on a caller-controlled or insufficiently bound claim. Authorization should bind immutable repository identity, protected ref, workflow, and environment approval.',
      },
      {
        signal: 'OBJECT ACCESS',
        artifact: `role: SupportExport\nallowed: storage:GetObject resource=customer-exports/*\nobserved: 417 GetObject calls over 94 seconds\nbaseline: 4-12 calls per support session\ndestination: managed build runner`,
        prompt: 'Which evidence package is most useful before revoking the session?',
        choices: [
          choice('Only a screenshot of the alert title', -15, ['evidence']),
          choice('Session identity, object keys, timestamps, policy evaluation, and runner provenance', 20, ['cloud', 'evidence']),
          choice('A list of every bucket in the organization', -10, ['cloud']),
        ],
        answer: 1,
        feedback: 'The package preserves who, what, when, why authorization succeeded, and which workload executed it. That supports both scope and corrective control design.',
      },
      {
        signal: 'APPLICATION PATH',
        artifact: `POST /support/export\nsub=contractor-184 tenant=blue\nbody={"tenant":"green","range":"all"}\nresponse=202 job=exp-771\nworker authorization source=request.body.tenant`,
        prompt: 'How should this weakness be classified?',
        choices: [
          choice('A tenant-authorization failure across an asynchronous job boundary', 20, ['application']),
          choice('A cryptographic failure because JSON is readable', -20, ['application']),
          choice('A network segmentation issue only', -15, ['network']),
        ],
        answer: 0,
        feedback: 'The worker trusts tenant context supplied by the request rather than deriving it from the authenticated principal and authorized server-side record.',
      },
      {
        signal: 'DEPLOYMENT PROVENANCE',
        artifact: `production digest: sha256:71ac...\nregistry signature: absent\nbuild attestation: subject sha256:18bd...\ndeployment actor: emergency-release\napproval record: none`,
        prompt: 'What is the safest immediate deployment decision?',
        choices: [
          choice('Trust the image because it came from the internal registry', -15, ['cloud']),
          choice('Pause promotion and reconcile the running digest with signed provenance', 20, ['cloud', 'evidence']),
          choice('Delete the registry before collecting metadata', -20, ['evidence']),
        ],
        answer: 1,
        feedback: 'Registry location is not provenance. The digest mismatch and missing approval require a controlled pause, evidence capture, and a known-good signed replacement.',
      },
      {
        signal: 'RECOVERY ORDER',
        artifact: `Known: active role session, weak federation condition, cross-tenant export path, unverified image\nGoal: stop access without losing the ability to establish scope`,
        prompt: 'Choose the strongest recovery sequence.',
        choices: [
          choice('Capture session and audit evidence; revoke session; fix trust conditions; deploy signed image; retest tenant isolation', 20, ['identity', 'cloud', 'application', 'evidence']),
          choice('Publish a status page before containment', -10, ['evidence']),
          choice('Rotate unrelated user passwords and leave workload federation unchanged', -20, ['identity']),
        ],
        answer: 0,
        feedback: 'The sequence preserves evidence, stops active access, corrects root trust conditions, restores known provenance, and verifies the affected authorization boundary.',
      },
    ],
  },
  {
    id: 'red-ledger',
    code: 'CAP-03',
    title: 'Red Ledger',
    subtitle: 'Full-spectrum assessment closeout',
    duration: 90,
    difficulty: 'PRINCIPAL',
    brief: 'A synthetic assessment produced dozens of signals across network, host, application, identity, and delivery systems. Convert the noise into a prioritized, reproducible executive dossier.',
    outcome: 'Build a finding chain where every severity, conclusion, and remediation step is supported by retained evidence.',
    domains: ['network', 'identity', 'application', 'platform', 'cloud', 'evidence'],
    nodes: [
      {
        signal: 'SCOPE CONTROL',
        artifact: `Authorized: app.training.local, api.training.local, 10.77.0.0/24\nObserved DNS: legacy.training.local -> 10.77.8.14\nOwner message: "that old thing is probably ours too"\nROE: additions require written approval`,
        prompt: 'What is the correct operator action?',
        choices: [
          choice('Test the legacy host because ownership sounds likely', -25, ['evidence']),
          choice('Record it as an unresolved dependency and request written scope expansion', 20, ['evidence']),
          choice('Ignore the dependency and omit it from the report', -15, ['evidence']),
        ],
        answer: 1,
        feedback: 'Probable ownership is not authorization. Recording the dependency preserves value while the formal change process protects both operator and customer.',
      },
      {
        signal: 'FINDING CHAIN',
        artifact: `A. Public route exposes /admin/import\nB. Import accepts a signed low-privilege session\nC. Job worker fetches a caller-supplied internal URL\nD. Metadata endpoint returns a scoped workload token\nE. Token can read deployment configuration`,
        prompt: 'How should the assessment present this evidence?',
        choices: [
          choice('Five unrelated informational findings', -15, ['application', 'cloud']),
          choice('One chained trust-boundary finding with prerequisites and independently reproducible steps', 20, ['application', 'cloud', 'evidence']),
          choice('A critical remote-code-execution claim without validation', -25, ['evidence']),
        ],
        answer: 1,
        feedback: 'The risk emerges from the composed path. A strong report preserves each prerequisite, shows the boundary transitions, and avoids claiming an impact that was not tested.',
      },
      {
        signal: 'SEVERITY CALIBRATION',
        artifact: `Reachability: authenticated support role\nComplexity: one crafted import job\nImpact validated: read-only deployment configuration\nNot validated: secret access, code execution, persistence\nCompensating control: alert fires after metadata request`,
        prompt: 'Which severity rationale is most defensible?',
        choices: [
          choice('Critical because cloud issues are always critical', -20, ['evidence']),
          choice('High due to a repeatable cross-boundary path exposing sensitive configuration, with unvalidated impacts stated separately', 20, ['cloud', 'evidence']),
          choice('Low because an alert exists', -15, ['evidence']),
        ],
        answer: 1,
        feedback: 'Severity follows demonstrated reachability and impact. Detection is relevant context, but it does not remove the vulnerable trust path.',
      },
      {
        signal: 'REMEDIATION DESIGN',
        artifact: `Root causes: worker trusts caller URL; workload token can read all environment configs; metadata egress unrestricted\nConstraint: import feature must remain available`,
        prompt: 'Which remediation package addresses the causes rather than the symptom?',
        choices: [
          choice('Rename /admin/import', -15, ['application']),
          choice('Allowlist destinations, resolve and revalidate addresses, restrict worker identity, and block metadata egress', 20, ['application', 'network', 'cloud']),
          choice('Add a warning banner to the import form', -20, ['application']),
        ],
        answer: 1,
        feedback: 'The layered fix constrains destination selection, runtime network behavior, and identity blast radius while preserving the legitimate workflow.',
      },
      {
        signal: 'RETEST PROOF',
        artifact: `Fix deployed: destination policy + scoped identity + egress rule\nPositive control: approved import succeeds\nNegative control: private address rejected\nObserved: no metadata route; token denied environment listing\nRegression suite: tenant exports pass`,
        prompt: 'What is the correct closeout status?',
        choices: [
          choice('Remediated, with positive, negative, least-privilege, and regression evidence attached', 20, ['application', 'cloud', 'evidence']),
          choice('Not tested because the original payload no longer works', -15, ['evidence']),
          choice('Risk accepted without customer input', -20, ['evidence']),
        ],
        answer: 0,
        feedback: 'The retest proves both intended function and blocked abuse, verifies reduced identity reach, and checks for collateral regression. That is defensible closure.',
      },
    ],
  },
]

export function deriveMastery(profile) {
  const lessonAttempts = profile.lessonAttempts || []
  const capstoneAttempts = profile.capstoneAttempts || []
  return masteryDomains.map(domain => {
    const lessons = lessonAttempts.filter(attempt => domain.lessonIds.includes(attempt.lessonId))
    const capstonesForDomain = capstoneAttempts.filter(attempt => attempt.domainScores?.[domain.id] !== undefined)
    const lessonScore = lessons.length ? Math.round(lessons.reduce((sum, attempt) => sum + attempt.practicalScore, 0) / lessons.length) : null
    const capstoneScore = capstonesForDomain.length ? Math.max(...capstonesForDomain.map(attempt => attempt.domainScores[domain.id])) : null
    const score = lessonScore === null && capstoneScore === null ? 0 : lessonScore === null ? capstoneScore : capstoneScore === null ? lessonScore : Math.round(lessonScore * .45 + capstoneScore * .55)
    const evidence = lessons.length + capstonesForDomain.length
    return { ...domain, score, evidence, status: evidence === 0 ? 'UNMEASURED' : score >= 85 ? 'MASTERED' : score >= 70 ? 'OPERATIONAL' : 'REMEDIATE' }
  })
}

export function buildRemediation(profile) {
  const completed = new Set(profile.completedLessons || [])
  return deriveMastery(profile)
    .filter(domain => domain.status !== 'MASTERED')
    .sort((a, b) => a.score - b.score || a.evidence - b.evidence)
    .slice(0, 3)
    .map(domain => ({
      domain: domain.id,
      label: domain.label,
      score: domain.score,
      lessonId: domain.lessonIds.find(id => !completed.has(id)) || domain.lessonIds[domain.lessonIds.length - 1],
      reason: domain.evidence ? `${domain.label} is currently supported by ${domain.evidence} scored evidence point${domain.evidence === 1 ? '' : 's'}.` : `No scored evidence exists yet for ${domain.label}.`,
    }))
}
