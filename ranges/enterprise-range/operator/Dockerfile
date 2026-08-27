FROM alpine:3.21
RUN apk add --no-cache bash curl jq
COPY cases.json /opt/enterprise/cases.json
COPY operator/dc-case /usr/local/bin/dc-case
COPY operator/dc-submit /usr/local/bin/dc-submit
RUN chmod 0444 /opt/enterprise/cases.json && chmod 0555 /usr/local/bin/dc-case /usr/local/bin/dc-submit
USER 65532:65532
