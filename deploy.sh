#!/usr/bin/env bash
#
# DrawWithMe deploy script (run on the VPS).
#   ./deploy.sh
#
# Pulls the latest code + committed frontend build from git, then rebuilds and
# restarts the full Docker stack (Postgres + NestJS API + nginx web server).
# The FE is served by nginx straight from the committed frontend/dist — no Node
# build happens on the server.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

# Pick the available compose command.
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "ERROR: docker compose is not installed." >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "ERROR: .env is missing. Copy it from .env.example and fill in values:" >&2
  echo "       cp .env.example .env && nano .env" >&2
  exit 1
fi

# Load env so port vars are available to this script too.
set -a; . ./.env; set +a

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)}"

log "Fetching latest from origin/$BRANCH"
git fetch --all --prune
git reset --hard "origin/$BRANCH"   # take exactly what's on the remote (incl. frontend/dist)

log "Rebuilding & restarting the stack"
$DC --env-file .env up -d --build

log "Waiting for the API to become healthy"
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${API_PORT:-3000}/api/rooms" -X POST \
       -H 'Content-Type: application/json' -d '{}' 2>/dev/null; then
    echo "API is up."
    break
  fi
  sleep 2
done

log "Pruning dangling images"
docker image prune -f >/dev/null 2>&1 || true

log "Current services"
$DC ps

log "Deploy complete 🎉  (web on port ${WEB_PORT:-80})"
