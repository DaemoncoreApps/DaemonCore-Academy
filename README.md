# DaemonCore Academy

I got tired of cyber courses that are either forty hours of passive video or a fake terminal waiting for three magic commands.

DaemonCore is the course I wanted instead: learn the mental model, validate it, drop into a disposable range, collect evidence, and leave with a record you actually earned.

Black glass. Red signal. No seeded XP. No imaginary leaderboard.

## What ships in 1.0

- **Network Reconnaissance** — eight written lessons covering scope, hypothesis-driven recon, asset inventory, packet evidence, port state, service fingerprinting, evidence quality, and finding construction.
- **Eight validation checks** — progress is recorded only after the lesson check is answered correctly.
- **Four scored drill sets** — protocol recognition, request anatomy, evidence triage, and finding quality.
- **Three field missions** — one live Docker range and two clearly labeled guided simulations.
- **Four field notes** — short references for recon, HTTP evidence, finding writing, and range rules.
- **A real operator record** — XP, streaks, weekly minutes, attempts, scores, achievements, and activity are calculated from completed work.
- **Local-first data** — atomic writes, backup recovery, JSON export, reset controls, and no account dependency.

There are no locked “coming soon” cards pretending to be content. If the app shows it, it opens.

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

That command lints the UI, exercises operator-record persistence and recovery, validates the range contract and containment-sensitive Compose settings, then builds the production bundle.

Build the Windows installer with:

```powershell
npm run icon
npm run package:win
```

The installer lands in `release/`.

## Project map

```text
electron/data-store.cjs       atomic local operator record
electron/range-orchestrator.cjs
ranges/ghost-port/            live target, operator image, and manifest
src/content.js                versioned course, drills, and field notes
src/phase2.jsx                range console, lessons, and operator record UI
scripts/verify-data-store.mjs persistence/recovery contract
scripts/verify-range.mjs      range and containment contract
```

This is training software, not authorization. Use it only on systems you own or have explicit permission to test.
