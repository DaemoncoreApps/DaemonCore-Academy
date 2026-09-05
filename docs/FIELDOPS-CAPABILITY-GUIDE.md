# DaemonCore FieldOps Capability and Technology Guide

**Release 6.5.1 | Windows and Linux | September 2026**

DaemonCore FieldOps is an authorization-bound assessment workspace for professional operators. It brings scope, execution, evidence, findings, resilience testing, and reporting into one local-first desktop record. This guide describes the capabilities shipped in release 6.5.1, the technologies FieldOps works with, and the operational limits buyers and operators should understand.

FieldOps does not grant authority over any system. A license unlocks the software. A valid engagement, signed Rules of Engagement, target-owner approval, and applicable law govern the work.

## Capability status key

| Status | Meaning |
| --- | --- |
| Native | FieldOps performs the operation directly and records the result. |
| Managed integration | FieldOps launches a supported external engine with fixed arguments, streams output, and seals successful results. |
| Evidence bridge | FieldOps detects the external tool, exports signed scope, and imports supported structured results; the operator runs the tool separately. |
| Academy range | Available as a contained learning or practice workflow, not as a FieldOps production runner. |
| Not currently provided | Not executed or orchestrated by FieldOps 6.5.1. |

## What FieldOps is built to answer

FieldOps is designed around questions an assessor must be able to defend:

- What exact system was authorized, resolved, and reached?
- Which TCP services were reachable inside the declared port set?
- What did the service identify itself as, and how confident is that identification?
- What HTTP, TLS, and certificate posture was observed from this vantage point?
- What changed since the prior surface baseline?
- How did the service behave under an owner-approved workload?
- Which evidence supports the finding, impact, remediation, and retest decision?
- Who operated the assessment, who approved it, and when did every action occur?

## Assessment lifecycle coverage

| Phase | FieldOps capability | Output |
| --- | --- | --- |
| Prepare | Named operator enrollment, device key, engagement definition, approver and authorization reference | Operator identity and signed operation permit |
| Constrain | Exact targets, TCP ports, network boundary, time window, policy and execution capacity | Enforced authorization boundary |
| Discover | DNS, TCP reachability, allowed-port survey and service profiling | Digest-sealed captures |
| Characterize | HTTP response and posture, TLS identity, web mapping, deep service inventory | Asset and service evidence |
| Compare | Complete surface baseline and prior-versus-current drift analysis | Change intelligence |
| Validate | Managed Nmap or imported specialist-tool evidence | Tool-attributed evidence record |
| Exercise | Managed k6 and bounded Chaos Engine resilience profiles | Workload telemetry and signed receipt |
| Assess | Findings, severity, impact, remediation, disposition and retest | Reviewed finding register |
| Report | Printable report and machine-readable case export | Client report and JSON evidence bundle |
| Close | Scope closure with evidence retained and execution blocked | Durable closed engagement |

## Authorization and operator identity

### Named operator enrollment

**Status: Native**

FieldOps records the operator's name, organization and professional email, then creates an Ed25519 key pair bound to the local installation. The public fingerprint is included in signed permits and operation receipts. The private key is protected through operating-system credential storage when supported.

Operator attribution is tamper-evident, not independent identity verification. A typed identity must still be checked through the organization's normal personnel and engagement process.

### Signed operation permits

**Status: Native**

Each new engagement can bind:

- client and engagement name;
- named approving authority and professional email;
- authorization reference;
- internal or external network mode;
- exact targets and TCP ports;
- validity start and end times;
- Observe, Validate or Stress policy level;
- Guarded or Professional execution profile;
- permitted operations and execution capacity.

FieldOps verifies the permit signature, active time window, operation allowance, and agreement between the current engagement record and the signed permit before execution.

### Destination resolution and pinning

**Status: Native**

FieldOps resolves authorized hostnames and pins an operation to a resolved address. External engagements reject loopback, private, link-local, multicast, reserved, documentation and mixed-boundary results. Internal engagements accept private address space and reject public destinations. HTTP operations connect to the pinned address while retaining the authorized hostname for Host and TLS server-name checks.

