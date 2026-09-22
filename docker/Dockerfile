# ─────────────────────────────────────────────────────────────────────────────
#  EMAD Equb Admin Panel — Next.js 16 standalone image
#
#  Two stages: `builder` installs + compiles, `runner` carries only the
#  standalone server output. The final image has no pnpm, no source tree and
#  no dev dependencies.
#
#  Build:  docker build -f docker/Dockerfile -t emad-equb-admin:local .
#  (or just `docker compose build`, which passes the build args below)
# ─────────────────────────────────────────────────────────────────────────────

# Node 24 matches the development environment and satisfies Next 16's
# >=20.9 floor. Alpine because the runtime stage needs nothing but libc.
FROM node:24-alpine AS builder

WORKDIR /app

# Pin pnpm to the version that produced pnpm-lock.yaml (lockfileVersion 9.0),
# so --frozen-lockfile cannot fail on a resolver difference.
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate

# Dependency manifests first: this layer is cached until the lockfile changes.
COPY package.json pnpm-lock.yaml ./

# Registry override. Defaults to npmjs; CI or a developer on a slow link can
# pass --build-arg PNPM_REGISTRY=https://registry.npmmirror.com instead.
ARG PNPM_REGISTRY=https://registry.npmjs.org
RUN pnpm config set registry "$PNPM_REGISTRY"

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

# ── Build-time configuration ────────────────────────────────────────────
# Next.js INLINES every NEXT_PUBLIC_* value into the client bundle when it
# compiles. They are therefore NOT read from the runtime environment and must
# be supplied here. CI passes them as --build-arg from environment-scoped
# variables, so no URL or feature toggle ever lives in the repository.
#
# Note the asymmetry with BACKEND_API_BASE_URL below: that one is read by the
# server-side proxy route at REQUEST time and so belongs in compose, not here.
ARG NEXT_PUBLIC_API_BASE_URL=
ARG NEXT_PUBLIC_USE_MOCK=false
ARG NEXT_PUBLIC_ENFORCE_PERMS=

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_USE_MOCK=$NEXT_PUBLIC_USE_MOCK \
    NEXT_PUBLIC_ENFORCE_PERMS=$NEXT_PUBLIC_ENFORCE_PERMS \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm run build

# `output: "standalone"` emits a self-contained server but deliberately leaves
# out .next/static and public/ — Next assumes a CDN serves them. Nothing does
# here, so fold them back in and the one container serves everything.
RUN cp -r .next/static .next/standalone/.next/static && \
    cp -r public .next/standalone/public

# ── Runtime stage ───────────────────────────────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# The standalone bundle is already chown'd to node so the unprivileged user
# can read it; nothing in the app writes to disk at runtime.
COPY --from=builder --chown=node:node /app/.next/standalone ./

# node:24-alpine ships an unprivileged `node` user. Running as root would give
# a Next.js RCE root inside the container for no benefit whatsoever.
USER node

EXPOSE 3000

# Self-contained probe so `docker ps` and compose both see real health.
# 127.0.0.1, not localhost: busybox wget prefers ::1 but the Next standalone
# server binds IPv4 only, so a localhost probe would never connect.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -q -O- -T 3 http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
