# DaemonCore Academy

I got tired of cyber courses that are either forty hours of passive video or a fake terminal waiting for three magic commands.

DaemonCore is the course I wanted instead: learn the mental model, validate it, drop into a disposable range, collect evidence, and leave with a record you actually earned.

Black glass. Red signal. No seeded XP. No imaginary leaderboard.

## What ships in 1.1

- **Network Reconnaissance** — eight written lessons covering scope, hypothesis-driven recon, asset inventory, packet evidence, port state, service fingerprinting, evidence quality, and finding construction.
- **Eight validation checks** — progress is recorded only after the lesson check is answered correctly.
- **Four scored drill sets** — protocol recognition, request anatomy, evidence triage, and finding quality.
- **Three field missions** — one live Docker range and two clearly labeled guided simulations.
- **Four field notes** — short references for recon, HTTP evidence, finding writing, and range rules.
- **A real operator record** — XP, streaks, weekly minutes, attempts, scores, achievements, and activity are calculated from completed work.
- **Local-first data** — atomic writes, backup recovery, JSON export, reset controls, and no account dependency.
- **Lemon Squeezy licensing** — secure activation, instance validation, device deactivation, tier entitlements, and a fourteen-day offline grace window.
- **FieldOps Pro** — authorization-bound diagnostics against exact public targets using DNS resolution, TCP reachability, HTTP HEAD, and TLS inspection.
- **Engagement Vault** — append-only scope records, dated testing windows, target and port allowlists, evidence export, and a SHA-256 chained activity ledger that exposes tampering.

There are no locked “coming soon” course cards pretending to be content. FieldOps is the one intentional commercial gate.

## FieldOps is powerful on purpose

A paid license unlocks the tool. It does not authorize a target.

Before an external diagnostic can run, the operator must create an engagement with a client, authorization reference, exact targets, exact TCP ports, a testing window, and an explicit authorization attestation. FieldOps resolves and pins the destination, blocks private, loopback, link-local, reserved, and mixed public/private results, refuses redirects, rate-limits execution, and writes every completed or blocked action to the evidence ledger.

There is no arbitrary public-network shell. Unrestricted command execution stays inside the sealed Docker range.

## Connect Lemon Squeezy

Edit `electron/license-policy.json` before building the commercial installer:

- set the public Lemon Squeezy `storeId`;
- add the product and/or variant IDs for Academy and FieldOps Pro;
- add the hosted checkout URL;
- set `requireAcademyLicense` to `true` when the Academy itself should be gated;
- choose the offline grace length.

These IDs are entitlement policy, not secrets. Never put a Lemon Squeezy management API key in the desktop app. License keys are encrypted through Electron secure storage and the renderer only receives masked metadata.

## The Ghost Port is a real range

When Docker Desktop is available, The Ghost Port provisions a root operator container and a purpose-built target. Nmap and curl return live results, arbitrary shell commands work inside the operator container, and the target is destroyed when the run ends.

The shell is unrestricted. The boundary is not.

Before access is released, DaemonCore verifies an internal-only Docker network, zero host mounts, blocked egress, no privileged containers, dropped capabilities, `no-new-privileges`, and resource ceilings. No target ports are published to the host. Failed containment means no shell.

## Run it from source

Requirements:

- Windows 10 or 11
- Node.js 20+
- Docker Desktop with Linux containers for the live range

```powershell
git clone https://github.com/gtited-jpg/DaemonCore-Academy.git
cd DaemonCore-Academy
npm install
npm run dev
```

`npm run dev:web` runs the browser preview. The preview uses local storage and the simulation path because browsers do not receive the Electron range bridge.

## Break it before shipping it

```powershell
npm test
```

That command lints the UI, exercises operator-record persistence and recovery, verifies licensing and offline grace, attacks the FieldOps scope boundary, validates the range contract and containment-sensitive Compose settings, then builds the production bundle.

Build the Windows installer with:

```powershell
npm run icon
npm run package:win
```

The installer lands in `release/`.

## Project map

```text
electron/data-store.cjs       atomic local operator record
electron/license-manager.cjs  Lemon Squeezy + protected key storage
electron/engagement-store.cjs scope enforcement + external diagnostics
electron/range-orchestrator.cjs
ranges/ghost-port/            live target, operator image, and manifest
src/content.js                versioned course, drills, and field notes
src/phase2.jsx                range console, lessons, and operator record UI
scripts/verify-data-store.mjs persistence/recovery contract
scripts/verify-phase4.mjs     licensing and scope-boundary contract
scripts/verify-range.mjs      range and containment contract
```

This is training software, not authorization. Use it only on systems you own or have explicit permission to test.
