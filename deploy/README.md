# Deployment

The backend runs on the DigitalOcean droplet shared with inspirate-consulting.
The frontend runs on Vercel. Production data and auth stay in Supabase.

```
GitHub Release published
   |
   v
deploy-production.yml        waits for TL approval (production environment)
   |  build image (server + migrate) -> ghcr.io/.../backend:<sha>
   |  keyflare prod -> backend.env   (go run ./cmd/tasks deploy env production)
   |  droplet: /migrate up against Supabase, then docker compose up -d
   |  poll https://<API_DOMAIN>/health
   |  vercel build --prod, vercel deploy --prebuilt --prod
   v
live

PR opened or pushed                      PR closed
   |                                        |
   v                                        v
preview.yml                              preview-cleanup.yml
   image :pr-<n>-<sha>                      remove container
   keyflare prod -> preview.env             DROP DATABASE pr_<n>
   CREATE DATABASE pr_<n>, migrate, seed
   run at https://pr-<n>.<PREVIEW_DOMAIN>
   vercel build with /api -> pr-<n>, vercel deploy --prebuilt
```

Vercel's Git integration deploys nothing: `frontend/vercel.json` turns off Git
deployments for every branch, so merging to `main` deploys nothing. The only
frontend deploys are the two workflows above. A preview frontend is built from
the PR's commit with its `/api` proxy rewritten to that PR's backend, so it never
talks to production's API.

```
droplet
├── /opt/shared               caddy + preview-db, one per droplet
├── /opt/birdie-and-claire    docker-compose.yml, backend.env, preview.env,
│                             previews/pr-<n>.env
├── birdie-and-claire-backend       -> <API_DOMAIN>
└── birdie-and-claire-pr-<n>        -> pr-<n>.<PREVIEW_DOMAIN>
```

## What previews share with production

A preview gets its own database and nothing else. It reads the Keyflare `prod`
environment, so it verifies tokens against production Supabase, writes uploads
to the production storage bucket, and calls the production embedder. Do not
exercise destructive flows on a preview.

A production login works on a preview, but the preview database starts with
no users, so you create the app account again there. It does start with the demo
products from `backend/cmd/tasks/seeds/products.sql`: every push seeds them
when the `products` table is empty. The database survives re-pushes and
is dropped when the PR closes. Migrations run against it on every push; if you
edit a migration that already ran, or main brings in an older-timestamped one,
close and reopen the PR to start from a fresh database. Uploads from a preview
stay in the bucket after the PR closes.

## One-time setup

### 1. Shared stack: switch the preview database to pgvector

Our migrations run `CREATE EXTENSION vector`, which the `postgres:17-alpine`
image in inspirate's `deploy/shared` does not have. `deploy/shared` here is
their file with the image swapped for `pgvector/pgvector:pg17`.

The droplet runs one copy of this stack, so agree the change with whoever owns
the droplet before applying it. The new image is Debian-based, and the old
volume was initialised under Alpine, so recreate the volume instead of reusing
it. That wipes every open preview database, ours and theirs. The previews come
back on their next push.

This replaces only the preview database, so Caddy and every production
backend keep serving. Run it from the repo root on your machine:

```sh
scp deploy/shared/docker-compose.yml deploy@<droplet>:/opt/shared/docker-compose.yml
ssh deploy@<droplet> 'cd /opt/shared && docker compose rm -sf preview-db \
  && docker volume rm shared_preview_db_data && docker compose up -d preview-db'
```

`.env` there needs `ACME_EMAIL` and `PREVIEW_DB_PASSWORD` (see
`deploy/shared/.env.example`). Preview scripts read the password from that
file, so it never leaves the droplet.

### 2. DNS

| Record | Points at |
| --- | --- |
| `<API_DOMAIN>` | droplet IP |
| `*.<PREVIEW_DOMAIN>` | droplet IP |

Use a preview domain of our own, not inspirate's, or `pr-12` would collide.
Caddy issues a certificate per hostname once the name resolves.

### 3. Keyflare system key for CI

CI uses a read-only key scoped to the prod environment, not a personal
`kfl_user_*` key, which has admin rights over every project:

```sh
kfl keys create --type system --label birdie-and-claire-ci \
  --scope test_project:prod --permission read
```