## Native network diagnostics

| Capability | Technology | What FieldOps records |
| --- | --- | --- |
| DNS resolution | Operating-system DNS resolver | Authorized hostname and resolved IPv4 or IPv6 addresses |
| DNS profile | DNS A, AAAA, CNAME, MX, NS and TXT queries where available | Record sets, aliases and mail or name-service context |
| TCP reachability | TCP connect | Connection success or failure and observed latency |
| Allowed-port survey | Concurrent TCP connect across the signed port list | Open, closed or rejected, and filtered or unresponsive observations |
| HTTP response | Pinned HTTP or HTTPS HEAD request | Status, status text and bounded response headers |
| HTTP security posture | Header and transport analysis | Evidence-based posture signals and observations |
| TLS identity | Node TLS client | Protocol, cipher, ALPN, trust result, subject, SAN, issuer, validity and SHA-256 fingerprint |
| Service profile | Banner, HTTP and TLS correlation | Likely service, evidence signal and confidence |
| Bounded web map | Approved-path HTTP inspection | Reachable web-path observations inside the declared endpoint |
| Basic resilience baseline | Ten spaced HEAD samples | Success count, response durations and average duration |

FieldOps does not treat a port number or banner as proof of a vulnerability. Results are observations that an operator must interpret and, where authorized, validate.

## Asset intelligence and surface comparison

### Complete target baseline

**Status: Native**

The complete baseline combines address resolution, allowed-port state, service observations, HTTP posture and available TLS evidence for one authorized target. A later baseline can be compared with the prior sealed capture.

FieldOps change intelligence can highlight:

- added or removed addresses;
- opened, closed or state-changed declared ports;
- changed HTTP posture signals;
- changed TLS certificate identity or validity details;
- material differences in the observed web surface.

The Evidence workspace groups captures by authorized asset, displays the latest observed services, and exposes material drift for review.

### Deep service inventory

**Status: Native with managed-engine support**

Deep inventory examines the signed port set and builds structured service records. When managed Nmap is selected, FieldOps uses service and version detection to normalize protocol, state, reason, product, version, tunnel, CPE and confidence information.

## Managed Nmap execution

**Status: Managed integration**

FieldOps can use a locally installed Nmap executable or its pinned Docker adapter. The managed runner:

- accepts one already resolved and authorized IP address;
- accepts only the engagement's normalized TCP port list;
- invokes the process directly without a command shell;
- uses TCP connect scanning with host discovery and DNS disabled;
- requests service and version detection with bounded retries;
- streams process output into the War Room;
- supports operator cancellation and execution timeout;
- parses Nmap XML into structured service evidence;
- records the engine and version;
- seals a successful result into the engagement evidence chain.

The Docker fallback uses `instrumentisto/nmap:7.98-r2` and requires a running Docker engine. Docker may retrieve the image on first use.

FieldOps 6.5.1 does not expose arbitrary Nmap flags or shell text through the managed runner.

## Tool and technology matrix

| Technology | FieldOps relationship | Primary use |
| --- | --- | --- |
| Nmap | Managed integration; native executable or Docker adapter | TCP service and version inventory |
| Docker Engine | Native runtime integration | Nmap adapter and contained Academy ranges |
| Grafana k6 | Managed integration | Verified HTTP workload and resilience execution |
| ProjectDiscovery Nuclei | Evidence bridge | Template-driven validation evidence |
| Locust | Evidence bridge | Customer-managed workload evidence |
| Wireshark and TShark | Evidence bridge | Packet and protocol evidence |
| Hashcat | Evidence bridge | Offline credential-audit evidence |
| JSON | Native evidence intake and case export | Structured external results and engagement records |
| SARIF | Native evidence intake | Static and security-analysis result exchange |
| HTML | Native report export | Printable client-facing engagement report |
| SHA-256 | Native integrity control | Capture, source-file and audit-chain digests |
| Ed25519 | Native signing control | Operator permits and operation receipts |
| OS credential storage | Native platform integration | Protection of licensing and FieldOps signing secrets |

