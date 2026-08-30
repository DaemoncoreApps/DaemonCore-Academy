FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends samba samba-ad-provision samba-dsdb-modules samba-vfs-modules winbind smbclient krb5-user dnsutils ldap-utils ca-certificates && rm -rf /var/lib/apt/lists/*
COPY entrypoint.sh /usr/local/bin/citadel-entrypoint
RUN chmod 0555 /usr/local/bin/citadel-entrypoint
EXPOSE 53 53/udp 88 88/udp 135 139 389 389/udp 445 464 464/udp 636 3268 3269
ENTRYPOINT ["/usr/local/bin/citadel-entrypoint"]
