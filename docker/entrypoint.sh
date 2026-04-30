#!/bin/sh
set -eu

cd /app/server

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. For Postgres use: postgresql://USER:PASSWORD@HOST:5432/game?schema=public"
  exit 1
fi

case "${DATABASE_URL}" in
  postgresql://*|postgres://*)
    ;;
  *)
    echo "ERROR: DATABASE_URL must start with postgresql:// (or postgres://) because Prisma datasource provider is postgresql."
    echo "Set DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/game?schema=public"
    exit 1
    ;;
esac

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  npx prisma migrate deploy
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  node src/utils/seed.js
fi

exec node src/index.js
