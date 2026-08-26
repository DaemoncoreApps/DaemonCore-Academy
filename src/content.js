import { lessonPracticals } from './lesson-practicals.js'
import { lessonInteractives } from './lesson-interactives.js'

export const course = {
  schemaVersion: 1,
  id: 'network-recon',
  code: 'CORE-01',
  title: 'Full-Spectrum Security Assessment',
  description: 'Move from authorization and asset discovery through web, API, identity, cloud, container, validation, evidence, and remediation workflows.',
  estimatedMinutes: 515,
  lessons: [
    {
      id: 'rules-of-engagement', title: 'Scope and rules of engagement', minutes: 18,
      sections: [
        { title: 'Authorization is a technical input', body: 'Scope is not paperwork sitting beside the assessment. It determines which hosts, identities, techniques, hours, and data-handling actions are technically valid. Translate the signed rules into a checklist before touching the range.' },
        { title: 'Build a stop condition', body: 'A useful plan names the conditions that halt work: unexpected production data, an out-of-scope route, instability, or a request that changes the agreed objective. Stopping cleanly is an operator skill.' },
        { title: 'Keep the boundary visible', body: 'Record the approved ranges and exclusions where decisions happen. Re-check them before pivoting, testing credentials, or following a newly discovered dependency.' },
      ],
      check: { q: 'You discover a reachable host adjacent to the approved subnet. What is the correct action?', options: ['Scan it lightly', 'Add it to notes and continue', 'Stop and request a scope decision', 'Test only common ports'], answer: 2, rationale: 'Reachability is not authorization. Preserve the observation and get an explicit scope decision.' },
    },
    {
      id: 'recon-hypotheses', title: 'Reconnaissance as a hypothesis loop', minutes: 22,
      sections: [
        { title: 'Questions before commands', body: 'Start with a question: which approved assets are alive, which trust boundary is exposed, or whether an observed listener matches inventory. A command is useful only when its result changes your model.' },
        { title: 'Choose the smallest test', body: 'Prefer the least disruptive action that can separate competing explanations. A narrow connection test often answers the question before a broad probe is justified.' },
        { title: 'Update the model', body: 'Treat every result as evidence, not truth. Record what was observed, revise confidence, and choose the next test. This loop keeps recon deliberate instead of turning it into collection for its own sake.' },
      ],
      check: { q: 'What should determine the next reconnaissance action?', options: ['The tool with the most modules', 'The unresolved question with the highest value', 'The fastest available scan', 'The largest address range'], answer: 1, rationale: 'High-value uncertainty should drive the next minimally invasive test.' },
    },
    {
      id: 'asset-inventory', title: 'Building an asset inventory', minutes: 24,
      sections: [
        { title: 'Normalize identifiers', body: 'An asset may appear as an IP address, hostname, certificate name, cloud identifier, and owner record. Normalize these identifiers so one system does not become five unrelated rows.' },
        { title: 'Separate supplied and observed', body: 'Keep declared inventory separate from observed state. Differences between them are often the signal: shadow services, stale records, unexpected exposure, or an environment that changed after scoping.' },
        { title: 'Attach provenance', body: 'Every inventory fact needs a source and time. Provenance lets another operator reproduce the conclusion and helps explain legitimate drift.' },
      ],
      check: { q: 'Why keep supplied inventory separate from observed state?', options: ['To make the report longer', 'To expose meaningful differences and preserve provenance', 'Because hostnames cannot be trusted', 'To avoid recording timestamps'], answer: 1, rationale: 'The delta between declared and observed state is frequently the finding.' },
    },
    {
      id: 'packet-evidence', title: 'Reading packet evidence', minutes: 28,
      sections: [
        { title: 'Follow the conversation', body: 'A single packet rarely explains behavior. Reconstruct the exchange: initiation, negotiation, application data, and termination. Timing and direction often matter as much as payload.' },
        { title: 'Know what absence means', body: 'No response can mean filtering, routing failure, packet loss, or a quiet service. State the observation precisely rather than collapsing every absence into “closed.”' },
        { title: 'Capture with intent', body: 'Use narrow capture filters tied to the question, record the interface and time window, and preserve the original file. Analysis copies can change; evidence should not.' },
      ],
      check: { q: 'A SYN receives no reply. What can you conclude?', options: ['The port is closed', 'The host is offline', 'Only that no response was observed in that capture', 'A firewall blocked it'], answer: 2, rationale: 'Several causes fit the same absence. Report the observation without inventing the cause.' },
    },
    {
      id: 'ports-protocols', title: 'Ports, protocols, and state', minutes: 26,
      sections: [
        { title: 'Ports are coordinates', body: 'A port number identifies a transport endpoint. It does not prove which application owns the listener or whether encryption, authentication, or expected behavior is present.' },
        { title: 'Read state in context', body: 'Open, closed, and filtered are measurement outcomes produced by a specific method from a specific vantage point. Record both so the result remains meaningful.' },
        { title: 'Expect nonstandard placement', body: 'Administrative consoles, proxies, and legacy services frequently move away from conventional ports. Identify protocols from behavior instead of trusting the number.' },
      ],
      check: { q: 'What does an open TCP port prove?', options: ['The conventional service is running', 'A listener completed the tested connection behavior', 'The service is vulnerable', 'Authentication is disabled'], answer: 1, rationale: 'The observed transport behavior is the only direct conclusion.' },
    },
    {
      id: 'service-fingerprinting', title: 'Service fingerprinting', minutes: 28,
      sections: [
        { title: 'A banner is one witness', body: 'Banners can be stale, customized, proxied, or intentionally misleading. Use them as evidence, then corroborate with protocol behavior and environmental context.' },
        { title: 'Triangulate identity', body: 'Combine handshake behavior, response syntax, headers, certificates, and known inventory. Independent signals raise confidence; one ambiguous string does not.' },
        { title: 'Report confidence', body: 'Separate direct observations from inference. “HTTP response with Archive Console header; likely version 0.8” is stronger than asserting an exact product without support.' },
      ],
      check: { q: 'An open port 443 most directly proves which statement?', options: ['The host runs HTTPS', 'The host is vulnerable', 'A TCP listener accepted a connection on port 443', 'The service is a web server'], answer: 2, rationale: 'Port conventions are hypotheses. The connection behavior is the observation.' },
    },
    {
      id: 'evidence-quality', title: 'Evidence that survives review', minutes: 27,
      sections: [
        { title: 'Observation before interpretation', body: 'Capture the command, target, timestamp, and unedited result before writing what it means. This prevents a conclusion from quietly rewriting the evidence.' },
        { title: 'Make reproduction cheap', body: 'A reviewer should be able to repeat the safe validation without reconstructing your entire session. Include prerequisites, exact scope, expected signal, and cleanup.' },
        { title: 'Minimize sensitive material', body: 'Keep only what proves the point. Redact tokens and personal data, hash exported files, and never turn a finding into a second data exposure.' },
      ],
      check: { q: 'Which evidence note is strongest?', options: ['“Port looked strange”', 'A screenshot without context', 'Timestamped command, scoped target, raw result, and separated interpretation', 'A severity label'], answer: 2, rationale: 'Provenance and separation of observation from interpretation make evidence reviewable.' },
    },
    {
      id: 'finding-report', title: 'From signal to finding', minutes: 32,
      sections: [
        { title: 'State the condition', body: 'Name what is wrong in one testable sentence. Avoid drama and avoid leading with a tool. The condition should remain true if the validation tool changes.' },
        { title: 'Connect condition to consequence', body: 'Explain who can reach the condition, what trust boundary it crosses, and the realistic outcome. Technical possibility is not the same as business impact.' },
        { title: 'Recommend the control', body: 'Fix the broken assumption, not the demonstration. Give a primary remediation, compensating control, and a concrete way to verify the repair.' },
      ],
      check: { q: 'What belongs at the center of a finding?', options: ['The scanner name', 'The broken condition, evidence, consequence, and corrective control', 'A dramatic title', 'Every command used during recon'], answer: 1, rationale: 'A finding must explain a defensible condition and how to correct it.' },
    },
    {
      id: 'os-attack-surface', title: 'Windows and Linux attack surfaces', minutes: 28,
      sections: [
        { title: 'Model exposure by role', body: 'Start from what the system is meant to do. Services, scheduled work, administrative paths, local identities, and installed agents create different trust boundaries on workstations, servers, and appliances.' },
        { title: 'Configuration beats folklore', body: 'A platform name is not a finding. Compare observed configuration with the organization’s intended baseline, vendor guidance, patch state, and compensating controls.' },
        { title: 'Privilege is a graph', body: 'Treat users, groups, services, files, tokens, and management channels as connected paths. A weak edge matters when it joins an untrusted starting point to a protected capability.' },
      ],
      check: { q: 'What is the strongest way to describe an operating-system exposure?', options: ['The OS is old', 'A specific trust path connects an accessible condition to a protected capability', 'A scanner assigned a high score', 'The host runs many processes'], answer: 1, rationale: 'Concrete trust paths are testable and lead directly to useful remediation.' },
    },
    {
      id: 'web-surface-mapping', title: 'Web application surface mapping', minutes: 27,
      sections: [
        { title: 'Inventory behavior, not just routes', body: 'Map entry points, identities, objects, state changes, file handling, asynchronous jobs, and third-party callbacks. Routes only become meaningful when tied to trust decisions.' },
        { title: 'Follow transformations', body: 'Record where input is decoded, normalized, validated, stored, rendered, and forwarded. Different components may interpret the same value differently.' },
        { title: 'Use representative accounts', body: 'A useful test matrix separates anonymous, ordinary, privileged, suspended, and cross-tenant states. Keep every account synthetic and approved.' },
      ],
      check: { q: 'What should a web attack-surface map connect?', options: ['Routes to CSS files', 'Inputs and identities to objects, state changes, and trust decisions', 'Status codes to severity labels', 'Tools to screenshots'], answer: 1, rationale: 'Security failures occur at decisions and transformations, not merely at URLs.' },
    },
    {
      id: 'auth-sessions', title: 'Authentication and session security', minutes: 29,
      sections: [
        { title: 'Trace the identity lifecycle', body: 'Review enrollment, verification, sign-in, recovery, step-up, session renewal, revocation, and account closure as one system. An isolated strong login cannot repair a weak recovery path.' },
        { title: 'Separate proof from possession', body: 'Document what each factor proves, where secrets are handled, and how replay is prevented. A token proves possession only under the conditions in which it is validated.' },
        { title: 'Test state transitions', body: 'Safely verify that logout, password reset, privilege change, and administrative suspension invalidate the sessions they are supposed to invalidate.' },
      ],
      check: { q: 'Why assess account recovery alongside login?', options: ['Recovery pages are faster', 'Recovery can bypass the assurances enforced by login', 'It changes password length', 'It removes the need for sessions'], answer: 1, rationale: 'The weakest identity lifecycle path often defines the real authentication strength.' },
    },
    {
      id: 'authorization-testing', title: 'Authorization and tenant boundaries', minutes: 30,
      sections: [
        { title: 'Name subject, action, and object', body: 'Every authorization test should identify who is acting, what operation is attempted, and which object or tenant boundary is involved.' },
        { title: 'Server decisions are authoritative', body: 'Hidden buttons and client-side route guards improve usability but do not enforce access. The server must evaluate permission for every protected operation.' },
        { title: 'Build a compact access matrix', body: 'Use approved synthetic roles and objects to compare allowed and denied outcomes. Stop once the control failure is proven; do not enumerate unrelated customer data.' },
      ],
      check: { q: 'Which evidence best supports an object-level authorization failure?', options: ['A hidden UI control', 'An approved low-privilege identity receives a protected synthetic object it does not own', 'A route contains an ID', 'The response is JSON'], answer: 1, rationale: 'The result demonstrates the broken server-side decision while minimizing data exposure.' },
    },
    {
      id: 'injection-validation', title: 'Injection classes and safe validation', minutes: 28,
      sections: [
        { title: 'Find interpreter boundaries', body: 'Injection risk appears when untrusted data crosses into a query, template, command, expression, or parser as structure instead of data.' },
        { title: 'Prefer harmless proofs', body: 'Use synthetic records, reversible behavior, and the smallest observable signal. Never make destructive changes merely to increase confidence.' },
        { title: 'Fix composition', body: 'Primary controls include parameterization, safe APIs, contextual encoding, strict schemas, and removal of unnecessary interpreter features. Filtering alone is rarely the whole repair.' },
      ],
      check: { q: 'What is the safest useful validation of suspected injection?', options: ['Delete a test table', 'Produce the smallest reversible signal using synthetic data', 'Dump all available records', 'Increase request volume'], answer: 1, rationale: 'A minimal proof establishes the condition without manufacturing additional harm.' },
    },
    {
      id: 'api-security', title: 'API and GraphQL assessment', minutes: 28,
      sections: [
        { title: 'Start from the contract', body: 'Compare documentation, schemas, client behavior, and observed endpoints. Undocumented operations, legacy versions, and inconsistent gateways are common sources of drift.' },
        { title: 'Track object and function controls', body: 'Test whether identity, tenant, role, object ownership, and workflow state are enforced consistently across read and write operations.' },
        { title: 'Bound resource tests', body: 'Validate pagination, query complexity, upload size, and rate controls with conservative limits and an agreed stop threshold. Availability testing requires its own authorization.' },
      ],
      check: { q: 'What requires a separate stop threshold during API testing?', options: ['Reading documentation', 'Any test that can consume meaningful resources or affect availability', 'Comparing schemas', 'Recording response headers'], answer: 1, rationale: 'Resource-consumption tests can affect service health even when the endpoint is in scope.' },
    },
    {
      id: 'identity-directory', title: 'Enterprise identity and directory paths', minutes: 27,
      sections: [
        { title: 'Map control relationships', body: 'Directory security depends on group membership, delegated rights, service identities, policy application, certificate trust, and administrative tiers—not merely password strength.' },
        { title: 'Protect credential material', body: 'Use designated test accounts and approved exports. Do not collect production secrets when configuration and access-control evidence can prove the same condition.' },
        { title: 'Prioritize path reduction', body: 'Remediation should remove unnecessary control edges, isolate administrative identities, rotate exposed material, and add detection around sensitive transitions.' },
      ],
      check: { q: 'What makes a directory permission important?', options: ['Its name sounds privileged', 'It creates a usable control path to a protected identity or system', 'It appears in a large group', 'It was found by automation'], answer: 1, rationale: 'Effective paths, not labels, determine privilege exposure.' },
    },
    {
      id: 'cloud-control-plane', title: 'Cloud control-plane assessment', minutes: 28,
      sections: [
        { title: 'Separate planes', body: 'Inventory identities, management APIs, public data paths, workload networks, secrets, logs, and deployment automation. Each plane has distinct exposure and evidence.' },
        { title: 'Reason about effective access', body: 'Combine identity policies, resource policies, trust relationships, organization controls, and temporary credentials before concluding what an actor can do.' },
        { title: 'Review guardrails and recovery', body: 'A mature assessment checks preventive policy, detection, immutable logging, backup isolation, and the ability to recover from compromised automation.' },
      ],
      check: { q: 'Why is one cloud policy document insufficient to prove access?', options: ['Policies are encrypted', 'Effective access can depend on several intersecting policy and trust layers', 'Cloud platforms ignore policies', 'Only network rules matter'], answer: 1, rationale: 'The final decision is produced by multiple identity, resource, and organization controls.' },
    },
    {
      id: 'containers-supply-chain', title: 'Containers and software supply chain', minutes: 26,
      sections: [
        { title: 'Trace artifact provenance', body: 'Record where source, dependencies, build workers, registries, signatures, and deployment identities meet. A trustworthy runtime begins before the image exists.' },
        { title: 'Inspect isolation assumptions', body: 'Review capabilities, mounts, identities, network boundaries, admission controls, secret delivery, and host interaction. Containers are process isolation, not an automatic security boundary.' },
        { title: 'Prioritize reachable risk', body: 'A dependency advisory matters when the affected component is present, reachable, and used in the vulnerable way. Preserve both version evidence and runtime context.' },
      ],
      check: { q: 'What makes a vulnerable dependency operationally relevant?', options: ['It has a logo', 'The affected code is present and reachable in the deployed context', 'It appears in any lockfile', 'Its score is above zero'], answer: 1, rationale: 'Reachability and actual use convert inventory into an evidence-backed exposure.' },
    },
    {
      id: 'secrets-credential-audit', title: 'Secrets and credential auditing', minutes: 25,
      sections: [
        { title: 'Audit handling before strength', body: 'Review creation, storage, distribution, rotation, revocation, logging, and recovery. A strong secret copied into an unsafe channel is still exposed.' },
        { title: 'Prefer offline and synthetic checks', body: 'Password-policy evaluation should use approved test identities or sanctioned offline datasets. Network guessing creates account-lockout and availability risk and requires explicit technique-level approval.' },
        { title: 'Prove revocation', body: 'After rotation or role removal, verify that old material, cached sessions, build artifacts, and downstream copies no longer authorize access.' },
      ],
      check: { q: 'What is the preferred way to assess password controls?', options: ['Guess against every account', 'Use approved synthetic identities or sanctioned offline data with defined limits', 'Disable lockout', 'Collect employee passwords'], answer: 1, rationale: 'Controlled offline or synthetic validation avoids harming identities and production authentication.' },
    },
    {
      id: 'vulnerability-validation', title: 'Vulnerability validation and prioritization', minutes: 25,
      sections: [
        { title: 'Separate detection from proof', body: 'A version match or scanner signature is a lead. Confirm the affected component, configuration, reachability, prerequisite access, and protective controls before writing the finding.' },
        { title: 'Model realistic chains', body: 'Prioritize conditions that combine into credible paths, but keep each link evidence-backed. Do not inflate impact with an imaginary starting position.' },
        { title: 'Use environmental severity', body: 'Technical severity is one input. Asset role, exposure, data sensitivity, exploit preconditions, monitoring, and recovery determine the operational priority.' },
      ],
      check: { q: 'What turns an automated detection into a defensible finding?', options: ['A higher scanner confidence', 'Validated affected behavior, context, prerequisites, and evidence', 'A public headline', 'More duplicate detections'], answer: 1, rationale: 'Validation connects a generic signature to the actual environment and risk.' },
    },
    {
      id: 'impact-cleanup', title: 'Impact demonstration, cleanup, and retest', minutes: 34,
      sections: [
        { title: 'Agree on the ceiling', body: 'Before impact validation, define which data, roles, state changes, and service effects are permitted. The assessment should stop at the agreed proof point.' },
        { title: 'Track every artifact', body: 'Maintain a cleanup ledger for accounts, files, jobs, tokens, callbacks, test records, and temporary infrastructure. Verify removal rather than assuming it.' },
        { title: 'Retest the control', body: 'A good retest repeats the minimal original validation, confirms the intended denial or safe behavior, and checks that the fix did not merely move the exposure.' },
      ],
      check: { q: 'When should an impact demonstration stop?', options: ['When every possible action is tried', 'At the pre-agreed proof point that establishes the risk', 'After production data is copied', 'When the tool exits'], answer: 1, rationale: 'A defined ceiling proves risk while respecting authorization and minimizing harm.' },
    },
  ],
}

