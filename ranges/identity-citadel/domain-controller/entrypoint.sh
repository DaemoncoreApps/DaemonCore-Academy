#!/bin/sh
set -eu
if [ ! -f /state/etc/smb.conf ]; then
  samba-tool domain provision --realm=DAEMONCORE.LAB --domain=DAEMONCORE --server-role=dc --dns-backend=SAMBA_INTERNAL --adminpass='Citadel-Lab-42!' --use-rfc2307 --targetdir=/state
  samba-tool user create lab.operator 'Operator-Lab-42!' -s /state/etc/smb.conf
  samba-tool user create svc.backup 'Service-Lab-42!' -s /state/etc/smb.conf
  samba-tool group add 'Backup Operators Lab' -s /state/etc/smb.conf
  samba-tool group addmembers 'Backup Operators Lab' svc.backup -s /state/etc/smb.conf
  samba-tool spn add ldap/dc01.daemoncore.lab 'DC01$' -s /state/etc/smb.conf
fi
exec samba -i --debug-stdout -s /state/etc/smb.conf