Availability detection reports the installed tool version where possible. Detection does not mean FieldOps manages every capability of that tool.

## Signed scope export and evidence intake

### Execution manifests

**Status: Native**

For supported tools, FieldOps exports a signed execution manifest containing the engagement, tool, target boundary, ports, policy, permit reference and applicable workload information. This gives an operator a portable scope artifact for a separately operated specialist tool.

### Evidence bridges

**Status: Native intake for externally executed tools**

FieldOps can import JSON or SARIF evidence attributed to Nuclei, Locust, TShark, Hashcat and other cataloged tools. The intake workflow:

- never executes imported content;
- validates the selected format and structure;
- records the original filename and SHA-256 source digest;
- binds the result to one exact authorized target;
- records the source tool and version context when supplied;
- seals the imported document as a reviewable capture.

Raw packet captures, password-cracking sessions and arbitrary tool output are not executed by the evidence bridge. Preserve source artifacts using the client's approved evidence-storage process.

## Assessment campaigns

**Status: Native**

Campaign Control coordinates repeatable approved checks across selected targets in one engagement. Shipped profiles include:

| Profile | Coordinated operations |
| --- | --- |
| Service Inventory | Deep service inventory |
| Surface Verification | DNS profile and complete surface baseline |
| Complete Assessment | DNS profile, deep inventory and complete surface baseline |

Campaigns maintain a durable task ledger and progress summary. Operators can request pause, resume interrupted or failed work, and cancel safely. An active module is allowed to finish before pause or cancellation completes, preventing an abrupt partial write from being represented as complete evidence.

## Managed load and resilience testing

### Target-hosted capacity verification

**Status: Native control**

Before managed load execution, the exact target must publish a challenge-bound JSON capacity grant at a DaemonCore well-known path. FieldOps verifies the target, authorization reference, challenge, transport, port, source address, expiration, maximum requests per second, maximum concurrency and maximum duration.

External grants require verified TLS. The target must continue resolving to the address that issued the grant when execution begins.

### Managed Grafana k6

**Status: Managed integration**

FieldOps generates a fixed, shell-free HTTP GET workload and launches a locally installed k6 process. Supported profiles are:

| Profile | Intended question |
| --- | --- |
| Ramp | How does behavior change as arrival rate rises and falls? |
| Spike | How does the service absorb and recover from a short abrupt increase? |
| Soak | Does sustained approved demand reveal time-dependent degradation? |
| Breakpoint | Where does the first unacceptable behavior appear within the grant? |
| Recovery | Does the service return to the agreed state after sustained demand? |

The plan binds target, resolved address, port, path, transport, requested RPS, duration, concurrency, p95 threshold, error threshold and capacity-grant digest. Redirects are disabled and response bodies are discarded.

### Live and final telemetry

FieldOps records or displays:

- total HTTP requests and achieved RPS;
- p50, p90, p95 and p99 request duration in the final summary;
- error rate;
- dropped iterations;
- maximum virtual users;
- passed and failed checks;
- engine identity and version;
- process output, lifecycle state, stop reason and outcome.

The War Room displays live request count, achieved RPS, p95 latency, error rate and dropped iterations as data becomes available. Target-side CPU, memory, queues, pools and dependency saturation require the customer's monitoring platform; FieldOps does not invent target telemetry it cannot observe.

### Stop controls

**Status: Native**

Managed load provides an immediate local process stop. FieldOps also polls a challenge-bound target-side stop endpoint; the system owner can stop the active run or all challenge-bound runs. A completed or stopped workload is sealed with its signed receipt, plan, engine information, metrics and outcome.

## Chaos Engine

**Status: Native bounded resilience sampler**

The Chaos Engine runs short HTTP HEAD-based resilience experiments against one authorized endpoint. It supports baseline, ramp, spike, soak and recovery profiles, captures latency and error behavior, calculates a resilience score, applies automatic p95 and error-rate abort criteria, and retains an experiment ledger.

