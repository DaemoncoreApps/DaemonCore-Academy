# DaemonCore Academy 6.0.0-beta.3 // Remember this operator

This hotfix restores the contract that matters before every lesson, mission, and FieldOps operation: close the app, open it again, and find the same operator record waiting.

## Persistence fix

- The sandboxed desktop preload no longer imports `package.json`, which could prevent the entire native storage bridge from loading in a packaged build.
- App version identity now comes through a sandbox-safe desktop channel.
- Operator records, progress, Mission OS state, settings, FieldOps data, and licensing remain outside the installation directory.
- Every release now resolves the same explicit, version-independent DaemonCore data directory.
- The Windows installer is explicitly configured to retain application data while replacing program files.
- Durable state continues to use atomic writes and a separate backup file.

## Recovery for affected users

The app keeps a mirrored browser recovery record alongside the authoritative desktop record. If an affected installation created progress through the fallback and no durable profile exists, beta.3 migrates that record into the desktop store automatically.

If a durable record already exists, it remains authoritative and is loaded without asking the operator to register again.

## Tested like a restart

The release contract now creates an operator in one operating-system process, exits, launches an independent second process, and verifies the same handle and creation timestamp. It also proves browser-fallback migration, stable storage identity, installer retention, and sandbox-safe preload initialization.

## Included from beta.2

- Mission OS and all six professional routes
- Community-requested Learn -> Practice -> Launch -> Prove walkthrough
- Persistent next-action guidance
- Explicit lesson versus live-range command boundaries
- Guided first mission and direct lesson-to-range handoff
- Matching Windows, AppImage, and Debian interfaces

## Upgrade notes

- Install beta.3 over the prior Windows installation; setup asks before replacing program files.
- Debian users install the newer package normally.
- AppImage users replace the old AppImage file.
- Do not delete the DaemonCore application-data directory during the upgrade.
- Export the operator record from Settings before any beta upgrade when possible.

## Beta notice

This remains an opt-in prerelease. The locally built Windows beta is not Authenticode-signed and may display **Unknown Publisher**. Verify every download against the checksum published beside the release asset.
