# Development setup

This repository contains a Go API and a React frontend. The product name and Go
module name are temporary.

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

Run the setup flow from the repository root:

```sh
mise run bootstrap
mise run setup
mise run db:dev:start
mise run db:dev:migrate:up
mise run dev
```

Your Keyflare account needs access to the `test_project` project and its `dev`
environment.

## Development

`mise run dev` runs the frontend with Bun and the API plus PostgreSQL in
Compose. Pressing Ctrl+C stops the application containers and frontend. The
PostgreSQL volume remains in place.

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

## Checks

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