Chaos Engine is intentionally distinct from managed k6. It is a bounded workstation-side sampler for rapid validation. Managed k6 is the capability for owner-verified workload execution under a target-hosted capacity grant.

Chaos Engine 6.5.1 is not a host-fault, process-kill, packet-loss, infrastructure-failure or distributed denial-of-service framework.

## Evidence integrity and auditability

### Capture integrity

**Status: Native**

Every FieldOps capture includes a SHA-256 digest over its stored content. Snapshot verification detects a changed capture. Imported evidence also retains the source-file digest.

### Activity ledger

**Status: Native**

Engagement activity is written to a hash-linked audit chain. Entries record operation, status, summary, evidence reference and timestamp. Where operator signing is configured, operation receipts are signed with the device-bound Ed25519 key.

### Integrity semantics

FieldOps provides tamper evidence and operator attribution. It does not claim that a local record is independently witnessed, legally admissible, immutable against an administrator, or proof that a typed operator identity and authorization claim are truthful. Export promptly and place important case material under the client's normal evidence-retention controls.

## Findings and remediation verification

**Status: Native**

Operators can promote captures into findings and record:

- affected target and concise condition title;
- severity from informational through critical;
- observation and supporting evidence;
- credible impact and limitations;
- remediation guidance;
- open, accepted, remediated or closed disposition;
- evidence-backed retest history;
- fixed or still-present retest verdict.

FieldOps prevents a finding from pretending that unsupported tool output is proof. The quality of the conclusion still depends on the operator's technical judgment, authorization and evidence.

## Reports and portable case records

### Professional report

**Status: Native**

The printable HTML report includes engagement and authorization metadata, named operator and approving authority, integrity state, finding counts, campaign summary, service inventory, surface-change intelligence, finding details and retest counts.

### Machine-readable case export

**Status: Native**

The JSON case bundle includes the engagement, operator identity, managed-tool jobs, load runs, campaigns, captures, findings, Chaos Engine runs, audit entries and integrity results. It is suitable for archival, independent review and downstream transformation.

## Operating systems and storage

| Area | Windows | Linux |
| --- | --- | --- |
| Desktop package | Installer and Microsoft Store package path | AppImage and Debian package |
| FieldOps workspace | Supported | Supported |
| Docker-backed Academy ranges | Docker Desktop | Docker Engine or compatible runtime |
| Managed Nmap | Local executable or Docker adapter | Local executable or Docker adapter |
| Managed k6 | Locally installed k6 | Locally installed k6 |
| Secret protection | Windows credential protection | Secret Service-compatible keyring such as GNOME Keyring or KWallet |
| Local persistence | Electron user-data directory | Electron user-data directory |

Operator records, Academy progress, FieldOps case files and license state are designed to persist across application upgrades when the normal installer and package paths are used. Export important engagements before workstation migration, profile deletion or operating-system reinstallation.

## Guarded and Professional execution profiles

| Control | Guarded | Professional |
| --- | --- | --- |
| Intended use | Focused validation | Experienced assessment teams |
| Target capacity | Up to 100 declared targets | Exact target list signed into the engagement |
| Port capacity | Up to 128 declared ports | Exact port list signed into the engagement |
| Port-survey concurrency | Four by default | Operator-selected within signed capacity, up to 64 |
| Managed Nmap window | Six minutes by default | Configurable within signed capacity, up to 60 minutes |
| Authorization enforcement | Required | Required |
| Destination pinning and audit | Required | Required |

Professional removes product-wide target and port cardinality ceilings; it does not remove authorization, boundary, time-window, process-stop, integrity or workstation-resource controls.

## Hacker mindset in a professional workflow

FieldOps supports adversarial thinking without turning evidence into theater. The operator workflow is:

