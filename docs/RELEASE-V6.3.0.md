# DaemonCore Academy 6.3.0

## Managed Native Runner

Version 6.3 turns the first Execution Fabric capability into a real managed job. Nmap can now run from the FieldOps War Room instead of requiring an exported manifest and a separate terminal.

### What works now

- Select an exact target from the active signed engagement and execute the complete declared TCP port set.
- Resolve the target through the engagement’s external or internal network boundary, pin the resulting address, and pass only that address to Nmap.
- Launch local Nmap directly or use the existing pinned Docker image fallback when Docker is available.
- Watch process output and lifecycle state from the War Room while the job continues in the Electron main process.
- Stop an active job. Partial output is retained for operator context but is not promoted to completed evidence.
- Parse successful Nmap XML into structured host, service, product, version, confidence, CPE, state, reason, and timing evidence.
- Seal the result as a digest-protected capture and record the job and capture in the tamper-evident activity ledger and exported case file.
- Recover cleanly after application restart by marking an unfinished native process as interrupted rather than claiming it completed.

### Execution boundary

The runner does not accept command text. It builds a fixed argument array and launches the executable without a command shell. Before launch, FieldOps verifies the license, signed operation permit, policy level, testing window, exact target membership, approved network mode, declared ports, and a run-specific operator confirmation.

Nuclei, k6, Locust, TShark, and Hashcat remain clearly labeled evidence bridges in 6.3. They support signed scope export and evidence intake, but the desktop does not claim to execute them yet.

### Packaging

The Windows installer remains temporarily unsigned and may show **Unknown Publisher**. Verify the release SHA-256 checksum and evaluate inside a disposable Windows 10/11 virtual machine until the certificate-backed build is available.
