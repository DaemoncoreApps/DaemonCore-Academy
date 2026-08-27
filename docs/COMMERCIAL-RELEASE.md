# Commercial release gate

A build is not customer-ready merely because it compiles. Every commercial release must satisfy all gates below.

## Source and entitlement

- Repository visibility is private.
- `LICENSE` and `EULA.md` are present and current.
- No secret, customer record, private key, license key, or signing certificate is tracked or present in Git history.
- Premium entitlement is enforced in both the renderer and the Electron main process.
- A failed or expired entitlement cannot start a FieldOps operation.

## Quality and containment

- `npm test` passes from a clean checkout.
- Docker-backed sealed ranges pass runtime verification on a Windows host with Docker Desktop.
- Visual QA covers onboarding, Academy, Mastery, capstones, Lab Range, FieldOps lock state, Settings, and 125% default scaling.
- Installer and uninstall behavior are tested on a clean Windows account.

## Signing

- A publicly trusted organization-validation or extended-validation Windows code-signing certificate is configured through repository secrets.
- The certificate and password never enter the repository, build log, release notes, or artifacts.
- `Get-AuthenticodeSignature` reports `Valid` for the final installer.
- The signed installer’s SHA-256 checksum is recorded in the release notes after signing.

## Distribution

- Git tags are immutable and identify the exact tested source commit.
- Release assets are uploaded only to an approved private release or customer portal.
- The download channel requires customer authorization before commercial launch.
- Rollback and license-service outage procedures are documented before launch.

## External prerequisites

DaemonCore Academy cannot manufacture these prerequisites inside the codebase:

1. Purchase and identity validation for a trusted Windows code-signing certificate.
2. A controlled backend account and domain for server-side entitlement or premium-content delivery.
3. Legal review of the EULA, privacy disclosures, refund policy, and jurisdiction-specific consumer terms.
