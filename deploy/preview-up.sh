#!/usr/bin/env bash
# Create or update the preview backend for one pull request.
#
# Runs ON the droplet, fed over stdin so the droplet needs no checkout:
#   ssh host bash -s -- <pr> <image> <preview-domain> < deploy/preview-up.sh
#
# The workflow has already copied /opt/birdie-and-claire/preview.env, which
# holds everything except DATABASE_URL. The preview database password never
# leaves the droplet: it is read from /opt/shared/.env.
set -euo pipefail

PR_NUMBER=${1:?usage: preview-up.sh <pr-number> <image> <preview-domain>}
IMAGE=${2:?missing image}
PREVIEW_DOMAIN=${3:?missing preview domain}

PROJECT=birdie-and-claire
PROJECT_DIR="/opt/${PROJECT}"
SHARED_ENV=/opt/shared/.env
DB_NAME="pr_${PR_NUMBER}"
CONTAINER="${PROJECT}-pr-${PR_NUMBER}"
HOST="pr-${PR_NUMBER}.${PREVIEW_DOMAIN}"
PR_ENV_FILE="${PROJECT_DIR}/previews/pr-${PR_NUMBER}.env"

[ -r "${PROJECT_DIR}/preview.env" ] || { echo "missing ${PROJECT_DIR}/preview.env" >&2; exit 1; }
[ -r "$SHARED_ENV" ] || { echo "missing $SHARED_ENV" >&2; exit 1; }

PGPASSWORD=$(grep -E '^PREVIEW_DB_PASSWORD=' "$SHARED_ENV" | head -1 | cut -d= -f2-)
[ -n "$PGPASSWORD" ] || { echo "PREVIEW_DB_PASSWORD is empty in $SHARED_ENV" >&2; exit 1; }

echo "==> preview for PR #${PR_NUMBER} at https://${HOST}"

# A re-push reuses the database, so data entered during review survives.
if docker exec -e PGPASSWORD="$PGPASSWORD" preview-db \
     psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  echo "    database ${DB_NAME} already exists"
else
  echo "    creating database ${DB_NAME}"
  docker exec -e PGPASSWORD="$PGPASSWORD" preview-db createdb -U postgres "${DB_NAME}"
fi

# Written to a file rather than passed with -e, so the password stays out of
# the droplet's process list.
install -m 700 -d "${PROJECT_DIR}/previews"
( umask 077
  cat "${PROJECT_DIR}/preview.env"
  echo "DATABASE_URL=postgres://postgres:${PGPASSWORD}@preview-db:5432/${DB_NAME}?sslmode=disable"
) > "$PR_ENV_FILE"

# Migrations run before the new code starts: the server refuses to boot on a
# stale schema, so a bad migration fails here with a clearer error.
echo "    applying migrations"
docker pull --quiet "$IMAGE"
docker run --rm --network edge --env-file "$PR_ENV_FILE" --entrypoint /migrate "$IMAGE" up

echo "    starting ${CONTAINER}"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d \
  --name "$CONTAINER" \
  --network edge \
  --restart unless-stopped \
  --env-file "$PR_ENV_FILE" \
  --label "caddy=${HOST}" \
  --label "caddy.reverse_proxy={{upstreams 8080}}" \
  "$IMAGE" >/dev/null

# `docker run -d` succeeds as soon as the container exists, so without this a
# backend that exits on bad config would report a healthy preview. The restart
# count matters as much as Running: --restart brings a crashing container back
# within a second, so a sample of Running alone mostly catches it while up.
echo "    waiting for the container to stay up"
for _ in $(seq 1 15); do
  sleep 2
  if [ "$(docker inspect -f '{{.State.Running}} {{.RestartCount}}' "$CONTAINER" 2>/dev/null)" = "true 0" ]; then
    continue
  fi
  echo "${CONTAINER} exited instead of starting. Last lines:" >&2
  docker logs --tail 30 "$CONTAINER" >&2 2>&1 || true
  exit 1
done

echo "==> https://${HOST}"
