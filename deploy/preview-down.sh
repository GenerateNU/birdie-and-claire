#!/usr/bin/env bash
# Tear down the preview backend for one pull request.
#
#   ssh host bash -s -- <pr> < deploy/preview-down.sh
#
# Best-effort by design: a half-cleaned preview must not fail the workflow, or
# leftovers would pile up with no way to clear them.
set -uo pipefail

PR_NUMBER=${1:?usage: preview-down.sh <pr-number>}

PROJECT=birdie-and-claire
SHARED_ENV=/opt/shared/.env
DB_NAME="pr_${PR_NUMBER}"
CONTAINER="${PROJECT}-pr-${PR_NUMBER}"

echo "==> tearing down preview for PR #${PR_NUMBER}"

docker rm -f "$CONTAINER" >/dev/null 2>&1 \
  && echo "    removed ${CONTAINER}" \
  || echo "    no container ${CONTAINER}"

rm -f "/opt/${PROJECT}/previews/pr-${PR_NUMBER}.env"

# Tagged images are not dangling, so `docker image prune` would keep them.
IMAGES=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -E "/${PROJECT}/backend:pr-${PR_NUMBER}-")
if [ -z "$IMAGES" ]; then
  echo "    no images for PR #${PR_NUMBER}"
else
  echo "$IMAGES" | xargs docker rmi >/dev/null 2>&1 \
    && echo "    removed images for PR #${PR_NUMBER}" \
    || echo "    could not remove some images for PR #${PR_NUMBER}"
fi

if [ -r "$SHARED_ENV" ]; then
  PGPASSWORD=$(grep -E '^PREVIEW_DB_PASSWORD=' "$SHARED_ENV" | head -1 | cut -d= -f2-)
  # FORCE disconnects any session a just-killed container still holds open.
  docker exec -e PGPASSWORD="$PGPASSWORD" preview-db \
    psql -U postgres -tAc "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)" >/dev/null 2>&1 \
    && echo "    dropped ${DB_NAME}" \
    || echo "    could not drop ${DB_NAME} (may not exist)"
fi

echo "==> done"
