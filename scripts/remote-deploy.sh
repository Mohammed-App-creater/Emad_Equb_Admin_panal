#!/usr/bin/env bash
#
# Runs ON the target server. CI uploads it with the other runtime files and
# executes it BY PATH with stdin closed:
#   ssh user@host "DEPLOY_ENV=... bash <path>/scripts/remote-deploy.sh" < /dev/null
# so the box always executes the deploy logic belonging to the commit being
# deployed, and never needs a git checkout of its own.
#
# It is deliberately not piped into `bash -s`. With the script on stdin, any
# command that reads stdin consumes the unread remainder of the script; bash
# then reaches EOF and exits 0, reporting a successful deploy that never
# happened. Running from a file makes that class of bug impossible.
#
# This frontend stack is deliberately light compared to the backend's:
#   • no database migrations, no bootstrap, no infrastructure services
#   • no nginx hop — the Next.js standalone server is its own entry point
#   • almost no runtime env: every NEXT_PUBLIC_* value is baked into the image
#     at build time. The single exception is BACKEND_API_BASE_URL, read per
#     request by the server-side proxy route; it is optional and is passed
#     through below as a shell export when CI supplies it.
# Everything the container needs at run time is either shipped by CI (this file,
# the compose file) or is the $APP_IMAGE built from the commit being deployed.
#
# Required env:
#   DEPLOY_ENV       staging | production
#   APP_IMAGE        registry.gitlab.com/<project>:<commit sha>
#   DEPLOY_PATH      deploy directory on this box
#   COMPOSE_FILE     compose file basename inside DEPLOY_PATH
#   REGISTRY         registry host, e.g. registry.gitlab.com
#   REGISTRY_USER    deploy-token username  (read_registry scope only)
#   REGISTRY_TOKEN   deploy-token secret
# Optional:
#   READY_TIMEOUT          seconds       (default 120)
#   BACKEND_API_BASE_URL   server-side proxy target; unset means the route
#                          falls back to the baked NEXT_PUBLIC_API_BASE_URL

set -euo pipefail

for v in DEPLOY_ENV APP_IMAGE DEPLOY_PATH COMPOSE_FILE \
         REGISTRY REGISTRY_USER REGISTRY_TOKEN; do
  [ -n "${!v:-}" ] || { echo "✖ $v is required but empty" >&2; exit 1; }
done

READY_TIMEOUT="${READY_TIMEOUT:-120}"

