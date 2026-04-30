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
  MIGRATE_LOG="/tmp/prisma-migrate.log"
  set +e
  npx prisma migrate deploy 2>&1 | tee "${MIGRATE_LOG}"
  MIGRATE_EXIT=$?
  set -e

  if [ "${MIGRATE_EXIT}" -ne 0 ]; then
    if grep -q "Error: P3009" "${MIGRATE_LOG}" && grep -Eq "20260425102407_init|20260425105752_npc_update|20260425111514_activities" "${MIGRATE_LOG}"; then
      echo "Detected legacy SQLite migration history conflict (P3009). Applying one-time auto-resolve..."
      npx prisma migrate resolve --rolled-back 20260425102407_init || true
      npx prisma migrate resolve --rolled-back 20260425105752_npc_update || true
      npx prisma migrate resolve --rolled-back 20260425111514_activities || true
      npx prisma migrate deploy
    else
      echo "Prisma migrate deploy failed. See ${MIGRATE_LOG} for details."
      exit "${MIGRATE_EXIT}"
    fi
  fi
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  node src/utils/seed.js
fi

exec node src/index.js
