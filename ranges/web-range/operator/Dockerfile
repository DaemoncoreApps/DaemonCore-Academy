FROM alpine:3.21
RUN apk add --no-cache bash curl jq
COPY dc-submit /usr/local/bin/dc-submit
COPY dc-race /usr/local/bin/dc-race
COPY dc-frame /usr/local/bin/dc-frame
COPY ambiguous-request.txt /opt/lab/ambiguous-request.txt
RUN chmod 0555 /usr/local/bin/dc-submit /usr/local/bin/dc-race /usr/local/bin/dc-frame && chmod 0444 /opt/lab/ambiguous-request.txt
USER 65532:65532
