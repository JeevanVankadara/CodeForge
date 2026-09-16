FROM node:22-alpine AS web
WORKDIR /web
COPY Frontend/package*.json ./
RUN npm ci
COPY Frontend/ ./
RUN npm run build

FROM eclipse-temurin:21-jdk-noble

RUN apt-get update \
 && apt-get install -y --no-install-recommends g++ python3 curl ca-certificates \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Backend/package*.json ./
RUN npm ci --omit=dev

COPY Backend/ ./
COPY --from=web /web/dist ./public

ENV NODE_ENV=production
ENV EXECUTOR=local
ENV RUN_WORKER=true

CMD ["node", "server.js"]
