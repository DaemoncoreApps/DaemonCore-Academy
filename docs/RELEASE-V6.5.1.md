# DaemonCore Academy 6.5.1

Released 5 September 2026.

This patch repairs the Docker terminal workflow across Mission OS, Web Forge, and Enterprise Forge.

## Fixed

- Long command output now remains inside a vertically scrollable terminal viewport instead of extending below the visible application window.
- Terminal flex containers can shrink correctly at different window sizes.
- A visible DaemonCore-styled scrollbar makes long output discoverable.
- Keyboard focus returns to the command input after each command completes.
- Mission terminals retain their input while a process is running without dropping keyboard focus.

## Platform status

- Windows: production patch 6.5.1, unsigned pending Authenticode certificate.
- Linux: production 6.5.1 AppImage and Debian packages are attached to this release with SHA-256 checksums.
