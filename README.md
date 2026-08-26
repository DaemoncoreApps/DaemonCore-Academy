# DaemonCore Academy

A desktop-first cybersecurity training experience for controlled, authorized practice. Phase 2 combines structured pathways, playable synthetic lab missions, tactical lessons, timed drills, field intelligence, persistent operator progression, achievements, and explicit rules-of-engagement boundaries.

## Phase 2

- Playable range console with three scenario-specific simulations
- Evidence locker, tracked objectives, time, guidance penalties, and mission scoring
- Interactive tactical lesson player with section navigation and knowledge validation
- Persistent mission, lesson, XP, level, and achievement records
- Dedicated operator profile with readiness metrics and certification progress
- Replay-aware rewards and five unlockable Phase 2 decorations

## Run it

```powershell
npm install
npm run dev
```

For the browser-only development view:

```powershell
npm run dev:web
```

## Build it

```powershell
npm run check
npm run build
npm run icon
npm run package:win
```

The Windows installer is written to `release/`.

## Product boundary

DaemonCore Academy is designed for defensive education and explicitly authorized testing. Missions use synthetic evidence and intentionally vulnerable, isolated training targets. The Academy does not direct learners toward systems outside the declared lab boundary.
