# DaemonCore Academy 6.3.1

## Release identity, range reliability, and the complete FieldOps 6.3 line

Version 6.3.1 is the corrective production release for the Windows 6.3 line. It gives the shipped product one version identity, carries the complete managed FieldOps capability set introduced through 6.3, and fixes Docker launch problems in Web Forge and Enterprise Forge.

The earlier public release was tagged 6.0.4 even though its package and application source identified themselves as 6.3.0. Version 6.3.1 supersedes that mislabeled release. The 6.0.4 release remains part of the project history; 6.3.1 is the first release that should present the current source, installer, documentation, tag, and GitHub release under one matching version.

## Docker range launch fixes

- Web Forge and Enterprise Forge fixture trees retain readable files and traversable directories for their non-root operator accounts.
- Enterprise Forge uses Docker-compatible temporary mount declarations so the range can start correctly under Docker Desktop.
- Web Forge and Enterprise Forge are included in the adaptive range contract used to track ordered live objectives.
- Range integrity metadata is regenerated for the corrected pack contents. A modified or unexpected pack still fails closed.

These changes correct range startup and evidence access. They do not publish target ports to the host, add host mounts, grant container privileges, or open range internet egress.

## FieldOps Professional capacity

Professional capacity is an explicit field in a signed operation permit. It is not a global power switch and it does not relax scope enforcement.

- Guarded permits support up to 100 exact targets and 128 declared TCP ports, with 1–8 survey workers.
- Professional permits use the exact signed target and TCP-port lists as their capacity rather than imposing a second arbitrary cardinality ceiling. The operator selects 1–64 survey workers and a 1–60 minute native-tool window.
- The selected capacity, exact targets, exact ports, network boundary, testing window, operator identity, approving authority, and authorization reference are bound into the permit signature.
- Editing a bound permit field invalidates verification and prevents execution.

A FieldOps license unlocks the workspace. It does not authorize a client, target, port, or testing window.

## Managed Nmap execution

Nmap is the managed native runner in this release.

- The operator chooses one exact target from the active signed engagement; FieldOps resolves and pins its permitted address.
- Nmap receives the pinned address and the permit's declared TCP port set through a fixed argument array. No command shell or free-form command text is used.
- FieldOps can use a local Nmap installation or the existing pinned Docker image fallback.
- Process output and job state stream into the War Room while the job remains owned by the Electron main process.
- The operator can stop a live job. Partial output remains available for context but is not promoted to completed evidence.
- Successful Nmap XML is normalized into host, service, product, version, confidence, CPE, state, reason, and timing evidence.
- Completed evidence receives a SHA-256 digest and is recorded in the engagement capture vault and tamper-evident audit ledger.
- An unfinished job found after a restart is marked interrupted; the application does not claim it completed.

Nuclei, Grafana k6, Locust, TShark, and Hashcat remain signed-scope and evidence-intake bridges. Version 6.3.1 does not claim to execute them as managed native jobs.

## Signed scope and operator controls

Before managed execution, FieldOps verifies the paid entitlement, protected operator identity, signed permit integrity, policy level, permit-defined capacity, validity window, selected network boundary, exact target membership, and declared port set. A run-specific operator confirmation is also required.

Execution and recovery controls remain attributable:

- Manifest exports carry the exact signed scope for customer-controlled runners.
- JSON and SARIF imports are size-limited, parsed as data, fingerprinted, bound to an authorized target, and sealed into the evidence chain.
- Active native jobs block engagement closure until they are stopped or settled.
- Stop requests, completion, failure, interruption, evidence creation, and manifest export are recorded in the engagement ledger.
- Case-file and report exports retain the named operator, permit, authorization reference, evidence digests, and signature-integrity state.

## Deliberate boundaries

This release does not add DDoS automation, online password guessing, credential stuffing, anonymous public-target execution, arbitrary shell commands, or an unrestricted command runner. Professional capacity expands a permit-defined assessment envelope for authorized work; it does not remove the permit.

High-intensity saturation training remains inside the sealed Academy power domain against disposable targets with no host or internet route. Customer production performance testing remains the responsibility of customer-controlled tooling operating under its approved test plan, with results returned through the evidence bridge.

## Release acceptance

The release is not complete merely because the source version changed. Before 6.3.1 is marked latest, the release operator must:

1. Run the complete source, FieldOps, native-runner, range-integrity, usability, persistence, certification, and production build checks.
2. Build the Windows installer from the 6.3.1 source and confirm that its embedded file version is 6.3.1.
3. Install over an existing copy and confirm that the version-independent operator record, Academy progress, FieldOps case files, settings, and license data remain intact.
4. Smoke-test Web Forge and Enterprise Forge startup on Docker Desktop and confirm that their first live objectives can read the required fixtures.
5. Publish the installer under the stable `DaemonCore-Academy-Setup.exe` asset name with a matching `SHA256SUMS-windows.txt` file.
6. Tag and publish the same commit as `v6.3.1`, then verify that the permanent latest-download URL resolves to that asset.

## Temporary unsigned Windows build

The Windows installer is not yet Authenticode-signed and may show **Unknown Publisher**. Until certificate-backed signing is available, download it only from the official GitHub release, verify the complete SHA-256 value, and install or evaluate it inside a disposable Windows 10/11 virtual machine. Do not deploy this unsigned package as a trusted managed-fleet application.
