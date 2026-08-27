# Security policy

DaemonCore Academy treats containment, entitlement integrity, and customer evidence as security boundaries.

## Reporting a vulnerability

Do not open a public issue containing exploit details, license keys, customer information, or range-escape evidence. Report vulnerabilities privately through the repository’s GitHub Security Advisory workflow or the customer-support channel supplied with the purchase receipt.

Include the affected version, Windows version, reproduction steps, expected boundary, observed behavior, and whether sensitive data or an external target was involved. Redact credentials and customer evidence.

## Supported version

Only the latest published commercial release receives security fixes. Customers should verify installer checksums and install updates from an official DaemonCore Academy distribution channel.

## Security boundaries

- FieldOps requires both a valid entitlement and an active, exact authorization boundary.
- Arbitrary command execution belongs only inside sealed disposable ranges.
- Production releases must use trusted Authenticode signing before customer distribution.
- Secrets, signing certificates, license keys, and customer evidence must never enter this repository.
