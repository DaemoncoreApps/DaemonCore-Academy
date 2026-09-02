# DaemonCore Academy 6.1.0

## Certification built on proof

Version 6.1 introduces the DaemonCore Certified Cyber Operator candidate workflow. It turns locally earned Academy evidence into a cryptographically signed review dossier without letting the application award its own certificate.

### What changed

- A new Certification Center shows exactly which evidence requirements are complete and what the operator should do next.
- DCCO candidacy requires 20 practical lesson passes at 80% or better, five sealed independent missions, eight Web Forge conditions, eight Enterprise Forge cases, four drill passes, and two principal capstones at 80% or better.
- Candidate export requires an OS-protected Ed25519 operator identity.
- Eligible operators can export a canonical candidate dossier containing evidence references, policy version, application version, identity fingerprint, SHA-256 digest, and operator signature.
- Modified dossiers fail signature or digest verification.
- The desktop cannot issue a credential. Independent review and a separate server-side issuer are required.
- A Supabase migration defines a private submission queue, a restricted credential registry, row-level security, and a minimal public verification function.
- The candidate handbook and credential operations runbook document assessment requirements, review, appeals, revocation, two-year validity, privacy, and issuer-key controls.

### Existing access and data

- Academy training remains available without purchase.
- FieldOps remains the existing paid application gate; certification candidacy does not create a second paywall.
- Operator progress, records, FieldOps cases, and license data remain in the established per-user application-data location and survive upgrades.
- Linux remains on its separately labeled beta channel. This package is the Windows 6.1.0 release candidate.

### Deployment boundary

The included registry migration is infrastructure source, not proof of a live certification service. Do not advertise or sell issued DCCO credentials until the private review workflow, server-side issuer, public verification page, identity-review procedure, privacy terms, appeals path, and support process are deployed and tested.

### Unsigned Windows build

The 6.1.0 Windows installer is not yet Authenticode-signed. Windows may show **Unknown Publisher**. Until certificate-backed signing is in place, download only from the official GitHub release, verify the published SHA-256 checksum, and evaluate inside a disposable Windows 10/11 virtual machine.
