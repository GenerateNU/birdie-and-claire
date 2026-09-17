# Auth Infrastructure

Set up the auth layer without committing to a provider. Every future endpoint gets
a consistent way to declare itself as protected and extract the current user. There
is one explicit seam — the token verification function — that gets replaced when a
provider is chosen. Nothing else in the codebase should need to change at that point.

---

## 1. `RequireAuth` middleware

Create `internal/server/middlewares/auth.go`.

Extract the bearer token from the `Authorization` header. If absent, return 401.
Pass the token through a `verifyToken` function, then inject the returned user ID
into Fiber's context locals.

`verifyToken` must be implemented as a stub for now:

```
// TODO: replace this stub when a provider is chosen.
// verifyToken should validate the token signature against the provider's public
// keys and return the stable user identifier from the claims (typically "sub").
// Until then it returns the raw token string as the user ID.
func verifyToken(token string) (string, error) { ... }
```

The stub exists so protected routes are testable today: any non-empty bearer token
resolves to a user ID, and tests can pass `Authorization: Bearer test-user-123` and
assert the handler sees `test-user-123`.

---

## 2. `UserID` context helper

In the same file, add:

```go
func UserID(c *fiber.Ctx) string
```

Reads the injected user ID from Fiber's locals. If called outside a protected route
it should panic — that is a programmer error, not a user error.

This is the only function the rest of the codebase calls. When real validation lands,
only `verifyToken` changes — every caller of `UserID` stays the same.

---

## 3. Protected route group

Fiber's `app.Use(path, middleware)` applies a middleware to every route registered
under a path prefix. Use this to protect a route prefix without decorating each
handler individually.

Wire it in `internal/server/middlewares/middlewares.go` or `internal/server/app.go`.
Health routes must remain public. Decide which prefix protected routes will live
under and apply `RequireAuth` there.

Register a placeholder protected route (a minimal `GET` that returns the injected
user ID) so the wiring is exercised end to end before the ticket is closed.

---

## 4. Frontend — auth context

Create an auth context that exposes the current token to the rest of the app.

For now the token is read from a `VITE_DEV_TOKEN` environment variable. Leave a
comment at the token source:

```
// TODO: replace with provider SDK when a provider is chosen.
```

The context is the only place in the frontend that knows where the token comes from.
Everything else reads from it.

---

## 5. Frontend — API client

Create a thin fetch wrapper that reads the token from the auth context and injects
`Authorization: Bearer <token>` on every request. All API calls in the app go
through this client — never raw `fetch`.

---

## Deferred

The following are explicitly out of scope until a provider is chosen:

- JWT signature validation (JWKS fetch, RS256 / ES256 verification)
- Claims extraction — mapping token fields to user attributes (email, name, roles)
- Login and logout UI
- Provider SDK integration
- Token refresh and session lifecycle

---

## Definition of done

- A request with no `Authorization` header to a protected route returns 401
- A request with `Authorization: Bearer anything` reaches the handler and
  `UserID(c)` returns `"anything"`
- Public routes (health check) are unaffected
- The frontend API client attaches the token from the auth context on every call
