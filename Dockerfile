FROM node:22-alpine

WORKDIR /app
COPY --chown=node:node relay.server.mjs ./

ENV NODE_ENV=production
USER node

CMD ["node", "relay.server.mjs"]
