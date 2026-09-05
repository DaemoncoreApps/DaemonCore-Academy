# DaemonCore Academy 6.5.0

Released 5 September 2026.

Version 6.5.0 turns Verified Load Authority into a managed FieldOps execution surface. A workload can run only after the active signed permit and the exact target's challenge-bound capacity grant both authorize it.

## What changed

- FieldOps now discovers and launches a local Grafana k6 installation through a fixed, shell-free adapter.
- Operators can select ramp, spike, soak, breakpoint, or recovery profiles.
- Request rate, concurrency, duration, port, TLS mode, hostname, and resolved address are bounded by the verified target grant.
- The target endpoint is pinned to the same address that issued the grant, preventing a later DNS change from silently redirecting the workload.
- Live telemetry reports requests, achieved RPS, p50/p90/p95/p99 latency, error rate, dropped iterations, and maximum virtual users.
- SLO thresholds cover p95 latency and request failure rate.
- A local emergency stop terminates the managed k6 process immediately.
- A challenge-bound target-side stop document can terminate the same run from the customer environment.
- Every workload receives a signed receipt bound to the operator identity, permit, grant, exact plan, and creation time.
- Completed, failed, and aborted runs produce digest-sealed evidence captures and appear in the comparative run ledger.
- Persisted FieldOps data moves to schema 9 while retaining prior engagements and evidence.

## Authorization boundary

This release is for verified infrastructure load and resilience testing. It does not provide anonymous traffic generation, arbitrary scripts, arbitrary command arguments, or an indiscriminate denial-of-service mode. Customer-owned distributed workers remain manifest-driven; coordinated fleet orchestration is a future control-plane release.

## Platform status

- Windows: production release 6.5.0, unsigned pending Authenticode certificate.
- Linux: remains the separately published 6.0.0-beta.3 package and does not yet include this release.

## Verification

The complete automated suite passed, including curriculum, persistence, signed permits, exact-scope enforcement, capacity-grant verification, managed load execution, sealed evidence, installer identity, Linux packaging contracts, and the production web build.
