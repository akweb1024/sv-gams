# Coolify + GitHub Deployment Guide

This guide deploys the game as a single production service:
- Express API + Socket.IO backend
- Vite frontend static build served by Express
- SQLite persisted on a Coolify volume

## 1. Push Repo to GitHub

1. Create a GitHub repository.
2. Push this project (including `Dockerfile`, `docker/entrypoint.sh`, and `.env.example`).
3. Keep your default branch (for example `main`) as the deploy branch.

## 2. Create Project and App in Coolify

1. Open Coolify.
2. Create/select a Project.
3. Add `New Resource` -> `Application` -> `Public Repository` or `Private Repository`.
4. Connect/select your GitHub repository and branch.
5. Build Pack: `Dockerfile`.
6. Dockerfile Location: `./Dockerfile`.
7. Exposed Port: `5000`.

## 3. Configure Environment Variables

Set these in Coolify Application -> Environment Variables:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=5000`
- `JWT_SECRET=<long random secret, 32+ chars>`
- `DATABASE_URL=file:/app/data/game.db`
- `RUN_MIGRATIONS=true`
- `RUN_SEED=true` (first deploy only)
- `PRISMA_LOG_INFO=false`
- `PRISMA_LOG_QUERIES=false`

After first successful deploy, set `RUN_SEED=false` so game data is not reset on every redeploy.

## 4. Add Persistent Storage (Required for SQLite)

In Coolify Application -> Persistent Storage:

- Mount Path: `/app/data`
- Size: choose as needed (for example 1-5 GB to start)

Without this mount, SQLite data is lost on redeploy/restart.

## 5. Domain, SSL, and Health Check

1. Attach your domain in Coolify.
2. Enable SSL/HTTPS (Let's Encrypt).
3. Health check endpoint: `/api/health`
4. Confirm websocket support is enabled (Coolify reverse proxy supports this by default).

## 6. Deploy and Verify

1. Trigger Deploy.
2. Watch logs for:
   - `prisma migrate deploy` success
   - `Shoorveer Game Server running`
3. Open your domain and test:
   - register/login
   - spaces list and battle flows
   - real-time chat/socket behavior

## 7. Redeploy via GitHub Push

Every push to the configured branch can auto-deploy if auto-deploy is enabled in Coolify.

Recommended:
- Enable Auto Deploy for `main`.
- Protect `main` with PR reviews in GitHub.
- Keep `RUN_SEED=false` after bootstrap.

## 8. Production Safety Checklist

- Use a strong `JWT_SECRET` and rotate periodically.
- Keep persistent volume backups.
- Monitor app logs and error rates.
- Pin Node version with Dockerfile (already set to Node 20).
- Use HTTPS only for users.

## Optional: Move to Postgres Later

For larger scale, migrate from SQLite to Postgres:
- add a managed Postgres in Coolify
- update Prisma datasource and `DATABASE_URL`
- run migrations against Postgres
