# Contributing

Install Keyflare CLI `0.1.1` with `npm install -g @keyflare/cli@0.1.1`, then
run `kfl login`. Use mise tasks from the repository root. Start with `mise run
bootstrap`, then run `mise run setup`. Your Keyflare account needs access to
`test_project` and its `dev` environment.

`.env.example` is the committed list of required variable names. It contains no
secret values.

Keyflare has two environments. `dev` holds everything the local stack needs. `prod` 
is for interacting with production database and server/web deployments.

Keyflare is confined to `backend/cmd/tasks/keyflare.go` and one `injectSecrets`
call in `main.go`. `compose.yaml` reads plain environment variables and Docker
Compose picks up a `.env` file on its own, so dropping Keyflare means deleting
that file and its call site, not editing the stack.

Before opening a change, run:

```sh
mise run api:generate
mise run fmt
mise run lint
mise run build
mise run test
```

The API uses PostgreSQL and Goose migrations. Do not change an applied
migration. 
- Create a new migration with `mise run db:dev:migrate:create -- <name>`.
- Run `mise run db:dev:migrate:up` to push migration to database.
- Run `mise run db:dev:migrate:status` to check migration status.