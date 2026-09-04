# DaemonCore Academy 6.4.0

Released 4 September 2026.

Version 6.4.0 adds Verified Load Authority to the Windows FieldOps Execution Fabric. It is designed for professional, customer-controlled load and resilience testing where both the operator permit and the target system prove the approved capacity.

## What changed

- Every new signed engagement receives a unique capacity-verification challenge.
- A target must publish a matching JSON grant from its own `/.well-known/daemoncore-capacity/` path.
- External verification requires a trusted TLS connection to an exact target and port already named in the signed permit.
- The grant defines maximum requests per second, concurrency, duration, expiration, and the authorization reference.
- k6 and Locust manifests cannot be exported above the verified grant.
- Each accepted grant is hashed and recorded in the tamper-evident FieldOps ledger.
- Workload manifests carry the grant digest, validity window, exact endpoint, operator permit, and emergency-stop requirement.

Existing engagements remain readable and usable, but must be reissued to receive a capacity challenge before using Verified Load Authority.

This release does not add anonymous denial-of-service functionality. The built-in Chaos Engine remains a bounded diagnostic. High-intensity execution stays in customer-controlled k6 or Locust infrastructure under the signed workload manifest.

## Platform status

- Windows: production release 6.4.0, unsigned pending Authenticode certificate.
- Linux: remains the separately published 6.0.0-beta.3 package and does not yet include this release.

## Verification

The complete automated test suite, production web build, Windows installer contract, signed-permit checks, capacity-grant boundary tests, and upgrade persistence checks passed before packaging.