for (const lesson of course.lessons) {
  Object.assign(lesson, lessonPracticals[lesson.id] || {})
  lesson.interactive=lessonInteractives[lesson.id]
  lesson.minutes=lesson.level==='PRACTITIONER'?50:45
}
course.estimatedMinutes=course.lessons.reduce((total,lesson)=>total+lesson.minutes,0)

export const intelArticles = [
  { id: 'recon-loop', type: 'FIELD NOTE', title: 'The reconnaissance loop', readMinutes: 6, summary: 'Move from scope to observation, hypothesis, validation, and evidence without creating noise.', sections: [
    ['Start with the decision', 'Write the decision this reconnaissance should support. If the output cannot change that decision, the action is probably noise.'],
    ['Preserve negative results', 'A failed connection is still evidence when the method, vantage point, and time are recorded.'],
    ['Close the loop', 'End each cycle by updating the asset model and naming the next unresolved question.'],
  ]},
  { id: 'http-evidence', type: 'PLAYBOOK', title: 'Reading HTTP like evidence', readMinutes: 9, summary: 'A durable model for requests, responses, sessions, and trust boundaries.', sections: [
    ['Follow state', 'Trace where identity is established, how it is carried, and which server-side decision consumes it.'],
    ['Separate controls', 'Authentication proves an identity claim. Authorization decides whether that identity may act on a specific object.'],
    ['Record both sides', 'A useful HTTP artifact includes the relevant request and response with secrets removed.'],
  ]},
  { id: 'finding-writing', type: 'STANDARD', title: 'Write findings that get fixed', readMinutes: 8, summary: 'Turn technical evidence into risk, reproducibility, and clear remediation.', sections: [
    ['Lead with the condition', 'Say what is broken before explaining how it was found.'],
    ['Calibrate impact', 'Describe the realistic path from access to consequence and name the assumptions.'],
    ['Make closure testable', 'A remediation should include a validation step that proves the control now holds.'],
  ]},
  { id: 'range-roe', type: 'PROTOCOL', title: 'Lab rules of engagement', readMinutes: 5, summary: 'The authorization boundaries that keep practice controlled and useful.', sections: [
    ['Range identity', 'Confirm the scenario, target names, and network boundary before starting.'],
    ['No boundary testing', 'Containment is a safety control, not an invitation to test the host or surrounding network.'],
    ['Teardown is part of the mission', 'Destroy disposable systems, preserve only required evidence, and verify cleanup.'],
  ]},
]

