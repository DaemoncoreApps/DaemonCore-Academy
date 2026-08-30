#!/bin/sh
set -eu
if [ ! -f /state/etc/smb.conf ]; then
  samba-tool domain provision --realm=DAEMONCORE.LAB --domain=DAEMONCORE --server-role=dc --dns-backend=SAMBA_INTERNAL --adminpass='Citadel-Lab-42!' --use-rfc2307 --targetdir=/state
  samba-tool -s /state/etc/smb.conf user create lab.operator 'Operator-Lab-42!'
  samba-tool -s /state/etc/smb.conf user create svc.backup 'Service-Lab-42!'
  samba-tool -s /state/etc/smb.conf group add 'Backup Operators Lab'
  samba-tool -s /state/etc/smb.conf group addmembers 'Backup Operators Lab' svc.backup
fi
exec samba -i --debug-stdout -s /state/etc/smb.conf
