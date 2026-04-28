#!/bin/sh
set -eu

cd /app/server
mkdir -p /app/data

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  npx prisma migrate deploy
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  node src/utils/seed.js
fi

exec node src/index.js
