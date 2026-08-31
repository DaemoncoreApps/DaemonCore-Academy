# DaemonCore Academy 6.0.0-beta.2 // The operator should never feel lost

This beta answers direct community feedback: make the path obvious without turning the work into hand-holding. Mission OS remains the route planner. Academy teaches the method. Sealed ranges are where commands become live. The app now tells the operator which state they are in and what to do next.

## Requested on Reddit

- A first-run walkthrough explains the Learn -> Practice -> Launch -> Prove loop.
- A persistent guidance dock identifies the next useful action from the operator's local record.
- “How this works” stays available after onboarding instead of disappearing forever.
- Lesson pages identify themselves as instruction and display **No live target** before any worked example.
- Command blocks are labeled **Reference command // not run here** and no longer imply that copying equals execution.
- Lesson completion can hand the operator directly to Lab Range, Web Forge, or Enterprise Forge.

## Mission OS is included

Mission OS is still named **Mission OS** in the left navigation. Its 12-scenario diagnostic, six professional routes, completion-derived recommendations, seeded flagship cases, and four-dimensional after-action reviews remain part of the free Academy experience.

The first-run guide's **Build my route** action opens Mission OS directly.

## Live ranges are unmistakable

- First-time operators begin their first mission in Guided mode.
- The mission briefing explains what Docker will open before launch.
- Live execution begins only after the operator intentionally launches the sealed range.
- The app must report **Containment verified** and display a `root@dc-` prompt.
- Commands at that prompt run inside the disposable training range, not inside the lesson and not in the Windows terminal.

## Windows and Linux stay matched

The guided workflow is shared application code and ships in the Windows installer, Linux AppImage, and Debian package built from this tag. The footer reports `6.0.0-beta.2` and the current platform.

## Upgrade notes

- Windows setup keeps the stable application identity and asks before replacing the previous installation.
- Debian upgrades in place through the package manager.
- AppImage users replace the old AppImage file manually.
- Existing operator progress remains in the per-user data directory, but export it from Settings before a beta upgrade.
- Docker is required only for live disposable ranges.

## Beta notice

This remains an opt-in prerelease. The locally built Windows beta is not Authenticode-signed and may display **Unknown Publisher**. Verify every download against the checksum published beside the release asset. Do not deploy this beta through a managed production fleet as a trusted signed package.
