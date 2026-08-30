# DaemonCore Academy 5.5.0-beta.1

DaemonCore now has a first-class Linux build.

## Linux desktop beta

- Run the complete Academy, Mastery system, Web Forge, Enterprise Forge, sealed Docker ranges, FieldOps, and Chaos Engine on x64 Linux.
- Choose a portable AppImage or a native Debian package.
- Use local Docker Engine and Nmap without Windows compatibility layers; the pinned Docker Nmap adapter remains available when Nmap is not installed on the host.
- Keep the existing exact-target, declared-port, signed-permit, evidence-sealing, and range-containment boundaries on both platforms.

## Protected credentials

FieldOps license keys and device signing keys are protected through GNOME Keyring or KWallet. If Electron detects its unencrypted `basic_text` fallback, activation and identity enrollment remain locked and the app explains how to restore secure storage. Free Academy content remains usable.

## Packaging confidence

The Linux release pipeline runs the complete product verification suite on Ubuntu, builds both packages, extracts and inspects the AppImage, validates Debian metadata, and publishes SHA-256 checksums beside the downloads.

## Beta boundary

This first Linux release targets x64 Ubuntu/Debian-family desktops. Fedora, Kali, Arch, and ARM64 validation remain outside the beta support matrix until they complete dedicated compatibility testing.
