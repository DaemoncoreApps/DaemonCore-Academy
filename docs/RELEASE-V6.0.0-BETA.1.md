# DaemonCore Academy 6.0.0-beta.1 // Mission OS

This beta changes the Academy from a catalog into an operating curriculum. Mission OS establishes an honest capability baseline, gives each operator a professional route, and recommends the next piece of recorded work.

## Guided Academy workflow // requested on Reddit

- First-run walkthrough for the Learn → Practice → Launch → Prove operator loop
- Persistent next-action dock with an always-available “How this works” control
- Explicit **Instruction**, **No live target**, and **Reference command // not run here** labels inside lessons
- Live-terminal recognition based on an intentional range launch, **Containment verified**, and the `root@dc-` prompt
- Guided mode selected by default for an operator's first Docker mission
- Direct handoff from lesson completion to the matching Lab Range, Web Forge, or Enterprise Forge surface
- Automated usability contract covering the guide, command boundary, persistence, and range handoff

## Mission OS

- A 12-scenario entry diagnostic across scope, network analysis, web and API, identity, cloud and supply chain, and evidence and detection
- Six selectable routes: Penetration Tester, Web & API Specialist, Identity Security, Cloud Security, Detection & Response, and Security Engineer
- A durable local route record with domain scores, selection time, and completion-derived progress
- Next actions calculated from completed Academy lessons, Lab Range missions, Web Forge work, Enterprise Forge cases, and Mastery capstones
- No invented percentile, fake readiness rank, or employment guarantee

## Range debriefs

- Seeded professional case emphases for Ghost Port, Broken Trust, and Night Shift
- After-action scoring for evidence coverage, operator independence, method discipline, and time discipline
- Concrete remediation and next-action guidance after completion
- Case variation and debrief data included in the sealed mission result and retained operator attempt

## Desktop release

- Exact version and platform identity displayed inside the app
- Existing operator records migrate forward to schema version 6 without losing progress
- Windows keeps the stable application identity and upgrade-aware installer flow
- Linux ships as both an x86_64 AppImage and Debian package
- FieldOps licensing and the free Academy boundary are unchanged

## Updated operator guides

- FieldOps Operator Manual `v6.0.0-beta.1` in release-ready PDF and editable Word formats
- Academy Mission OS Operator Guide `v6.0.0-beta.1` covering the entry diagnostic, six routes, curriculum breadth, Docker missions, Web Forge, Enterprise Forge, capstones, after-action review, backups, and troubleshooting
- Windows and Linux install, upgrade, checksum, Docker, and protected-storage runbooks
- FieldOps disconnected-workstation procedure, signed authorization workflow, campaigns, sealed evidence, findings, retests, reports, and bounded Chaos Engine reference

## Beta notice

This is an opt-in prerelease for cross-platform field validation. Back up the local operator record from Settings before upgrading a production workstation. Docker remains required for live disposable ranges; simulation fallback remains available for curriculum review.

The Windows beta installer is not Authenticode-signed because a commercial code-signing certificate is not yet configured in the protected release environment. Windows may display an Unknown Publisher warning. Verify the installer against `SHA256SUMS-windows.txt`; do not deploy this beta through a managed production fleet. The Linux packages and their checksums were built and inspected by the tagged GitHub release workflow.
