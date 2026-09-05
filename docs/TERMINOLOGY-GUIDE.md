# DaemonCore Terminology Guide

DaemonCore uses established security, assessment, and reliability-engineering language alongside a small set of named product concepts. This guide distinguishes the two. It is the reference for application copy, lessons, manuals, release notes, demonstrations, and customer communications.

The rule is simple: branded language may make the product memorable, but it must never obscure what the system actually does.

## Established industry terminology

The following terms retain their ordinary professional meanings in DaemonCore.

| Term | Meaning in DaemonCore |
| --- | --- |
| Rules of Engagement (ROE) | The agreed conditions governing an assessment, including scope, schedule, permitted activity, contacts, and stop conditions. |
| Statement of Work (SOW) | The commercial or contractual description of the authorized work and expected deliverables. It is not, by itself, proof that every target or technique is authorized. |
| Scope / target allowlist | The exact hosts, addresses, ports, paths, identities, or environments approved for an engagement. |
| Authorization | Documented approval from a party with authority over the target system. Operator attestation records a claim; it does not independently prove ownership or authority. |
| Finding | An evidence-supported condition with affected assets, impact, reproduction information, limitations, remediation guidance, and status. |
| Evidence provenance | The source, time, operator, vantage point, scope reference, method, and integrity information needed to understand an artifact. |
| Evidence integrity | Controls used to detect modification, such as a SHA-256 digest and a verifiable record chain. Integrity is not the same as confidentiality, authenticity, or legal admissibility. |
| Baseline | A recorded reference state used for later comparison. |
| Retest | A bounded follow-up assessment used to verify remediation of the original condition and exposure path. |
| Campaign | A coordinated set of assessment activities performed under one engagement and scope. |
| Runbook | A documented operational procedure containing prerequisites, actions, decisions, stop conditions, recovery, and evidence requirements. |
| RPS | Requests per second achieved by a workload. |
| Concurrency | The number of operations or virtual users active at the same time. It is not interchangeable with RPS. |
| p95 latency | The response time at or below which 95 percent of measured responses completed during the stated interval. |
| Error rate | The proportion of workload operations classified as errors under the stated measurement rules. |
| Saturation | A resource approaching or reaching its useful capacity, such as CPU, memory, connection pools, workers, or queues. |
| SLO | A service-level objective: a measurable reliability target over a stated period. |
| Ramp test | A workload that changes progressively to observe behavior as demand rises or falls. |
| Spike test | A controlled, abrupt workload increase used to evaluate transient behavior and recovery. |
| Soak test | A sustained workload used to reveal time-dependent degradation or resource exhaustion. |
| Breakpoint test | A controlled test that increases pressure to identify the first unacceptable behavior or operating limit. |
| Recovery test | Observation of whether and when the system returns to an agreed healthy state after pressure ends. |
| Kill switch | An immediate operator-side or target-side mechanism for stopping workload execution. |

Tool names such as **k6**, **Locust**, and **Nmap** refer to their respective third-party projects. DaemonCore integration does not imply endorsement by or affiliation with those projects.

## DaemonCore product terminology

These names belong to DaemonCore. They are not presented as universal security-industry standards.

| DaemonCore name | Plain professional description |
| --- | --- |
| Academy | The learning, guided-practice, and assessment portion of the application. |
| Mission OS | DaemonCore's learning-path and practical-mission interface. |
| FieldOps | The licensed workspace for authorization-bound technical assessments, evidence handling, findings, and reporting. |
| War Room | The FieldOps operational dashboard for engagement readiness, execution, telemetry, and response. |
| Web Forge / Enterprise Forge | DaemonCore practical lab environments for web and enterprise-security workflows. |
| Chaos Engine | DaemonCore's controlled resilience and workload-testing experience. This is product language; **chaos engineering** is the broader industry discipline. |
| Execution Fabric | The local or customer-owned execution layer used to coordinate supported tools and workload workers. |
| Capacity Grant | A DaemonCore verification record published by the target owner that binds an approved target, workload ceiling, validity period, and challenge. It complements—but does not replace—the ROE or SOW. |
| Signed Permit | DaemonCore's signed authorization record containing the named operator, approver, scope, time window, permitted capabilities, and stop conditions. It is not a government permit or a substitute for legal authorization. |
| Workload Receipt | A signed record of the workload plan and execution facts retained for attribution and review. |
| Sealed Evidence | DaemonCore shorthand for digest-linked, tamper-evident evidence. “Sealed” does not mean encrypted, independently witnessed, or legally certified unless those additional controls are explicitly stated. |
| Evidence Vault | The application workspace that stores and verifies engagement evidence records. It is not advertised as a certified digital-forensics repository. |

When space permits, introduce a branded term with its professional equivalent. Example: **Capacity Grant — target-owner workload authorization**.

## Language standards

Use exact, evidence-bounded language:

- Say **observed**, **verified**, **not observed**, or **not tested** rather than implying certainty the evidence does not support.
- Say **authorized load, stress, capacity, or resilience testing** for controlled customer-owned workloads.
- Say **tamper-evident** when integrity is digest-backed. Do not automatically call that evidence “forensically sound,” “court admissible,” or “non-repudiable.”
- Say **operator-attributed** when an action is linked to a named operator and device key. A typed name is not independently verified identity.
- Distinguish **vulnerability detection**, **validation**, and **exploitation**. They are not synonyms.
- Distinguish **authentication**, **authorization**, and **accounting**.
- Preserve the difference between **threat**, **vulnerability**, **exposure**, **likelihood**, **impact**, and **risk**.
- Identify simulated, synthetic, lab, production-like, and production environments accurately.
- State the observation point, time window, limitations, and excluded activity when they affect a conclusion.

Avoid unsupported claims such as “military-grade,” “unhackable,” “anonymous,” “guaranteed secure,” “proof of ownership,” or “complete attack simulation.”

## Load and resilience language

DaemonCore supports controlled, authorization-bound workload testing. Product and marketing material should not describe this as a DDoS service.

Distributed denial-of-service describes an attack that makes a service unavailable through distributed traffic or resource exhaustion. Professional capacity and resilience testing instead uses an approved system, a defined workload, observable stop conditions, responsible operators, and coordinated recovery. Similar traffic volume does not make the terms interchangeable.

For every reported workload result, identify:

1. the authorized target and test window;
2. workload generator count and location;
3. profile, duration, RPS, concurrency, and achieved rate;
4. latency, error, saturation, and target-side telemetry sources;
5. abort thresholds and the actual stop reason;
6. generator limitations and dropped work;
7. recovery criteria and observed recovery time.

## Reference precedence

If interface copy conflicts with an engagement's executed ROE, SOW, authorization, or applicable law, the governing authorization and law take precedence. A DaemonCore control, permit, receipt, or warning never expands the operator's authority.

Terminology corrections should improve precision without rewriting historical evidence. Preserve original records, issue a corrected derivative where necessary, and document what changed.
