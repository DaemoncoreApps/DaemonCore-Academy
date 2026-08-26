# DaemonCore Academy

Cyber training usually dies in one of two places: endless video playlists or fake terminals that accept three magic commands.

DaemonCore is an attempt to build the thing I actually wanted: learn the idea, drop into a disposable range, get a root shell, prove the finding, and leave with evidence instead of vibes.

Black UI. Red team energy. Hard walls around the blast radius.

## Phase 3: the range is real now

`The Ghost Port` can run as an actual two-container lab:

- a root operator workstation based on Netshoot;
- a purpose-built synthetic target with live services on 22, 445, and 8088;
- arbitrary shell commands inside the operator container;
- real Nmap and curl output;
- tracked objectives, evidence, hints, scoring, and teardown;
- automatic fallback to the Phase 2 simulator when the range engine is unavailable.

The rest of the app is still here: pathways, tactical lessons, drills, achievements, persistent XP, and the operator record.

## Unrestricted inside. Dead end outside.

The operator shell is deliberately unrestricted. The network is not.

Before the shell opens, DaemonCore verifies:

- the Docker network is marked `internal`;
- the range containers have zero host mounts;
- outbound internet access fails;
- no container is privileged;
- capabilities are dropped unless a target needs one specific capability;
- `no-new-privileges`, PID ceilings, memory limits, and CPU limits are active.

No ports are published to the host. Destroying or closing the range runs `docker compose down --volumes --remove-orphans`.

If a containment check fails, the shell stays locked. That rule is not negotiable.

## What you need

- Windows 10/11
- Node.js 20+
- Docker Desktop using Linux containers
- roughly 2 GB of free memory for the current range

Docker is only required for the live range. The Academy and simulated missions still work without it.

## Run it

```powershell
git clone https://github.com/gtited-jpg/DaemonCore-Academy.git
cd DaemonCore-Academy
npm install
npm run dev
```

Use `npm run dev:web` when you only want the UI. Browser mode intentionally uses the simulator because it has no desktop range bridge.

## Break it before shipping it

```powershell
npm test
```

That runs the UI lint pass, validates the range contract, checks the containment-sensitive Compose settings, and builds the production bundle.

To build the Windows installer:

```powershell
npm run icon
npm run package:win
```

The installer lands in `release/`.

## Where the bodies are buried

```text
electron/                  hardened desktop bridge + range orchestrator
ranges/ghost-port/         Compose file, operator image, target, manifest
src/phase2.jsx             missions, live terminal, lessons, operator record
src/phase2.css             the expensive-looking pixels
scripts/verify-range.mjs   cheap checks for expensive containment mistakes
```

## Current state

Phase 3 proves the architecture with one real range. Broken Trust and Night Shift still use the simulator. The next move is converting those, then adding the scenario SDK, evidence-backed reports, and live event telemetry.

Use this on systems you own or are explicitly authorized to test. The range is built to be a cage, not an excuse.
