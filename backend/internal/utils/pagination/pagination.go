// Package pagination provides cursor-based pagination for list endpoints.
// A cursor is the last row's sort-column values, JSON then base64 encoded.
package pagination

import (
	"bytes"
	"encoding/base64"
	"encoding/json"

	"example_project/internal/errs"

	"github.com/danielgtaylor/huma/v2"
)

// Params is embedded in a controller's input struct, validated before the handler runs.
type Params struct {
	Limit  int    `query:"limit" default:"20" minimum:"1" maximum:"100" doc:"Max items to return"`
	Cursor string `query:"cursor" doc:"Opaque cursor from a previous page's next_cursor"`

	after Fields
}

var _ huma.Resolver = (*Params)(nil)

// Resolve decodes the cursor at the boundary, so no layer below sees the raw value.
func (p *Params) Resolve(huma.Context) []error {
	after, err := Decode(p.Cursor)
	if err != nil {
		return []error{huma.Error400BadRequest(err.Error())}
	}
	p.after = after
	return nil
}

// After returns the sort-column values this page starts after; empty on the first page.
func (p *Params) After() Fields {
	return p.after
}

// Page is the response wrapper every list endpoint returns.
type Page[T any] struct {
	Items      []T     `json:"items"`
	NextCursor *string `json:"next_cursor"`
	HasMore    bool    `json:"has_more"`
}

// Fields is a cursor's sort-column values, keyed by column name. Empty means first page.
type Fields map[string]any

// Decode reads a cursor's sort-column values. An empty string is the first page.
func Decode(cursor string) (Fields, error) {
	if cursor == "" {
		return Fields{}, nil
	}
	raw, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return nil, errs.ErrBadCursor
	}

	decoder := json.NewDecoder(bytes.NewReader(raw))
	// float64 rounds past 2^53; ids are BIGSERIAL and must round-trip exactly.
	decoder.UseNumber()

	var fields Fields
	if err := decoder.Decode(&fields); err != nil {
		return nil, errs.ErrBadCursor
	}
	// "null" and "{}" decode cleanly but name no column, so neither is a first page.
	if len(fields) == 0 {
		return nil, errs.ErrBadCursor
	}
	return fields, nil
}

// Encode turns a page's last row into the opaque cursor for the next one.
func (f Fields) Encode() (string, error) {
	raw, err := json.Marshal(f)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

// Int64 returns key's value as a nullable SQL parameter, nil on the first page.
func (f Fields) Int64(key string) (*int64, error) {
	if len(f) == 0 {
		return nil, nil
	}
	raw, present := f[key]
	if !present {
		return nil, errs.ErrBadCursor
	}
	number, isNumber := raw.(json.Number)
	if !isNumber {
		return nil, errs.ErrBadCursor
	}
	value, err := number.Int64()
	if err != nil {
		return nil, errs.ErrBadCursor
	}
	return &value, nil
}

// Split trims the limit+1 rows a repository fetched into a page plus hasMore.
func Split[T any](rows []T, limit int) ([]T, bool) {
	if len(rows) > limit {
		return rows[:limit], true
	}
	return rows, false
}
