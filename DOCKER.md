# Running the Equb admin panel in Docker

Everything here mirrors the EMAD Sacco frontend, so if you have deployed that
project the muscle memory carries over. The differences are called out in
[Differences from the Sacco frontend](#differences-from-the-sacco-frontend).

## Quick start

```bash
docker compose up -d --build     # http://localhost:4100
docker compose logs -f web
docker compose down
```

Compose reads your existing `./.env`, so the `NEXT_PUBLIC_*` values you already
develop against drive the build with no extra setup. A fresh clone with no
`.env` at all still comes up — every variable has a fallback.

See [.env.docker.example](.env.docker.example) for the full list of knobs.

## Build time vs. run time

This is the one thing worth understanding before you debug a "wrong API URL"
problem.

| Variable | When it is read | To change it |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | **Build** — Next inlines it into the JS bundle | `docker compose up -d --build` |
| `NEXT_PUBLIC_USE_MOCK` | **Build** | `docker compose up -d --build` |
| `NEXT_PUBLIC_ENFORCE_PERMS` | **Build** | `docker compose up -d --build` |
| `BACKEND_API_BASE_URL` | **Run** — read per request by the proxy route | `docker compose up -d` |

Setting `NEXT_PUBLIC_API_BASE_URL` in the container's environment does nothing.
By the time the container starts, that value is already compiled into the
bundle. This is a Next.js property, not a choice this setup made.

`BACKEND_API_BASE_URL` is the exception because
[`src/app/api/backend/[...path]/route.ts`](src/app/api/backend/%5B...path%5D/route.ts)
runs on the server and reads it on every request. It is optional — unset, the
route falls back to the baked `NEXT_PUBLIC_API_BASE_URL`. Set it only when the
server should reach the backend at an address the browser cannot use, such as
an internal hostname.

## Exposing the panel over ngrok

For demos, mobile testing against a real HTTPS origin, or a backend webhook
that needs to reach this machine:

```bash
# one-time: put your token in .env
echo 'NGROK_AUTHTOKEN=2abc...' >> .env

docker compose --profile tunnel up -d
docker compose logs ngrok | grep -o 'https://[^ ]*ngrok[^ ]*'
```

The inspector — request replay and full payload view — is on
<http://localhost:4140>.

Notes:

- The tunnel is behind the `tunnel` profile, so a plain `docker compose up`
  never puts this panel on the public internet by accident.
- The agent connects to `web:3000` over the compose network, not through the
  published host port, so remapping `WEB_PORT` does not break it.
- The URL is random and changes on every restart. With a paid ngrok plan,
  uncomment `domain:` in [docker/ngrok.yml](docker/ngrok.yml) for a stable one.
- The API client already sends `ngrok-skip-browser-warning: true`
  ([src/lib/api/client.ts](src/lib/api/client.ts)), so the free-tier interstitial
  does not break XHR calls.
- **A live tunnel is a public URL to a real admin panel.** Bring it down with
  `docker compose --profile tunnel down` when you are finished.

## Deployment

Pushing to `dev` deploys staging; pushing to `main` deploys production. Both
run on host port **4100** — the Sacco frontend owns 4000 on those boxes.

| Branch | Environment | Host | URL |
|---|---|---|---|
| `dev` | staging | `root@213.199.41.202` | <http://213.199.41.202:4100> |
| `main` | production | `golang_user@196.188.249.99` | <http://196.188.249.99:4100> |

The pipeline builds the image twice, once per environment, because
`NEXT_PUBLIC_*` is baked in. Every deploy ships the immutable
`$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA`; the moving `:staging` / `:production` tags
exist only as a BuildKit cache source and a manual-recovery fallback.
[scripts/remote-deploy.sh](scripts/remote-deploy.sh) pulls, rolls, waits for the
health check and **rolls back to the previous image** if the new one does not
answer on `/` within 120s.

### Before the first pipeline run

Three things are not yet in place, because they live in GitLab rather than in
this repository:

1. **CI/CD variables.** In *Settings → CI/CD → Variables*, add
   `NEXT_PUBLIC_API_BASE_URL` (and optionally `NEXT_PUBLIC_USE_MOCK`,
   `NEXT_PUBLIC_ENFORCE_PERMS`, `BACKEND_API_BASE_URL`) **scoped per
   environment**, plus the deploy secrets: `STAGING_SSH_PRIVATE_KEY`,
   `STAGING_SSH_KNOWN_HOSTS`, `PRODUCTION_SSH_PRIVATE_KEY`,
   `PRODUCTION_SSH_KNOWN_HOSTS`, `REGISTRY_USER`, `REGISTRY_TOKEN`, and
   optionally `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`.
   Use *File* type for the SSH variables — masked multi-line variables mangle
   newlines. The pipeline fails loudly and by name if any of these is empty.

2. **The runner.** The jobs tagged `emad-selfhosted` target the runner on the
   staging box, which is registered as a **project** runner on the Sacco
   frontend and will not pick up jobs here. Either make it a group runner under
   `simbatech06`, register a new one with the same tag, or delete the `tags:`
   lines in [.gitlab-ci.yml](.gitlab-ci.yml) to use GitLab's shared runners.
   A tagged job with no matching runner sits *pending* forever rather than
   failing.

3. **A `read_registry` deploy token** for `REGISTRY_USER` / `REGISTRY_TOKEN`,
   so the servers can pull from `registry.gitlab.com/simbatech06/equb_admin`.

### Manual deploy or rollback

```bash
ssh root@213.199.41.202
cd /root/emad-staging/equb-admin
APP_IMAGE=registry.gitlab.com/simbatech06/equb_admin:<sha> \
  docker compose -f docker-compose.staging.yml up -d
```

Old images are deliberately never pruned, so any previous commit SHA can be put
back instantly. `.deploy-state` in that directory records what is running and
what it replaced.

## Differences from the Sacco frontend

- **Port 4100**, not 4000, so both panels can run on one box.
- **`BACKEND_API_BASE_URL` is a runtime variable**, passed through compose and
  the deploy script. The Sacco frontend has no runtime env at all.
- **Node 24** rather than Node 20, matching local development.
- **No nginx.** `docker/default.conf` in the Sacco repo proxies :4000 to :3000,
  which the standalone server does not need — it binds `0.0.0.0:3000` itself and
  compose publishes it directly.
- The runtime container **runs as the unprivileged `node` user** and carries a
  `HEALTHCHECK`, so `docker ps` reports real health with no compose file
  involved.

## Troubleshooting

**`docker compose build` fails on `pnpm install --frozen-lockfile`.** The
Dockerfile pins pnpm 10.29.1 to match the lockfile. If you regenerate
`pnpm-lock.yaml` with a different pnpm, bump the `corepack prepare` line in
[docker/Dockerfile](docker/Dockerfile) and the `.node` job in
[.gitlab-ci.yml](.gitlab-ci.yml) together.

**The install stage is slow or times out.** Build with
`--build-arg PNPM_REGISTRY=https://registry.npmmirror.com`, or set
`PNPM_REGISTRY` in `.env`.

**The container is healthy but the app calls the wrong backend.** You changed a
`NEXT_PUBLIC_*` value and restarted instead of rebuilding. See
[Build time vs. run time](#build-time-vs-run-time).

**ngrok exits immediately with `ERR_NGROK_4018`.** `NGROK_AUTHTOKEN` is unset or
wrong. It is read from `.env`; confirm with
`docker compose --profile tunnel config | grep NGROK`.

**The health check never passes.** `docker compose logs web`. The probe uses
`127.0.0.1`, not `localhost`, on purpose: busybox `wget` prefers `::1` but the
Next standalone server binds IPv4 only, so a `localhost` probe would never
connect and the deploy would never go green.
