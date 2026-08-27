FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends samba smbclient krb5-user dnsutils ldap-utils ca-certificates && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /opt/citadel-seed && samba-tool domain provision --realm=DAEMONCORE.LAB --domain=DAEMONCORE --server-role=dc --dns-backend=SAMBA_INTERNAL --adminpass='Citadel-Lab-42!' --use-rfc2307 --targetdir=/opt/citadel-seed && \
    samba-tool -s /opt/citadel-seed/etc/smb.conf user create lab.operator 'Operator-Lab-42!' && \
    samba-tool -s /opt/citadel-seed/etc/smb.conf user create svc.backup 'Service-Lab-42!' && \
    samba-tool -s /opt/citadel-seed/etc/smb.conf group add 'Backup Operators Lab' && \
    samba-tool -s /opt/citadel-seed/etc/smb.conf group addmembers 'Backup Operators Lab' svc.backup
COPY entrypoint.sh /usr/local/bin/citadel-entrypoint
RUN chmod 0555 /usr/local/bin/citadel-entrypoint && chmod -R a-w /opt/citadel-seed
EXPOSE 53 53/udp 88 88/udp 135 139 389 389/udp 445 464 464/udp 636 3268 3269
ENTRYPOINT ["/usr/local/bin/citadel-entrypoint"]
