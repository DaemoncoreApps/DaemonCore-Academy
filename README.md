# DaemonCore Academy

A desktop-first cybersecurity training experience for controlled, authorized practice. The MVP combines structured pathways, synthetic lab missions, timed drills, field intelligence, persistent operator progress, and explicit rules-of-engagement boundaries.

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
