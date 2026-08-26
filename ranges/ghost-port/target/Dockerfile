FROM node:20-alpine

WORKDIR /opt/target
COPY server.mjs ./server.mjs

EXPOSE 22 445 8088
CMD ["node", "server.mjs"]
