package llm

import (
	"context"
	"encoding/json"
	"fmt"
)

type Tool struct {
	name        string
	description string
	inputType   any
	call        func(ctx context.Context, input json.RawMessage) (any, error)
}

// NewTool wraps fn as a tool; fn must be goroutine-safe and return promptly once ctx is done.
func NewTool[In, Out any](name, description string, fn func(ctx context.Context, input In) (Out, error)) Tool {
	var input In
	return Tool{
		name:        name,
		description: description,
		inputType:   input,
		call: func(ctx context.Context, raw json.RawMessage) (any, error) {
			if err := ctx.Err(); err != nil {
				return nil, err
			}
			var decoded In
			if err := json.Unmarshal(raw, &decoded); err != nil {
				return nil, fmt.Errorf("decode %s input: %w", name, err)
			}
			return fn(ctx, decoded)
		},
	}
}
