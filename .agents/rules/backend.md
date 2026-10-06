---
paths:
  - "backend/**"
---

# Backend conventions

Go-specific rules for `backend/`, on top of the root `AGENTS.md`. Each rule
here is something that keeps getting flagged in review. Treat a violation as a
review finding, not a preference.

When a rule names an example file, copy that file's shape.

## Structure

- No `var _ Interface = (*impl)(nil)` when a constructor returns the interface.
  `NewFooRepository(...) FooRepository` already fails to compile if `fooRepository`
  stops satisfying it. Keep the assertion only for types with no constructor,
  such as huma `Resolver` inputs, where it is the only compile-time check.
- A pattern existing elsewhere in the repo is not a reason to add it. If it
  breaks a rule here, the old code is wrong, not the rule.
- A query belongs in the repository for the table it reads. A `products` query
  goes in `repository/product.go`, not `repository/product_image.go`.
- Delete types, fields, and functions nothing uses.

## SQL

- If SQL can do it, do it in SQL: filtering, counting, sorting, defaults for
  nulls, returning the changed row. Postgres has had decades of optimization,
  and a mediocre query still beats the Go you would write to post-process rows.
- Scan straight into the target with `.Scan(&target.Field)`. No temporary
  variables that get copied over afterward. If a value needs reshaping first,
  reshape it in the query.
- End every `ORDER BY` with a unique column, usually `id`:
  `ORDER BY position, id`, not `ORDER BY position`. When two rows tie on
  `position`, Postgres can return them in any order, and the order can change
  between identical requests as the table changes. The frontend then sees items
  shuffle, and cursor pagination can skip or repeat rows at a page boundary.
- Watch for drift. Any Go value that mirrors the schema, such as a
  `const columns = "..."` string or a column name held in a variable, goes
  stale silently when a migration changes the table. Write column lists inline
  in the query that uses them, next to the `Scan` they have to match.
- Every foreign key states its `ON DELETE` behavior (`CASCADE`, `SET NULL`, or
  `RESTRICT`), so deleting a parent row doesn't leave orphans behind or fail
  with an error nobody planned for.

## Errors

- Copy the error style in `repository/user.go`: `sql.ErrNoRows` becomes
  `errs.ErrNotFound`, and everything else is wrapped as
  `fmt.Errorf("<verb> <noun> %s: %w", id, err)`.
- A failure that means our own system broke, such as a missing auth context,
  is a 500. Return a wrapped error, not a sentinel that maps to a 4xx.

## Validation

- Use huma struct tags for anything huma can check: `enum:"like,dislike,save"`,
  `required:"true"`, `minimum`, `maxLength`. See `controllers/user.go:38`. Do not
  repeat that check in the service.

## Naming

- Name response types for where they sit in the request flow:
  `UserResponse`, `AvatarUploadResponse`. Not `UserView` (sounds like a
  database view) or a bare `AvatarUpload`.
- Functions are verbs: `CreateAvatarUploadURL`, not `AvatarUploadURL`.
- Name things specifically enough to survive a second one existing:
  `ObjectStore`, not `Store`.
- No single-letter names outside receivers and loop indexes.
- One domain term per concept. Do not mix `avatar` and `profile_picture` for
  the same thing.

## Comments

- Comments that restate the code are the most common review finding here.
  Before adding one, check whether the name or the code already says it.
- A comment that names something must name something that exists. Update or
  delete comments when the code they describe moves.

## Logging

- Routine success logs are `log.Debug`. `Info` costs money in cloud log storage
  and buries the warnings and errors people search for.

## Before you open a PR

- Merge `main` into your branch and resolve conflicts.
- Create migrations with `mise run db:dev:migrate:create` after merging main,
  so the timestamp sorts after everything already on main. Never add a
  migration for a table main already creates.
- Run `mise run api:generate` if you touched routes or request/response types.
  CI fails if `backend/openapi.yaml` is stale.
- New env vars go in `.env.example` with blank values. Put the real values in
  keyflare with `kfl`.
