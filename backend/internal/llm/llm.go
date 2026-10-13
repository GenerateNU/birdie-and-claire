// Package llm is the one place the backend talks to a language model.
package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"reflect"
	"strings"
)

// Client is safe for concurrent use; a slow call blocks only its own caller.
type Client interface {
	Generate(ctx context.Context, req Request) (Response, error)

	// GenerateStream returns the answer as text chunks; the caller must Close the reader.
	GenerateStream(ctx context.Context, req Request) (ChunkReader, error)
}

type Request struct {
	System string
	Prompt string
	Tools  []Tool

	outputType any
}

type Response struct {
	Text string
}

// ChunkReader reads the model only inside Next, so a caller that stops reading must Close it.
type ChunkReader interface {
	// Next returns io.EOF once the answer is complete.
	Next() (string, error)
	// Response is valid after Next has returned io.EOF.
	Response() Response
	Close() error
}

var (
	// ErrInvalidOutput also covers an answer that ended before it was complete.
	ErrInvalidOutput = errors.New("llm: output does not match schema")
	ErrToolFailed    = errors.New("llm: tool failed")
)

// Generate requires every field of T without omitempty; a mismatch is ErrInvalidOutput, never a partial T.
func Generate[T any](ctx context.Context, client Client, req Request) (T, error) {
	var output T
	req.outputType = output

	resp, err := client.Generate(ctx, req)
	if err != nil {
		return output, err
	}
	return decodeOutput[T](resp.Text)
}

func decodeOutput[T any](text string) (T, error) {
	var zero, output T
	decoder := json.NewDecoder(strings.NewReader(text))
	var raw json.RawMessage
	if err := decoder.Decode(&raw); err != nil {
		return zero, fmt.Errorf("%w: decode %s: %w", ErrInvalidOutput, reflect.TypeFor[T](), err)
	}
	if _, err := decoder.Token(); !errors.Is(err, io.EOF) {
		return zero, fmt.Errorf("%w: trailing data after the %s value", ErrInvalidOutput, reflect.TypeFor[T]())
	}
	// json.Unmarshal accepts null as the zero value, which would be a partial T
	if string(raw) == "null" {
		return zero, fmt.Errorf("%w: null instead of a %s", ErrInvalidOutput, reflect.TypeFor[T]())
	}

	strict := json.NewDecoder(bytes.NewReader(raw))
	// a real adapter rejects unknown fields through the schema; this does it for a fake
	strict.DisallowUnknownFields()
	if err := strict.Decode(&output); err != nil {
		return zero, fmt.Errorf("%w: decode %s: %w", ErrInvalidOutput, reflect.TypeFor[T](), err)
	}
	return output, nil
}
