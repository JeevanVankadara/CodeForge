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

RUN for h in bits/stdc++.h iostream; do       f=$(echo "#include <$h>" | g++ -std=c++17 -x c++ -H -E - 2>&1 >/dev/null | grep -m1 "/$h\$" | awk '{print $2}');       g++ -std=c++17 -x c++-header "$f" -o "$f.gch";     done

RUN mkdir -p /tmp/cds && cd /tmp/cds  && printf 'public class Main{public static void main(String[] a){}}' > Main.java  && javac -J-XX:TieredStopAtLevel=1 -J-XX:+UseSerialGC -J-XX:ArchiveClassesAtExit=/opt/javac.jsa Main.java  && rm -rf /tmp/cds

WORKDIR /app

COPY Backend/package*.json ./
RUN npm ci --omit=dev

COPY Backend/ ./
COPY --from=web /web/dist ./public

ENV NODE_ENV=production
ENV EXECUTOR=local
ENV RUN_WORKER=true

CMD ["node", "server.js"]
