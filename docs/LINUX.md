# DaemonCore Academy on Linux

Version 6.0.0-beta.2 supports x64 Ubuntu and Debian-family desktop systems through an AppImage and a Debian package. The Linux beta contains Mission OS, the guided Academy workflow, the same curriculum and local progress record, sealed Docker ranges, Lemon Squeezy FieldOps entitlement, signed engagements, evidence vault, reports, and Chaos Engine as the Windows build.

## Choose a package

Use the AppImage when you want a portable application without a system installation:

```shell
chmod +x DaemonCore-Academy-6.0.0-beta.2.AppImage
./DaemonCore-Academy-6.0.0-beta.2.AppImage
```

Use the Debian package on Ubuntu or Debian. It may also install on compatible derivatives such as Kali, but those distributions remain outside the first beta support matrix:

```shell
sudo apt install ./DaemonCore-Academy-6.0.0-beta.2.deb
```

The package manager installs a desktop entry and application icon. Removing the package does not remove the current user’s DaemonCore records.

## Prepare Docker

Live ranges require Docker Engine with Compose v2. Verify both before opening a mission:

```shell
docker version
docker compose version
```

DaemonCore never requests `sudo` and never collects a password. Configure Docker for the desktop account according to Docker’s post-install guidance, then sign out and back in so the group membership takes effect. Membership in the Docker group is effectively root-level access to the host; use a dedicated training workstation or VM when that trust level is inappropriate.

The application rejects range launch if Docker is missing, stopped, or inaccessible. Every live mission still has to pass DaemonCore’s internal-only network, zero host mount, no privileged container, egress denial, and resource-limit checks.

## Prepare protected credential storage

Academy works without a keyring. FieldOps activation and operator identity enrollment require an unlocked GNOME Keyring or KWallet backend because they persist a Lemon Squeezy key and an Ed25519 private signing key.

For GNOME desktops, confirm that `gnome-keyring` and the Secret Service library are installed and that the login keyring unlocks with the desktop session. KDE users can use KWallet. DaemonCore displays the detected backend in its license snapshot and blocks protected writes if Electron falls back to `basic_text`.

Do not launch DaemonCore with `--password-store=basic`. The Linux build intentionally treats that backend as unavailable.

## Optional native Nmap

FieldOps Deep Service Inventory prefers the host `nmap` command:

```shell
nmap --version
```

If Nmap is absent, FieldOps can run the pinned Nmap image through Docker. If neither engine is available, the built-in passive profiler remains available for supported operations.

## Records and upgrades

Electron stores per-user data under `${XDG_CONFIG_HOME:-~/.config}/DaemonCore Academy` by default. This includes Academy progress, FieldOps case files, protected entitlement material, and device identity metadata. Back up records through the in-app export controls before changing distributions or desktop keyrings.

Installing a newer Debian package upgrades the application in place. AppImage users replace the old AppImage file manually; both packages continue using the same per-user data directory.

## Troubleshooting

- **Docker is installed but inaccessible:** run `docker version` as the same desktop account. Resolve socket or group access instead of launching DaemonCore as root.
- **FieldOps says secure storage is required:** unlock the desktop keyring, confirm a Secret Service or KWallet daemon is running, and reopen DaemonCore.
- **AppImage does not launch:** verify execute permission and use the Debian package when the distribution disables AppImage execution. Do not work around Electron failures with `--no-sandbox`.
- **Native inventory is unavailable:** verify `nmap --version` or start Docker so the pinned fallback image can run.
