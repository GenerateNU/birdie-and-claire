// Package llmtest provides a fake llm.Client that imports no Genkit and never touches the network.
package llmtest

import (
	"context"
	"errors"
	"io"
	"slices"
	"strings"
	"sync"

	"birdie-and-claire/internal/llm"
)

// Fake is safe for concurrent use once its fields are set; it only decodes and does not validate the schema.
type Fake struct {
	Text string
	// Chunks joined are the stream's final response.
	Chunks []string
	Err    error
	// StreamErr replaces io.EOF after the last chunk.
	StreamErr error

	mu       sync.Mutex
	requests []llm.Request
}

func (f *Fake) Generate(ctx context.Context, req llm.Request) (llm.Response, error) {
	f.record(req)
	if err := ctx.Err(); err != nil {
		return llm.Response{}, err
	}
	if f.Err != nil {
		return llm.Response{}, f.Err
	}
	return llm.Response{Text: f.Text}, nil
}

func (f *Fake) GenerateStream(ctx context.Context, req llm.Request) (llm.ChunkReader, error) {
	f.record(req)
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if f.Err != nil {
		return nil, f.Err
	}
	return &chunkReader{ctx: ctx, chunks: f.Chunks, end: f.StreamErr}, nil
}

func (f *Fake) Requests() []llm.Request {
	f.mu.Lock()
	defer f.mu.Unlock()
	return slices.Clone(f.requests)
}

func (f *Fake) record(req llm.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.requests = append(f.requests, req)
}

type chunkReader struct {
	ctx    context.Context
	chunks []string
	end    error
	sent   int

	finished bool
	err      error
}

func (r *chunkReader) Next() (string, error) {
	if r.finished {
		return "", r.err
	}
	if err := r.ctx.Err(); err != nil {
		r.finish(err)
		return "", err
	}
	if r.sent < len(r.chunks) {
		r.sent++
		return r.chunks[r.sent-1], nil
	}
	if r.end != nil {
		r.finish(r.end)
	} else {
		r.finish(io.EOF)
	}
	return "", r.err
}

func (r *chunkReader) Response() llm.Response {
	if !r.finished || !errors.Is(r.err, io.EOF) {
		return llm.Response{}
	}
	return llm.Response{Text: strings.Join(r.chunks, "")}
}

// Close mirrors the real reader: a finished stream keeps its result, an unfinished one fails.
func (r *chunkReader) Close() error {
	if !r.finished {
		r.finish(errors.New("llm: stream closed before it finished"))
	}
	return nil
}

func (r *chunkReader) finish(err error) {
	r.finished = true
	r.err = err
}
