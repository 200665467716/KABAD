# Image built by CI and pulled by the Systalink server. The server never compiles.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY tools/no-sharp ./tools/no-sharp
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S kabad && adduser -S kabad -G kabad
COPY --from=build --chown=kabad:kabad /app/.next/standalone ./
COPY --from=build --chown=kabad:kabad /app/.next/static ./.next/static
COPY --from=build --chown=kabad:kabad /app/public ./public
USER kabad
EXPOSE 3000
CMD ["node", "server.js"]