1. **Model the target.** Identify names, addresses, services, trust boundaries and dependencies inside scope.
2. **Question assumptions.** Compare declared architecture with observed DNS, service, HTTP and TLS evidence.
3. **Find the weak signal.** Look for unexpected exposure, identity drift, missing controls, inconsistent responses and fragile capacity.
4. **Prove the minimum.** Use the least invasive operation that establishes the condition and stop when the proof point is reached.
5. **Think in paths.** Connect exposure, prerequisite, control failure and consequence without overstating untested steps.
6. **Preserve uncertainty.** Record competing explanations and the evidence needed to resolve them.
7. **Retest the control.** Verify that remediation breaks the demonstrated path without breaking intended service behavior.

The mindset is offensive. The operating standard is controlled, attributable and reproducible.

## What FieldOps 6.5.1 does not currently provide

For accurate procurement and operator expectations, the current release does not provide:

- arbitrary shell or unrestricted command execution through FieldOps;
- a managed exploitation-framework runner;
- payload generation, persistence or destructive post-exploitation automation;
- online password guessing or credential spraying;
- wireless, Bluetooth, radio-frequency or hardware-bus testing;
- active packet capture or packet injection through the TShark evidence bridge;
- managed Hashcat cracking sessions;
- managed Nuclei or Locust execution;
- cloud-provider API enumeration or cloud control-plane remediation;
- endpoint detection and response, malware analysis or host-forensics acquisition;
- vulnerability-feed subscription or automatic CVE enrichment;
- centrally orchestrated distributed load workers in release 6.5.1;
- independent approver identity verification or a hosted certificate authority;
- a replacement for client monitoring, ticketing, SIEM, evidence storage or legal review.

These boundaries distinguish shipped functionality from external-tool interoperability and future product direction.

## Deployment prerequisites

### Required

- DaemonCore Academy 6.5.1 on a supported Windows or Linux desktop;
- active FieldOps entitlement;
- named operator identity and protected local signing key;
- written authorization and exact engagement scope;
- network access to the authorized target;
- sufficient local storage for case data and exports.

### Capability dependent

- Nmap installed locally, or Docker running for the managed Nmap adapter;
- Grafana k6 installed locally for managed load execution;
- target-owner capacity grant and stop endpoint for managed load;
- Nuclei, Locust, TShark or Hashcat for their respective external evidence workflows;
- customer monitoring for target saturation and recovery telemetry;
- Linux keyring service for protected FieldOps credentials on Linux.

## Capability selection guide

| Operator question | Recommended starting capability |
| --- | --- |
| Where does this name resolve? | DNS resolution or DNS profile |
| Is this exact declared service reachable? | TCP reachability |
| Which declared ports respond? | Allowed-port survey |
| What appears to be listening? | Service profile or managed Nmap |
| What does the web endpoint reveal without a body request? | HTTP response and posture |
| Does certificate identity match the intended service? | TLS identity |
| What changed since the last approved review? | Complete target baseline and change intelligence |
| Can I repeat the same checks across several targets? | Campaign Control |
| Can this service meet an approved traffic objective? | Verified managed k6 |
| Can I obtain a quick low-volume resilience signal? | Chaos Engine |
| How do I preserve a specialist-tool result? | Signed scope export and structured evidence intake |
| How do I turn observations into client action? | Evidence promotion, findings and retest |

## Product positioning

FieldOps is best understood as an assessment operations system, not a single scanner. Its value is the continuity between authorization, technical action, evidence, decision and reporting. It can coordinate supported technologies while retaining the exact operator, target, scope and result context that stand-alone command output often loses.

The software is intentionally local-first. Customer-controlled systems perform the assessment work, customer monitoring supplies target-side truth, and exported records can move into the customer's existing governance and evidence systems.

## Terminology and legal notice

DaemonCore product names such as FieldOps, War Room, Execution Fabric, Capacity Grant, Sealed Evidence and Chaos Engine are defined in the [DaemonCore Terminology Guide](TERMINOLOGY-GUIDE.md). They do not replace the executed Rules of Engagement, Statement of Work, authorization, organizational policy or applicable law.

Third-party product and project names belong to their respective owners. Their appearance describes interoperability or detection and does not imply endorsement, certification or affiliation.
