FROM nicolaka/netshoot:v0.13

COPY evidence /opt/evidence
COPY dc-submit /usr/local/bin/dc-submit
RUN chmod 0555 /usr/local/bin/dc-submit \
    && find /opt/evidence -type d -exec chmod 0555 {} + \
    && find /opt/evidence -type f -exec chmod 0444 {} +

WORKDIR /workspace
