# DaemonCore Academy

> Proprietary commercial software. Source access does not grant permission to copy, redistribute, modify, resell, or bypass licensing. See [LICENSE](LICENSE) and [EULA.md](EULA.md).

I got tired of cyber courses that are either forty hours of passive video or a fake terminal waiting for three magic commands.

DaemonCore is the course I wanted instead: learn the mental model, validate it, drop into a disposable range, collect evidence, and leave with a record you actually earned.

Black glass. Red signal. No seeded XP. No imaginary leaderboard.

**[Download the latest Windows installer](https://github.com/DaemoncoreApps/DaemonCore-Academy/releases/latest/download/DaemonCore-Academy-Setup.exe)** · **[Linux beta](https://github.com/DaemoncoreApps/DaemonCore-Academy/releases/tag/v5.5.0-beta.2)** · [FieldOps Operator Manual](output/pdf/DaemonCore-FieldOps-Operator-Manual-v5.4.0.pdf) · [Release notes](https://github.com/DaemoncoreApps/DaemonCore-Academy/releases)

## Inside DaemonCore

![DaemonCore command center](docs/screenshots/command-center.png)

| Tactical lesson workspace | Evidence-derived Mastery grid |
| --- | --- |
| ![Tactical lesson workspace](docs/screenshots/lesson-workshop.png) | ![Evidence-derived Mastery grid](docs/screenshots/mastery-grid.png) |

| Principal capstone decision room | Disposable sealed range |
| --- | --- |
| ![Principal capstone decision room](docs/screenshots/capstone-decision-room.png) | ![Disposable sealed range](docs/screenshots/sealed-range.png) |

![FieldOps Pro license and authorization gate](docs/screenshots/fieldops-pro-gate.png)

## What ships

### Linux beta // 5.5

- **First-class desktop packages** — the same Academy, sealed ranges, FieldOps workspace, licensing, local records, and exports ship as an x64 AppImage and Debian package.
- **Native Linux toolchain** — DaemonCore uses the host Docker Engine and Nmap directly, retains the pinned Docker Nmap fallback, and preserves the same exact-target and declared-port boundary.
- **Keyring-backed secrets** — Lemon Squeezy keys and FieldOps signing keys use GNOME Keyring or KWallet. DaemonCore refuses Electron’s unencrypted `basic_text` fallback instead of silently writing commercial credentials in plaintext.
- **Portable release verification** — Ubuntu CI lints and exercises the full product, extracts and inspects the AppImage, validates the Debian package, and publishes SHA-256 checksums with the prerelease.
- **Shared product contract** — version metadata now comes from the package manifest, Linux icons are generated from the same source mark, and platform copy no longer treats Docker Desktop or Windows as universal requirements.

### Adaptive Range Engine // 5.4

- **Four operator modes** — Guided exposes the full runbook, Assisted provides a tool map and progressive hints, Blind removes prescribed commands, and Professional removes hints entirely while applying the highest score multiplier.
- **Outcomes instead of magic commands** — mission completion no longer depends on typing one exact command string. The desktop backend records each live execution and accepts alternate investigative paths when the resulting signal proves the current objective.
- **Ordered evidence gates** — discovery, positive control, boundary proof, and finding submission must be established in sequence. A successful process exit is not enough by itself.
- **Backend-owned run ledger** — each execution receives a SHA-256 digest. Accepted objective evidence retains that digest, its acceptance time, and the exact outcome it proved.
- **Progressive guidance** — hints are tied to the current unresolved objective, limited by mode, and carry an explicit score penalty. Professional runs cannot request hints.
- **Seeded run identity** — every live launch receives a unique run seed alongside its content-addressed range pack and containment receipt.
- **Sealed completion receipt** — mode, seed, elapsed time, guidance use, score, and the complete evidence chain are bound into a tamper-evident result retained with the operator attempt.
- **Reliable in-app windows** — close controls now use a 48-pixel hit target, stronger pointer feedback, keyboard focus treatment, and global Escape-to-close behavior.

### FieldOps Workbench // next

- **DaemonCore Trust Authority** — a protected Ed25519 operator identity signs every new operation permit and audit receipt with the operator’s name, organization, role, device-key fingerprint, and timestamp.
- **Signed operation permits** — new engagements cryptographically bind the operator, approving authority, client, ROE reference, Observe/Validate/Stress policy, exact targets, ports, network boundary, and validity window. Editing any bound field invalidates execution.
- **Graduated authorization** — Observe permits posture and identity checks, Validate adds inventory and campaigns, and Stress adds the existing bounded resilience engine. Greater capability requires an explicitly stronger signed policy.
- **Attribution-ready exports** — case files and professional reports include the signed permit, named operator, approving authority, policy level, fingerprint, and signature-integrity verdict.
- **Campaign Engine** — run durable multi-target assessment campaigns across the exact systems in a signed engagement. Complete Assessment, Service Inventory, and Change Verification profiles coordinate the existing FieldOps modules in the background.
- **Campaign control** — live progress, per-target task state, pause, resume, safe cancellation, and desktop-restart recovery turn isolated diagnostics into a repeatable engagement workflow.
- **Traceable campaign evidence** — every successful campaign task points to its own digest-sealed capture. Campaign status and completion totals travel with the JSON case file and the printable client report.
- **Deep Service Inventory** — sends the pinned authorized address and declared TCP allowlist through a shell-free Nmap bridge for full service/version, confidence, product, CPE, state, and reason evidence. It prefers a local Nmap install, can use Docker with a pinned image, and falls back to the built-in passive profiler.
- **Surface Intelligence** — one authorized target baseline combines pinned boundary-aware resolution, bounded DNS records, the declared port allowlist, and posture evidence from up to eight observed web services.
- **Change Intelligence** — repeat baselines compare resolved addresses, exposed ports, DNS control-plane records, HTTP posture, response behavior, server disclosure, and TLS certificate identity against the prior sealed capture.
- **Service Profile** — one authorized port can be resolved into passive server-first banner evidence, protocol identity, HTTP posture, and TLS certificate context without sending credentials or protocol commands.
- **Bounded Web Map** — a fixed eight-path, HEAD-only control-plane survey records security metadata, API descriptions, health endpoints, and disclosure signals without crawling or downloading response bodies.
- **Professional network boundaries** — engagements can explicitly authorize public external targets or exact RFC1918/IPv6 ULA internal systems, with up to 100 named hosts and 128 declared TCP ports.
- **Deeper protocol evidence** — DNS profiles cover address, mail, nameserver, TXT, CAA, and authority records. HTTP posture evaluates response controls, cookie flags, and implementation disclosure. TLS captures protocol, cipher, certificate identity, lifetime, and validation state.
- **Asset intelligence** — every successful scoped diagnostic becomes a durable target observation instead of disappearing when the console changes screens.
- **Sealed evidence vault** — diagnostic captures retain their raw result, target, timing, resolved addresses, and an independent SHA-256 digest.
- **Findings register** — operators can promote evidence into a finding with severity, bounded impact, remediation, and an explicit disposition.
- **Evidence-backed retesting** — closure requires a new capture from the same engagement. The register preserves whether the condition was verified fixed or remained present.
- **Professional exports** — the machine-readable case file now includes campaigns, captures, findings, retests, Chaos runs, and the complete audit chain. A separate printable HTML report is ready for client delivery.
- **One engagement workspace** — diagnostics, target history, evidence, findings, reports, and Chaos Engine runs now live behind the same signed authorization boundary.

### Trust Chain // 5.1

- **Full-tree range fingerprints** — verification now covers every Dockerfile, entrypoint, tool, fixture, case file, scenario contract, and Compose definition. Added files and removed files change the root digest too.
- **Per-file inventory** — the pack index records the relative path, byte count, and SHA-256 of every shipped file under a deterministic `sha256-tree-v1` root.
- **Runtime preflight** — Range Fabric checks Docker Engine, Docker Compose, all nine pack roots, and the enforced containment policy through one desktop diagnostic surface.
- **Digest-sealed launch receipts** — every successful live launch receives a unique receipt binding the runtime version, complete pack digest, containers, network, containment result, and start time.
- **Evidence export** — operators can export the integrity-checked JSON launch receipt before destroying a completed range. The receipt digest is also retained with the mission attempt.
- **Bypass regression tests** — the release contract proves rejection of modified Dockerfiles, injected files, and edited receipts.

### Range Fabric // 5.0

- **Identity Citadel** — the first protocol-native enterprise range provisions a disposable Samba Active Directory realm with live DNS, Kerberos, LDAP, and SMB instead of replaying canned results.
- **A real evidence chain** — operators discover the realm, acquire a Kerberos ticket, query the designated directory edge, and submit a tightly bounded identity finding from the sealed console.
- **Content-addressed packs** — all nine bundled environments have SHA-256 identities. The desktop verifies each pack and refuses a launch if its scenario contract or Compose definition has changed.
- **Pack registry UI** — Lab Range exposes pack status, fingerprints, protocol coverage, and the exact containment sequence enforced before a shell opens.
- **Seven field missions across six tracks** — Network, Web + API, Detection, Cloud, Supply Chain, and Enterprise Identity now progress from live evidence.
- **Regression-proven tamper rejection** — the Phase 15 contract copies a pack, mutates it, and confirms that Range Fabric fails closed.

Remote pack delivery is the next infrastructure layer. It will require a distribution endpoint and an offline-held signing key; neither is simulated or embedded in this repository.

### Enterprise Forge // 4.0

- **Six new specialist pathways** — Windows and Active Directory, Cloud Security Engineering, Detection and Incident Analysis, Linux Privilege and Host Security, Containers and Kubernetes, and Software Supply Chain Defense.
- **Seventy-two complete enterprise lessons** — twelve evidence-led modules per pathway with four instructional stages, four workshops, a three-decision review board, primary references, a required artifact, and a validation check.
- **Forty-eight sealed enterprise cases** — synthetic identity, cloud, endpoint, host, cluster, and build evidence is interrogated through a real in-range CLI and submission service. Completion requires a live accepted condition; there is no browser simulation credit.
- **127 lessons // 120h45m** — eight complete Academy pathways now ship in the application alongside 70 specialist conditions, seven core ranges, eight drills, and three principal capstones.
- **Enterprise progression** — case attempts, time, guidance, score, weekly minutes, completion, XP, and the Enterprise Forged achievement persist in the local operator record.
- **Hard range boundary** — the Enterprise Forge network is internal-only with no published ports, no host mounts, read-only containers, dropped capabilities, resource ceilings, and verified internet-egress denial.

### Web Forge // 3.0

- **Twenty-seven Web + API lessons** — 24h45m covering browser contexts, server interpreters, identity, object authorization, OAuth, JWT, GraphQL, business logic, races, request framing, cache keys, and API resource controls.
- **Twenty-two live Web Forge conditions** — every scenario runs against a purpose-built vulnerable service inside an internal-only Docker network. No canned terminal output and no simulation credit.
- **Evidence-first operation** — each run starts with a scenario contract, establishes a positive control, changes one security variable, and ends only when the live target accepts the precise finding condition.
- **One disposable specialist range** — a root operator console, arbitrary in-range commands, no published ports, no host mounts, dropped capabilities, resource ceilings, and verified internet-egress denial.
- **Durable specialist progression** — attempts, hints, time, operation score, completion, weekly minutes, XP, and the Web Forged achievement are stored in the local operator record.
- **55 complete lessons // 48h45m** — the original full-spectrum path and the new Web specialist path are both available in Academy. FieldOps remains the only paid gate.

### Mastery System // 2.1

- **Three principal capstones** — Night Glass, Broken Orbit, and Red Ledger turn synthetic enterprise, cloud, application, identity, host, and reporting evidence into fifteen scored professional decisions.
- **Evidence-derived mastery grid** — six domain scores combine practical lesson work and capstone decisions without invented rankings or cohort data.
- **Adaptive remediation** — the local operator record identifies the weakest measured domains and routes the operator directly to the most relevant lesson.
- **Persistent decision ledger** — passed and failed capstone attempts retain domain scores and decision trails for honest progress history.

- **Full-Spectrum Security Assessment** — twenty-eight practical lessons and twenty-four hours of guided work spanning scope, recon, Windows and Linux attack surfaces, web, sessions, authorization, injection, APIs, enterprise identity, cloud, containers, supply chain, secrets, validation, evidence, cleanup, and retesting.
- **Advanced operator sequence** — eight hour-long deep dives covering Linux privilege graphs, Windows service control, Active Directory paths, Kerberos trust, segmentation and pivot analysis, SSRF, OAuth/OIDC, and CI/CD provenance.
- **Operator workshops** — every lesson now includes objectives, prerequisites, an annotated three-step workflow, commands or artifacts, expected signal, interpretation, a required deliverable, success criteria, and primary references.
- **Interactive operator workbenches** — twenty-eight tailored simulations with eighty-four decision nodes spanning scope compilation, packet timelines, privilege graphs, directory trust, access matrices, IAM evaluation, provenance, vulnerability triage, and closeout control.
- **Real mastery gating** — the knowledge validation stays locked until the operator passes the lesson workbench. Practical scores and replay attempts are stored in the local operator record.
- **Twenty-eight validation checks** — progress is recorded only after the lesson check is answered correctly.
- **Eight scored drill sets** — protocol recognition, request anatomy, evidence triage, finding quality, authorization, cloud controls, credential safety, and assessment triage.
- **Seven live field missions** — every mission provisions a disposable Docker environment with an unrestricted in-range shell, an internal-only network, zero host mounts, and verified internet-egress denial.
- **Broken Trust live API range** — interrogate an actual synthetic multi-tenant API, compare an owned record with one authorized foreign record, and submit the missing object-authorization condition.
- **Night Shift live forensic range** — verify SHA-256 evidence manifests, build a timeline from raw JSON, isolate high-confidence events, and submit an evidence-backed incident hypothesis.
- **Token Afterlife identity range** — execute a real password-recovery transition, replay the designated pre-reset session, and prove a lifecycle invalidation failure.
- **Policy Collision cloud range** — inspect effective policy, establish expected access, and prove one designated cross-project object read through excessive wildcard scope.
- **Artifact Zero supply-chain range** — verify an SBOM and provenance bundle, identify the deployed digest, and prove that trusted attestations cover different subjects.
- **Six specialist tracks** — Network, Web + API, Detection, Cloud, Supply Chain, and Enterprise Identity progress are calculated directly from completed live missions.
- **Manifest-driven range catalog** — the orchestrator now discovers scenario-specific operators, targets, networks, and containment policies so additional labs scale without weakening the boundary.
- **Four field notes** — short references for recon, HTTP evidence, finding writing, and range rules.
- **A real operator record** — XP, streaks, weekly minutes, attempts, scores, achievements, and activity are calculated from completed work.
- **Local-first data** — atomic writes, backup recovery, JSON export, reset controls, and no account dependency.
- **Lemon Squeezy licensing** — secure activation, instance validation, device deactivation, tier entitlements, and a fourteen-day offline grace window.
- **FieldOps Pro** — authorization-bound multi-target campaigns and diagnostics against exact external or internal systems, with persistent asset observations, digest-sealed captures, reviewed findings, evidence-backed retests, and professional reports.
- **Engagement Vault** — append-only scope records, dated testing windows, target and port allowlists, complete case-file export, and a SHA-256 chained activity ledger that exposes tampering.
- **DaemonCore Chaos Engine** — four real black-box resilience profiles with a non-blocking native worker, live latency and error telemetry, automatic SLO aborts, emergency stop, recovery validation, resilience scoring, durable run history, and evidence export.
- **Sealed Power Domain** — a dedicated disposable Chaos Worker can drive up to 500 requests per second, 100 concurrent workers, and 30,000 requests against the Academy black box. The worker and target have no published ports, no host mounts, no privileges, and no internet egress.
- **Readable by default** — the desktop renderer opens at 125% with saved 100%, 115%, 125%, and 140% interface choices. A typography floor protects dense FieldOps and Chaos telemetry from collapsing back into microscopic labels.

There are no locked “coming soon” course cards pretending to be content. FieldOps is the one intentional commercial gate.

## FieldOps is powerful on purpose

A paid license unlocks the tool. It does not authorize a target.

New FieldOps engagements also require a device-bound operator identity. DaemonCore generates an Ed25519 signing key and protects the private key with the operating system’s credential storage. The public fingerprint and named operator are embedded in signed permits and operation receipts; the private key is never included in an export. This provides device-key attribution and tamper evidence, not independent proof that a typed identity or authorization claim is truthful.

Before a diagnostic or Chaos Engine experiment can run, the operator must create an engagement with a client, authorization reference, external or internal network mode, exact targets, exact TCP ports, a testing window, and an explicit authorization attestation. FieldOps resolves and pins the destination, rejects addresses outside the selected boundary, blocks loopback, link-local, multicast, reserved, and mixed-boundary results, refuses redirects, and writes every completed or blocked action to the evidence ledger. Port surveys are limited to the declared allowlist, 128 ports, and four concurrent connection attempts. Basic resilience sampling remains fixed at ten HEAD requests, concurrency one, with at least 500 milliseconds between requests.

Campaign Engine applies that same boundary to the whole engagement. Operators select only allowlisted targets, choose a fixed assessment profile, and attest the campaign before launch. Work continues in the background, survives navigation, pauses between modules, resumes pending or failed tasks, and becomes recoverable after an unexpected desktop restart. Cancellation never abandons a half-written evidence record: the active module settles before the campaign closes.

Deep Service Inventory never passes hostnames, free-form flags, or shell text to its external engine. Nmap receives one already-resolved IP address and the engagement's normalized port list through a direct process invocation. The Docker adapter uses the pinned `instrumentisto/nmap:7.98-r2` image; Docker may download that image on the first run. Nmap XML is normalized into the same digest-sealed capture format as native FieldOps evidence.

Completed diagnostics are retained as digest-sealed captures in the engagement evidence vault. An operator can promote a capture into a reviewed finding, record severity, impact and remediation, change its disposition, and attach a later capture as a formal retest. A closure verdict never overwrites the original evidence. The JSON case file preserves the complete machine-readable record, while the standalone HTML report gives the client a clean finding register that can be printed to PDF.

Chaos Engine provides baseline, controlled-ramp, spike, and bounded-soak profiles against the exact authorized target. Every experiment is capped at sixty seconds, four requests per second, four concurrent probes, and 240 total requests. Operators set P95 latency and error-rate abort conditions before launch. A breached SLO stops the load phase, records the reason, measures recovery, computes a resilience score, and seals the result into the engagement ledger. The emergency stop remains available throughout execution.

Inside the sealed Academy range, the same profiles run through a dedicated high-intensity worker. This power domain is intentionally different: up to 500 requests per second, 100 concurrent workers, and a 30,000-request budget against a disposable target that cannot reach the host or internet. It exists to teach saturation, breakpoint discovery, guardrail design, and recovery engineering with real failure signals instead of a simulation.

There is no arbitrary public-network shell, DDoS engine, or online password-guessing system. High-volume availability testing and credential attacks can damage systems even when someone claims authorization. DaemonCore provides controlled resilience experiments, synthetic identity exercises, sanctioned offline credential-audit training, and the sealed range. Unrestricted command execution stays inside that range.

## Connect Lemon Squeezy

Edit `electron/license-policy.json` before building the commercial installer:

- set the public Lemon Squeezy `storeId`;
- add the product and/or variant IDs for Academy and FieldOps Pro;
- add the hosted checkout URL;
- set `requireAcademyLicense` to `true` when the Academy itself should be gated;
- choose the offline grace length.

These IDs are entitlement policy, not secrets. Never put a Lemon Squeezy management API key in the desktop app. License keys are encrypted through Electron secure storage and the renderer only receives masked metadata.

## The Ghost Port is a real range

When Docker is available, The Ghost Port provisions a root operator container and a purpose-built target. Nmap and curl return live results, arbitrary shell commands work inside the operator container, and the target is destroyed when the run ends.

The shell is unrestricted. The boundary is not.

Before access is released, DaemonCore verifies an internal-only Docker network, zero host mounts, blocked egress, no privileged containers, dropped capabilities, `no-new-privileges`, and resource ceilings. No target ports are published to the host. Failed containment means no shell.

## Run it from source

Requirements:

- Windows 10/11, Ubuntu 22.04+, or Debian 12+ on x64
- Node.js 20+
- Docker Desktop with Linux containers on Windows, or Docker Engine on Linux
- GNOME Keyring or KWallet for protected FieldOps credentials on Linux

```shell
git clone https://github.com/DaemoncoreApps/DaemonCore-Academy.git
cd DaemonCore-Academy
npm install
npm run dev
```

`npm run dev:web` runs the browser preview. The preview uses local storage and the simulation path because browsers do not receive the Electron range bridge.

## Break it before shipping it

```powershell
npm test
```

That command lints the UI, exercises operator-record persistence and recovery, verifies licensing and offline grace, attacks the FieldOps scope boundary, enforces the practical-lesson quality contract, validates the range contract and containment-sensitive Compose settings, then builds the production bundle.

Build the Windows installer with:

```powershell
npm run icon
npm run package:win
```

The installer lands at `release/DaemonCore-Academy-Setup.exe`. Every GitHub release uses that stable asset name, so the latest-download URL never needs to change.

The Windows installer uses one stable application identity and one installation path. When DaemonCore is already installed, setup asks before removing the previous program files and applying the update. Operator records, course progress, FieldOps case files, and license data are retained through the upgrade. Old installer files already sitting in Downloads are not deleted automatically.

Build the x64 Linux packages on Linux with:

```shell
npm run package:linux
```

The build produces `release/DaemonCore-Academy-5.5.0-beta.2.AppImage` and `release/DaemonCore-Academy-5.5.0-beta.2.deb`. The AppImage runs without installation after `chmod +x`. The Debian package installs system-wide while keeping operator data in the user’s standard Electron configuration directory. Linux FieldOps activation requires an unlocked Secret Service-compatible keyring; Academy remains available if secure storage is unavailable.

## Project map

```text
electron/data-store.cjs       atomic local operator record
electron/license-manager.cjs  Lemon Squeezy + protected key storage
electron/secure-storage.cjs   DPAPI, GNOME Keyring, KWallet enforcement
electron/trust-authority.cjs  protected operator keys + signed operation permits
electron/engagement-store.cjs scope enforcement + external diagnostics
electron/range-orchestrator.cjs
electron/range-integrity.cjs    full-tree fingerprints + receipt verification
ranges/web-range/             22-condition Web + API specialist range
ranges/enterprise-range/      48-case multi-domain enterprise range
ranges/identity-citadel/      protocol-native Samba Active Directory range
ranges/index.json             content-addressed pack registry
ranges/ghost-port/            live target, operator image, and manifest
ranges/ghost-port/chaos-worker high-intensity contained load worker
src/content.js                versioned course, drills, and field notes
src/web-curriculum.js         27-lesson Web + API specialist path
src/web-labs.js               live Web Forge contracts and commands
src/WebRange.jsx              catalog, sealed console, evidence ledger
src/enterprise-curriculum.js  six 12-lesson enterprise pathways
src/enterprise-labs.js        48 enterprise evidence contracts
src/EnterpriseRange.jsx       multi-domain forge catalog
src/lesson-practicals.js      workshops, commands, output, exercises, references
src/phase2.jsx                range console, lessons, and operator record UI
src/ChaosEngine.jsx           experiment composer + live resilience telemetry
src/CampaignControl.jsx       durable multi-target campaign control room
src/RangeChaosLab.jsx         sealed-range breakpoint laboratory
scripts/verify-data-store.mjs persistence/recovery contract
scripts/verify-phase4.mjs     licensing and scope-boundary contract
scripts/verify-phase5.mjs     curriculum breadth + bounded FieldOps contract
scripts/verify-phase6.mjs     practical lesson depth and artifact contract
scripts/verify-phase7.mjs     interactive scenario and mastery-gate contract
scripts/verify-phase8.mjs     Chaos Engine caps, abort, recovery, and audit contract
scripts/verify-fieldops-workspace.mjs  captures, findings, retests, and persistence
scripts/verify-campaign-engine.mjs     campaign scope, lifecycle, and recovery contract
scripts/verify-trust-authority.mjs     operator keys, permits, attribution, and tamper contract
scripts/verify-phase13.mjs    Web curriculum + live-range quality contract
scripts/verify-phase14.mjs    enterprise depth + containment contract
scripts/verify-phase15.mjs    identity range + pack tamper-rejection contract
scripts/verify-range.mjs      range and containment contract
```

This is training software, not authorization. Use it only on systems you own or have explicit permission to test.
