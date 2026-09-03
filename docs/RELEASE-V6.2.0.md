# DaemonCore Academy 6.2.0

## FieldOps Execution Fabric

Version 6.2 expands FieldOps from a collection of built-in diagnostics into an extensible, evidence-driven operating layer for professional teams.

### Professional execution profiles

- Every new operation permit now binds an execution profile and its capacity.
- Guarded mode retains the established 100-target, 128-port, four-worker envelope.
- Professional mode supports up to 500 exact targets, 1,024 declared TCP ports, 16 concurrent survey workers, a shorter diagnostic cooldown, and a longer deep-inventory window.
- Target normalization, network-boundary resolution, permit integrity, exact target and port enforcement, testing windows, entitlement checks, and signed audit receipts remain mandatory.

### Workstation capability discovery

Execution Fabric checks the local workstation for:

- Nmap
- Docker Engine
- Nuclei
- Grafana k6
- Locust
- Wireshark / TShark
- Hashcat

Nmap and Docker retain native integration. Other discovered tools are connected through signed scope manifests and evidence intake so teams can use their established workflows without handing arbitrary shell text to the desktop application.

### Signed execution manifests

- Operators can export a machine-readable manifest for any supported capability.
- The manifest contains the named engagement, client, authorization reference, exact targets, exact ports, network mode, execution capacity, permit identity, operator fingerprint, and validity window.
- The protected operator key signs the entire manifest. Editing any bound field invalidates verification.
- The customer-controlled runner remains responsible for enforcing the approved test plan and returning its results.

### Third-party evidence intake

- FieldOps accepts JSON and SARIF files up to 2 MB.
- Imported content is parsed as data and never executed.
- Each file receives a SHA-256 source fingerprint and is bound to one target already present in the active signed engagement.
- The complete document is sealed as a FieldOps capture and the import is added to the signed activity ledger.
- Imported captures can enter the existing evidence, finding, retest, case-file, and reporting workflow.

### Deliberate boundaries

This release does not add anonymous public-network load generation, online password guessing, shell interpolation, or arbitrary command execution outside the sealed Academy ranges. High-intensity performance work belongs in customer-controlled runners operating under their own approved test plan. Offline credential-audit evidence can be imported through the Hashcat evidence bridge.

### Packaging

The Windows installer remains temporarily unsigned and may show **Unknown Publisher**. Verify the published SHA-256 checksum and evaluate inside a disposable Windows 10/11 virtual machine until the certificate-backed release is available. Linux remains on its separately labeled beta channel.
