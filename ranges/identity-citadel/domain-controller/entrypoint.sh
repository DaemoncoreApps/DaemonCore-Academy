#!/bin/sh
set -eu
cp -a /opt/citadel-seed/. /state/
exec samba -i --debug-stdout -s /state/etc/smb.conf
