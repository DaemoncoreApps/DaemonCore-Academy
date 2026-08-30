FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends krb5-user ldap-utils libsasl2-modules-gssapi-mit dnsutils smbclient jq curl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY krb5.conf /etc/krb5.conf
COPY dc-submit /usr/local/bin/dc-submit
RUN chmod 0555 /usr/local/bin/dc-submit
USER 65534:65534