log()  { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  ✓ %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m✖ %s\033[0m\n' "$*" >&2; }

# ── 0. Preflight ────────────────────────────────────────────────────────
cd "$DEPLOY_PATH" 2>/dev/null || { fail "DEPLOY_PATH $DEPLOY_PATH does not exist"; exit 1; }
[ -f "$COMPOSE_FILE" ] || { fail "$DEPLOY_PATH/$COMPOSE_FILE missing — CI should have uploaded it"; exit 1; }

# The compose file pins `name:`, so the project identity does not depend on
# this directory. Nothing below ever needs an --env-file: both interpolated
# values arrive as shell exports, which beat any file.
compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

export APP_IMAGE
# Exported unconditionally so `set -u` cannot trip on it. Empty is the normal
# case: the compose files read ${BACKEND_API_BASE_URL:-} and an empty value
# makes the proxy route fall back to the baked NEXT_PUBLIC_API_BASE_URL.
export BACKEND_API_BASE_URL="${BACKEND_API_BASE_URL:-}"

log "Deploying $DEPLOY_ENV"
echo "  image:   $APP_IMAGE"
echo "  path:    $DEPLOY_PATH"
echo "  compose: $COMPOSE_FILE"
if [ -n "$BACKEND_API_BASE_URL" ]; then echo "  proxy:   $BACKEND_API_BASE_URL"; fi

# ── 1. Authenticate to the private registry ─────────────────────────────
# --password-stdin keeps the token out of the process table and shell history.
# The login persists in ~/.docker/config.json so a manual rollback or a
# `docker compose pull` after a reboot works without CI.
log "Authenticating to $REGISTRY"
printf '%s' "$REGISTRY_TOKEN" | docker login "$REGISTRY" -u "$REGISTRY_USER" --password-stdin
ok "logged in as $REGISTRY_USER"

# ── 2. Record what is running, so a bad rollout can be put back ─────────
PREVIOUS_IMAGE=""
if PREV_CID="$(compose ps -q web 2>/dev/null)" && [ -n "$PREV_CID" ]; then
  PREVIOUS_IMAGE="$(docker inspect -f '{{index .Config.Image}}' "$PREV_CID" 2>/dev/null || true)"
  [ -n "$PREVIOUS_IMAGE" ] && ok "currently running: $PREVIOUS_IMAGE"
fi

# ── 3. Pull first, before anything on the box is disturbed ──────────────
# If the registry rejects us this fails here, with the old stack untouched.
log "Pulling $APP_IMAGE"
compose pull web
ok "image present locally"

# ── 4. Roll the application ─────────────────────────────────────────────
# Plain `up -d`: compose recreates a service only when its definition or image
# changed, so `web` rolls and nothing is ever removed or stopped.
log "Rolling web to the new image"
compose up -d web
ok "web container recreated"

# ── 5. Readiness ────────────────────────────────────────────────────────
# The Next standalone server has no /ready endpoint; `/` answering 200 is the
# gate. `App Router` pages render client-side for the unauthenticated visitor,
# so this does not depend on the backend being up.
web_ready() {
  local cid deadline
  cid="$(compose ps -q web)"
  [ -n "$cid" ] || return 1
  deadline=$(( $(date +%s) + READY_TIMEOUT ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    if [ "$(docker inspect -f '{{.State.Running}}' "$cid" 2>/dev/null)" != "true" ]; then
      fail "web container stopped — it is crash-looping, not starting slowly"
      return 1
    fi
    # busybox wget ships in the alpine runtime image; no curl needed in-container.
    # 127.0.0.1, NOT localhost: busybox wget resolves localhost to ::1 but the
    # Next standalone server only binds IPv4 (0.0.0.0), so localhost probes
    # would always get "Connection refused" and the deploy would never go green.
    if docker exec "$cid" wget -q -O- -T 3 "http://127.0.0.1:3000/" >/dev/null 2>&1; then
      return 0
    fi
    sleep 3
  done
  fail "web did not answer http://127.0.0.1:3000/ within ${READY_TIMEOUT}s"
  return 1
}

log "Waiting for web to report ready"
if web_ready; then
  ok "web ready on /"

  # Remember what is deployed. Old images are deliberately NOT pruned, so
  # any previous $CI_COMMIT_SHA can be redeployed instantly.
  {
    echo "DEPLOYED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "DEPLOY_ENV=$DEPLOY_ENV"
    echo "APP_IMAGE=$APP_IMAGE"
    echo "PREVIOUS_IMAGE=$PREVIOUS_IMAGE"
  } > .deploy-state
  printf '\n\033[1;32m✅ %s deployment complete: %s\033[0m\n' "$DEPLOY_ENV" "$APP_IMAGE"
  exit 0
fi

# ── 6. Failed — show why, then put the old image back ───────────────────
fail "Deployment failed. Last 80 log lines from web:"
compose logs --tail=80 --no-color web || true

if [ -n "$PREVIOUS_IMAGE" ]; then
  log "Rolling back to $PREVIOUS_IMAGE"
  export APP_IMAGE="$PREVIOUS_IMAGE"
  if compose up -d web && sleep 5 && web_ready; then
    fail "Rolled back to $PREVIOUS_IMAGE."
  else
    fail "Rollback ALSO failed — $DEPLOY_ENV web is DOWN, intervene manually."
  fi
else
  fail "No previous container to roll back to — $DEPLOY_ENV web is DOWN."
fi
exit 1