The prod environment must hold `DB_HOST`, `DB_PORT`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME` (Supabase's session pooler, port 5432), the backend
variables listed in `backend/cmd/tasks/deploy.go`, and `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` for the frontend build.

Storage is Supabase Storage through its S3-compatible API. Set `S3_ENDPOINT`
and `S3_PUBLIC_ENDPOINT` to
`https://<project-ref>.storage.supabase.co/storage/v1/s3`, `S3_PUBLIC_URL` to
`https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>`, and
`S3_REGION` to the project's region. The access keys come from Supabase,
Project Settings, Storage, S3 Access Keys. The bucket must be public so profile
pictures load without a signed URL. `.env.example` explains each variable.

### 4. Vercel

Import `GenerateNU/birdie-and-claire` as a new project with **Root Directory**
set to `frontend`. `frontend/vercel.json` sets the build, the `/api` proxy, the
SPA fallback, and turns off Git deployments. Both production and preview
frontends build in GitHub Actions and read `VITE_SUPABASE_*` from Keyflare, so
the Vercel project needs no environment variables.

Under Settings, Deployment Protection, turn off Vercel Authentication if
reviewers without a Vercel account need to open previews.

The production `/api` proxy target is written into `vercel.json`. If
`API_DOMAIN` changes, change it there too. `preview.yml` rewrites it per PR.

### 5. Storage CORS

Browsers upload straight to the bucket with presigned URLs, so storage must
accept a cross-origin `PUT` from the production site and from
`https://<project>-*-<team>.vercel.app`, which covers Vercel's preview URLs.
Supabase Storage already allows this: its S3 endpoint answers preflights with
`Access-Control-Allow-Origin: *` and allows `PUT`, so there is nothing to set.

### 6. GitHub

Secrets:

| Secret | Value |
| --- | --- |
| `DROPLET_SSH_KEY` | the CI deploy key for the droplet's `deploy` user |
| `DROPLET_SSH_KNOWN_HOSTS` | `ssh-keyscan -t ed25519 <droplet-ip>` |
| `KEYFLARE_API_KEY` | the system key from step 3 |
| `KEYFLARE_API_URL` | the Keyflare server URL |
| `VERCEL_TOKEN` | Vercel, Account Settings, Tokens |

Variables:

| Variable | Value |
| --- | --- |
| `DROPLET_HOST` | droplet IP |
| `DROPLET_USER` | `deploy` |
| `API_DOMAIN` | the production API hostname from step 2 |
| `PREVIEW_DOMAIN` | the preview wildcard's parent from step 2 |
| `VERCEL_ORG_ID` | Vercel, team Settings, General, Team ID |
| `VERCEL_PROJECT_ID` | Vercel, project Settings, General, Project ID |
| `PUBLIC_FRONTEND_URL` | the production site URL |

The preview workflows do nothing until `DROPLET_HOST` is set.

Then under Settings, Environments, create `production` with the TLs as required
reviewers. Every release waits there, and so does every migration.

The droplet must be able to pull from GHCR. It already is if inspirate's
`docker login ghcr.io` token can read GenerateNU packages. Otherwise log in
again as the `deploy` user with a `read:packages` token.

## Day to day

### Ship

`gh release create v1.2.0 --generate-notes`, then approve the run.
Migrations apply before the new container starts. If they fail, the old
container keeps serving.

### Roll back

Actions, Deploy production, Run workflow, with an earlier tag.
That rolls back code only. The startup check only looks for pending
migrations, so older code starts against a newer schema, and it works as long
as each migration is safe for the version before it. Undo a schema change with
a new forward migration.

### Inspect a preview database

```sh
ssh deploy@<droplet> 'docker exec -it preview-db psql -U postgres -d pr_123'
```

### Clean up an orphaned preview

```sh
ssh deploy@<droplet> bash -s -- 123 < deploy/preview-down.sh
```

## Troubleshooting

**"Wait for the backend to be healthy" fails.** Run
`docker logs birdie-and-claire-backend` on the droplet. The backend exits at
startup on any missing variable, and names it.

**"Migrate and deploy" fails on `/migrate up`.** Check that `DB_PORT` in
Keyflare prod is 5432. The transaction pooler on 6543 cannot hold goose's
advisory lock.

**Preview fails with `extension "vector" is not available`.** The shared
preview database is still on `postgres:17-alpine`. See step 1.

**API calls 404 on Vercel but the API is up.** Check that the `/api/:path*`
rewrite in `frontend/vercel.json` points at the current `API_DOMAIN`.

**A push to `main` published the frontend.** Check that `git.deploymentEnabled`
in `frontend/vercel.json` still sets `main` to false.
