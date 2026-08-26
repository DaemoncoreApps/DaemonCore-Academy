export const course = {
  schemaVersion: 1,
  id: 'network-recon',
  code: 'NET-01',
  title: 'Network Reconnaissance',
  description: 'Build an authorized asset picture, test service hypotheses, preserve evidence, and report what the data actually supports.',
  estimatedMinutes: 205,
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
  ],
}

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
]
