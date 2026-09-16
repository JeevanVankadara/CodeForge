FROM eclipse-temurin:21-jdk-noble

RUN apt-get update \
 && apt-get install -y --no-install-recommends g++ python3 curl ca-certificates \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV EXECUTOR=local

CMD ["node", "worker.js"]
