FROM nicolaka/netshoot:v0.13

COPY mission /opt/mission
COPY dc-submit /usr/local/bin/dc-submit
RUN chmod 0555 /usr/local/bin/dc-submit \
    && find /opt/mission -type d -exec chmod 0555 {} + \
    && find /opt/mission -type f -exec chmod 0444 {} +

WORKDIR /workspace
