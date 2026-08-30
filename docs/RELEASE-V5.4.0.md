# DaemonCore Academy 5.4.0

The live ranges no longer reward one magic command.

## Adaptive Range Engine

- Choose Guided, Assisted, Blind, or Professional mode before launch.
- Use alternate commands and investigative paths; the backend evaluates resulting evidence against the current outcome.
- Preserve objectives in order, from baseline and positive control through boundary proof and submission.
- Receive a digest for every live execution and a separate evidence record for each accepted objective.
- Spend limited progressive hints in eligible modes, or run Professional with no hints and a 1.5× score multiplier.
- Carry a unique run seed, evidence-chain digest, mode, timing, and score into a tamper-evident completion receipt.
- Retain adaptive run metadata in the local operator record without requiring an account.

## Window controls

The close control across in-app windows now has a 48-pixel target, visible hover and pressed states, a keyboard focus ring, and Escape-key support. The icon stays compact; the part that actually receives the click is considerably larger.

## Range boundary

Adaptive missions still run only inside DaemonCore’s disposable Docker networks: internal-only, no published ports, no host mounts, verified egress denial, and automatic teardown.
