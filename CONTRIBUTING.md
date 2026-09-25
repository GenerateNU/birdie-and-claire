# Contributing

This repository contains a Go API and a React frontend. The Go module name
(`example_project`) is temporary.

The API is Fiber v3 with Huma generating OpenAPI 3.1 and Scalar docs from the
handler types. See `backend/README.md` for the backend layout and how to add an
endpoint.

## Prerequisites

- Docker Desktop, running with Linux containers
- mise
- Git
- PowerShell 7 on Windows
- Node 20+ and Keyflare CLI `0.1.1`, for the Keyflare install below

Install Keyflare outside the repository:

```sh
npm install -g @keyflare/cli@0.1.1
kfl login
```

Your Keyflare account needs access to the `test_project` project and its `dev`
environment.

## Setup

Run the setup flow from the repository root:

```sh
mise run bootstrap
mise run setup
mise run db:dev:start
mise run db:dev:migrate:up
mise run dev
```

## Secrets

`.env.example` is the committed list of required variable names. It contains no
secret values.

Keyflare has two environments. `dev` holds everything the local stack needs.
`prod` is for interacting with the production database and server/web
deployments.

Keyflare is confined to `backend/cmd/tasks/keyflare.go` and one `injectSecrets`
call in `main.go`. `compose.yaml` reads plain environment variables and Docker
Compose picks up a `.env` file on its own, so dropping Keyflare means deleting
that file and its call site, not editing the stack.

## Development

`mise run dev` runs the frontend with Bun and the API plus PostgreSQL in
Compose. It starts PostgreSQL only if it is not already running, so a database
left over from an earlier task is reused. Ctrl+C stops the frontend and removes
the API container. PostgreSQL keeps running; stop it with
`mise run db:dev:stop`.

Run only one part when needed:

```sh
mise run backend
mise run frontend
```

The API is available at `http://localhost:8080`. Scalar API docs are at
`http://localhost:8080/docs`.

## Database

```sh
mise run db:dev:start
mise run db:dev:migrate:create -- add_widgets
mise run db:dev:migrate:up
mise run db:dev:migrate:down
mise run db:dev:migrate:status
mise run db:dev:reset
mise run db:dev:stop
```

Migrations live in `backend/internal/database/migrations` and are embedded into
the binary. The server checks at startup that they have all been applied and
refuses to start otherwise; it never applies them itself.

Do not edit a migration that has already been applied. Create a new migration
instead. `db:dev:reset` deletes the local PostgreSQL volume and recreates the
seed data.

## Supabase

Supabase hosts the production database and issues auth tokens. Application
development runs against the local PostgreSQL above; only migrations are pushed
to Supabase.

```sh
mise run db:prod:migrate:status
mise run db:prod:migrate:up
mise run db:prod:migrate:down
```

These run the same embedded migrations as the development tasks, from the host
rather than inside the API container. Both environments describe the database
with the same `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`; the
prod task assembles a connection string from them and escapes the password.

In prod, `DB_PORT` must be 5432, the session-mode pooler. The transaction pooler
on 6543 gives each statement a different backend, which strands the session
advisory lock Goose takes. Locally `DB_PORT` only picks which host port the
container publishes on, since the API always reaches PostgreSQL on 5432 inside
the Compose network.

The API reads `SUPABASE_URL` in every environment, including local development,
so token verification talks to the real project while the data stays local. To
check that a machine can reach it:

```sh
curl localhost:8080/health/supabase
```

That fetches the project's public JWKS document and returns it. A 502 carries
the underlying DNS, TLS, or HTTP error. It is separate from `/health`, which
never reports on a dependency. Note the JWKS path is
`/auth/v1/.well-known/jwks.json`; the shorter `/auth/v1/jwks` sits behind the
API gateway and answers 401.

The frontend reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, which Vite
substitutes at build time; `src/supabase/client.ts` is the only place that calls
`createClient`.

`users.id` holds the `sub` claim from a Supabase access token. There is no
foreign key to `auth.users`, because that schema exists only in the Supabase
project and migrations have to apply locally too. Nothing at the database level
enforces that a row matches a real Supabase account, or removes it when one is
deleted, so the application is the only thing keeping the table honest.

`repository.User.EnsureExists` writes the row and has no caller yet. The id it
takes must come from a token that has already been verified, never from a
request body or a path parameter.

Project settings (auth providers, redirect URLs, JWT expiry) are managed in the
Supabase dashboard, not in this repository.

## AWS emulator

Floci is independent of the application stack:

```sh
mise run floci:start
mise run floci:status
mise run floci:stop
mise run floci:reset
```

Floci listens on `http://localhost:4566` and is not stopped by the backend or
combined development task.

## Before opening a change

```sh
mise run api:generate
mise run fmt
mise run lint
mise run build
mise run test
```

The OpenAPI YAML is generated manually at `backend/openapi.yaml`. It is not
regenerated during Air reloads, and CI fails if the committed file differs from
what the code produces.

Fill in `.github/pull_request_template.md` when you open a pull request.
