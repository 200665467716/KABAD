# Images built by CI and pulled by the Systalink server. The server never compiles.
#   docker build --target web      -t kabad-web .
#   docker build --target realtime -t kabad-realtime .
#   docker build --target migrate  -t kabad-migrate .
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY tools/no-sharp ./tools/no-sharp
# postinstall runs "prisma generate", which needs the schema.
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Read by the browser, so fixed at build time.
ARG NEXT_PUBLIC_REALTIME_URL
ENV NEXT_PUBLIC_REALTIME_URL=$NEXT_PUBLIC_REALTIME_URL
ARG NEXT_PUBLIC_LIVEKIT_URL
ENV NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL
RUN npx prisma generate && npm run build

# Applies database migrations, then exits. Run before each new version of the web app.
FROM deps AS migrate
ENV NODE_ENV=production
# Also used to appoint an administrator: docker compose run --rm migrate npm run admin:promote -- email
COPY scripts ./scripts
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-alpine AS realtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S kabad && adduser -S kabad -G kabad
COPY package.json package-lock.json ./
COPY tools/no-sharp ./tools/no-sharp
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY realtime ./realtime
USER kabad
EXPOSE 4001
CMD ["node", "realtime/server.mjs"]

FROM node:22-alpine AS web
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S kabad && adduser -S kabad -G kabad
COPY --from=build --chown=kabad:kabad /app/.next/standalone ./
COPY --from=build --chown=kabad:kabad /app/.next/static ./.next/static
COPY --from=build --chown=kabad:kabad /app/public ./public
USER kabad
EXPOSE 3000
CMD ["node", "server.js"]