export const drillSets = [
  { id: 'protocol-recognition', title: 'Protocol recognition', description: 'Read transport evidence without overclaiming.', questions: [
    { q: 'A TCP SYN receives a SYN-ACK. What is directly supported?', options: ['The application is secure', 'A TCP listener accepted the handshake on that port', 'The conventional service is installed', 'The host permits all traffic'], answer: 1 },
    { q: 'Which signal best strengthens a service fingerprint?', options: ['The port number alone', 'Independent agreement between handshake behavior, headers, and inventory', 'A single product banner', 'The scanner severity'], answer: 1 },
    { q: 'Why record the scan vantage point?', options: ['For visual polish', 'Network controls can produce different states from different locations', 'It changes the port number', 'It prevents packet loss'], answer: 1 },
  ]},
  { id: 'request-anatomy', title: 'Request anatomy', description: 'Locate identity, object, and trust decisions in HTTP.', questions: [
    { q: 'Which value most often carries session identity?', options: ['The response status text', 'A cookie or authorization header', 'The server date', 'The content length'], answer: 1 },
    { q: 'Changing an object identifier returns another user’s record. Which control is most likely missing?', options: ['TLS', 'Object-level authorization', 'DNSSEC', 'Compression'], answer: 1 },
    { q: 'What must be removed from a captured request before sharing evidence?', options: ['The method', 'The path', 'Live tokens and unrelated personal data', 'The response code'], answer: 2 },
  ]},
  { id: 'evidence-triage', title: 'Evidence triage', description: 'Separate direct observation from inference.', questions: [
    { q: 'Which phrase is an observation?', options: ['The attacker exfiltrated data', 'A process opened a connection to the synthetic sink at 22:32:10Z', 'The endpoint is compromised', 'The user was malicious'], answer: 1 },
    { q: 'Two events occur close together. What is still required before claiming causation?', options: ['A severity score', 'Evidence connecting the events and alternative explanations', 'A screenshot', 'A longer timeline'], answer: 1 },
    { q: 'What should happen to original evidence?', options: ['Edit it for clarity', 'Preserve it and work from copies', 'Delete it after screenshots', 'Rename all fields'], answer: 1 },
  ]},
  { id: 'finding-quality', title: 'Finding quality', description: 'Choose evidence-backed impact and remediation.', questions: [
    { q: 'Which title is strongest?', options: ['Critical vulnerability found', 'Unauthenticated archive status service exposed on the internal range', 'Nmap results', 'Server problem'], answer: 1 },
    { q: 'A useful remediation fixes what?', options: ['The screenshot', 'The broken trust assumption or missing control', 'The tester’s command', 'The severity label'], answer: 1 },
    { q: 'What makes impact credible?', options: ['Maximum theoretical damage', 'A realistic path tied to evidence and stated assumptions', 'More adjectives', 'A public exploit link'], answer: 1 },
  ]},
  { id: 'authorization-matrix', title: 'Authorization matrix', description: 'Reason across roles, objects, actions, and tenants.', questions: [
    { q: 'A standard user can read a synthetic record owned by another tenant. What failed?', options: ['Transport encryption', 'Object-level authorization', 'DNS resolution', 'Input encoding'], answer: 1 },
    { q: 'Which comparison gives the clearest access-control evidence?', options: ['Two browsers with the same account', 'Approved identities with different roles acting on the same synthetic object', 'Two public pages', 'Two response times'], answer: 1 },
    { q: 'When should cross-tenant validation stop?', options: ['After enumerating all tenants', 'Once the approved synthetic proof establishes the control failure', 'After downloading a backup', 'When the session expires'], answer: 1 },
  ]},
  { id: 'cloud-reasoning', title: 'Cloud control reasoning', description: 'Combine identity, resource, and organization policies.', questions: [
    { q: 'What is effective access?', options: ['The text of one identity policy', 'The final result of all applicable policy and trust layers', 'The console button color', 'The account name'], answer: 1 },
    { q: 'Which evidence best supports public data exposure?', options: ['A bucket-like name', 'An anonymous approved request retrieves a designated synthetic object', 'A policy contains an asterisk', 'A scanner warning'], answer: 1 },
    { q: 'What should accompany a cloud permission finding?', options: ['Only the permission name', 'The principal, resource, action, conditions, and observed outcome', 'A billing estimate', 'Every account ID'], answer: 1 },
  ]},
  { id: 'credential-safety', title: 'Credential audit safety', description: 'Evaluate credential controls without harming accounts.', questions: [
    { q: 'Which password assessment is safest by default?', options: ['High-rate network guessing', 'A bounded check using approved synthetic identities or sanctioned offline data', 'Disabling lockout', 'Testing executive accounts first'], answer: 1 },
    { q: 'What must be defined before any online authentication test?', options: ['A color theme', 'Accounts, rate, timing, lockout risk, monitoring, and stop conditions', 'The longest wordlist', 'A public proxy'], answer: 1 },
    { q: 'After secret rotation, what still needs validation?', options: ['Only that a new value exists', 'Old copies and sessions no longer authorize access', 'The secret is longer', 'The UI changed'], answer: 1 },
  ]},
  { id: 'assessment-triage', title: 'Assessment triage', description: 'Prioritize evidence, exposure, and realistic attack paths.', questions: [
    { q: 'Which issue should usually be validated first?', options: ['The one with the longest output', 'A reachable high-impact trust failure with clear evidence', 'The newest CVE number', 'The issue with the most screenshots'], answer: 1 },
    { q: 'What reduces confidence in an automated detection?', options: ['The affected feature is absent or unreachable', 'The scanner is popular', 'The port is open', 'The asset has an owner'], answer: 0 },
    { q: 'What makes a retest complete?', options: ['The alert disappeared', 'The minimal original proof now fails safely and the intended control is observed', 'The version changed', 'The ticket closed'], answer: 1 },
  ]},
]
