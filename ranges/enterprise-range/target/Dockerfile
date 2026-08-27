FROM node:22-alpine
WORKDIR /opt/enterprise
COPY cases.json ./cases.json
COPY target/server.mjs ./server.mjs
RUN chmod -R 0444 /opt/enterprise
USER 65532:65532
CMD ["node", "/opt/enterprise/server.mjs"]
