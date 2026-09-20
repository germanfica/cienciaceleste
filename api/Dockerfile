FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN mkdir -p /var/lib/cienciaceleste && chown -R node:node /var/lib/cienciaceleste

USER node
EXPOSE 3000

CMD ["node", "dist/server.js"]
