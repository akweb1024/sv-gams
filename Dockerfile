FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-builder
WORKDIR /app/server
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
RUN apk add --no-cache openssl
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/prisma ./prisma
RUN npx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/game?schema=public
RUN apk add --no-cache openssl

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY server ./server
COPY --from=client-builder /app/client/dist ./client/dist
COPY docker/entrypoint.sh ./docker/entrypoint.sh

RUN chmod +x ./docker/entrypoint.sh \
  && mkdir -p /app/data \
  && chown -R appuser:appgroup /app

USER appuser
EXPOSE 5000
CMD ["./docker/entrypoint.sh"]
