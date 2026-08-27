FROM node:22-alpine
WORKDIR /opt/lab
COPY labs.json /opt/lab/labs.json
COPY target/server.mjs /opt/lab/server.mjs
RUN printf 'DC_WEB_RANGE_CANARY_042\n' > /opt/lab/canary.txt && chmod -R 0444 /opt/lab
USER 65532:65532
EXPOSE 8080
CMD ["node", "/opt/lab/server.mjs"]
