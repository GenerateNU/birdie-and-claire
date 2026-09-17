# Backend

Go API on Fiber v3, with Huma generating the OpenAPI 3.1 document and Scalar
docs from the handler types.

## Layout

```
cmd/
  main.go            the server
  migrate/           applies the embedded migrations
  openapi/           writes the tracked openapi.yaml
  tasks/             the mise task runner
internal/
  config/            one file per concern, the only place that reads the environment
  database/          connection, pool settings, embedded migrations
  repository/        every SQL query, one file per resource
  services/          business logic, one file per resource
  controllers/       HTTP in and out, one file per resource
  server/
    app.go           builds the Fiber app and wires the layers
    middlewares/     recovery and request logging
    routers/         path to controller, one file per resource
  models/            entities and request/response types
  errs/              sentinel errors and the mapping to HTTP
  types/             wiring structs passed into routers
  tests/             all tests, one package
```

## Adding an endpoint

A resource is five files. Copy `character.go` in each of these:

```
routers/      path, method, and operation metadata -> controller method
controllers/  input/output structs, calls the service, maps errors
services/     the logic, returns internal/errs sentinels
repository/   the SQL, plus a line in repository.go
models/       the entity and its request/response types
```

Controllers do not parse or validate. Huma does that from the struct tags on
the input type before the handler runs, and the same tags produce the OpenAPI
schema, so the documented contract and the enforced one cannot diverge.

Services return `errs.ErrNotFound` and friends, never HTTP errors, so a worker
or CLI can call the same service. Controllers end with `errs.ToHuma(err)`.

## Logging

`internal/log` is the entry point. Every function takes a context first, which
is how the request ID reaches the record; Go has no ambient per-request state.

```go
log.Info(ctx, "listed characters", "faction", faction, "count", len(characters))
log.Warn(ctx, "retrying payment", "attempt", attempt)
log.Error(ctx, "create character failed", "error", err)
```

The middleware puts the request ID on the context, so an application line and
the request line that produced it share an `id` and can be grouped:

```
INF listed characters faction=jedi count=2 id=127ed3f6
INF 200 GET /api/v1/characters id=127ed3f6
```

`LOG_FORMAT=text` (the default) renders coloured lines with a shortened ID.
`LOG_FORMAT=json` emits one object per record with the full UUID and with
`status`, `method`, and `path` as separate fields to filter on.

Log identifiers and chosen fields, not whole structs. A struct passed as a value
renders as an unreadable blob in text mode, and it silently starts logging any
field someone adds later, which is how credentials reach log storage. When a
type does need a log form, give it a `LogValue`:

```go
func (c Character) LogValue() slog.Value {
    return slog.GroupValue(slog.Int("id", c.ID), slog.String("faction", c.Faction))
}
```

## Migrations

Migrations live in `internal/database/migrations` and are embedded into the
binary, so a deployed image carries its own schema history and needs neither
the `.sql` files nor the goose binary.

```sh
mise run db:dev:migrate:create -- add_widgets
mise run db:dev:migrate:up
mise run db:dev:migrate:status
```

The server verifies at startup that every migration has been applied and
refuses to serve if not. It never applies them itself.

Do not edit a migration that has already been applied. Write a new one.

## Checks

```sh
mise run api:generate   # rewrites openapi.yaml; CI fails if it differs
mise run fmt
mise run lint
mise run test
```
