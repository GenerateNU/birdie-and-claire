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

# Every push pulls a new pr-<n>-<sha> tag. Old tags are not dangling, so `docker
# image prune` would keep them; remove this PR's by name instead of `prune -a`,
# which would also take other projects' images off the droplet. Images any
# container uses are skipped by ID: when several tags share one image (a preview
# and a release built from the same commit), `docker rmi` of one tag only untags
# it, even while a container runs it. Run before the pull too, so a nearly full
# disk does not fail it before cleanup is ever reached.
remove_unused_pr_images() {
  echo "    removing unused images for PR #${PR_NUMBER}"
  docker images --no-trunc --format '{{.ID}} {{.Repository}}:{{.Tag}}' \
    | grep -F " ${IMAGE%:*}:pr-${PR_NUMBER}-" \
    | grep -vFf <(docker ps -aq | xargs -r docker inspect -f '{{.Image}}') \
    | cut -d' ' -f2 \
    | xargs -r docker rmi >/dev/null 2>&1 || true
}
remove_unused_pr_images

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
  echo "PUBLIC_API_URL=https://${HOST}"
) > "$PR_ENV_FILE"

# Migrations run before the new code starts: the server refuses to boot on a
# stale schema, so a bad migration fails here with a clearer error.
echo "    applying migrations"
docker pull --quiet "$IMAGE"
# Goose refuses an older-timestamped migration that main brought in after a
# newer one ran here. Starting over from an empty database fixes that, and a
# migration that is broken on its own still fails on the second attempt.
if ! docker run --rm --network edge --env-file "$PR_ENV_FILE" --entrypoint /migrate "$IMAGE" up; then
  # FORCE disconnects the running preview container, which still uses the database.
  docker exec -e PGPASSWORD="$PGPASSWORD" preview-db \
    psql -U postgres -tAc "DROP DATABASE ${DB_NAME} WITH (FORCE)" >/dev/null
  docker exec -e PGPASSWORD="$PGPASSWORD" preview-db createdb -U postgres "${DB_NAME}"
  echo "    migrations failed on existing database, recreated ${DB_NAME}"
  docker run --rm --network edge --env-file "$PR_ENV_FILE" --entrypoint /migrate "$IMAGE" up
fi

# Keyed on an empty products table, not on createdb above, so any path that
# leaves a fresh database gets seeded too. The assignment lets set -e stop the
# deploy when the check itself fails, instead of reading that as "empty".
HAS_PRODUCTS=$(docker exec -e PGPASSWORD="$PGPASSWORD" preview-db \
  psql -U postgres -d "${DB_NAME}" -v ON_ERROR_STOP=1 -tAc "SELECT EXISTS (SELECT 1 FROM products)")
if [ "$HAS_PRODUCTS" = "t" ]; then
  echo "    products already present, skipping seed"
else
  echo "    seeding demo products"
  docker exec -i -e PGPASSWORD="$PGPASSWORD" preview-db \
    psql -U postgres -d "${DB_NAME}" -v ON_ERROR_STOP=1 -q -1 < "${PROJECT_DIR}/products.sql"
fi

echo "    starting ${CONTAINER}"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d \
  --name "$CONTAINER" \
  --network edge \
  --restart unless-stopped \
  --env-file "$PR_ENV_FILE" \
  --log-opt max-size=10m --log-opt max-file=3 \
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

# The old container is gone now, so its image can go too.
remove_unused_pr_images

echo "==> https://${HOST}"
