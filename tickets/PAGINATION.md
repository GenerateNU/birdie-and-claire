# Cursor Pagination

Define the pagination pattern once so every list endpoint that follows uses the
same types, the same response shape, and the same query convention. Apply it to
the existing characters endpoint as the worked example.

---

## How it works

Fetch one more row than the requested limit. If that extra row exists, there is a
next page and the ID of the last real row becomes the cursor. The next request
passes that cursor back, and the query filters to rows whose ID is greater than it.

```
Request:  GET /api/v1/characters?faction=rebel&limit=5
Response: { items: [...5 chars], next_cursor: "42", has_more: true }

Request:  GET /api/v1/characters?faction=rebel&limit=5&cursor=42
Response: { items: [...3 chars], next_cursor: null, has_more: false }
```

---

## 1. Shared types — `internal/types/params.go`

Add to the existing file:

- `CursorParams` — `Cursor *string` (optional, absent on the first page) and
  `Limit int` (default 20, cap at 100)
- `PaginatedResponse[T any]` — `Items []T`, `NextCursor *string`, `HasMore bool`

---

## 2. `Paginate` helper — `internal/types/params.go`

```go
func Paginate[T any](items []T, limit int) (page []T, hasMore bool)
```

Takes the `limit + 1` rows fetched from the DB. Returns the trimmed slice and
whether a next page exists. The caller is responsible for extracting the cursor
value from the last item in `page` — this helper only handles the count logic.

---

## 3. Repository — `internal/repository/character.go`

Update `FindByFaction` to accept `types.CursorParams` alongside the faction.

The query already orders by `id`. Add a conditional clause: when a cursor is
present, filter to rows whose `id` is greater than it. Fetch `limit + 1` rows.

---

## 4. Service — `internal/services/character.go`

Update `ListByFaction` to accept and pass through `types.CursorParams`.

After calling the repository, use `Paginate` to trim the rows and determine
`HasMore`. Extract `NextCursor` from the last item in the returned page.

Return a `types.PaginatedResponse[models.CharacterResponse]` instead of a plain
slice.

---

## 5. Controller and router — `internal/controllers/character.go`

Add `Cursor` and `Limit` to `ListCharactersInput`. Huma reads them from the query
string automatically via struct tags — follow the pattern of the existing `Faction`
field.

Update `ListCharactersOutput` to wrap the paginated response body.

No changes needed in `internal/server/routers/character.go`.

---

## 6. Frontend — `usePagination` hook

Create a hook that manages cursor state for any list endpoint:

- Holds the current list of items and the next cursor
- Exposes a `loadMore` function that fetches the next page and appends results
- Exposes `hasMore` so the UI knows whether to show a load more button
- Resets state when any input changes (e.g. faction changes, start fresh)

Wire it into the existing characters UI as the worked example.

---

## Definition of done

- `GET /api/v1/characters?faction=rebel&limit=2` returns 2 items with
  `has_more: true` and a non-null `next_cursor`
- Passing that cursor in the next request returns the next page
- When no more pages exist, `has_more` is false and `next_cursor` is null
- The frontend load more button appends results rather than replacing them
