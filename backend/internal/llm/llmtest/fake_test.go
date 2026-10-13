package llmtest

import (
	"context"
	"errors"
	"io"
	"sync"
	"testing"

	"birdie-and-claire/internal/llm"
)

type idea struct {
	Occasion string `json:"occasion"`
}

func TestFakeIsSafeForConcurrentUse(t *testing.T) {
	fake := &Fake{Text: `{"occasion":"brunch"}`, Chunks: []string{"a", "b"}}

	var wg sync.WaitGroup
	for range 16 {
		wg.Go(func() {
			got, err := llm.Generate[idea](context.Background(), fake, llm.Request{Prompt: "brunch"})
			if err != nil || got.Occasion != "brunch" {
				t.Errorf("Generate = %+v, %v", got, err)
			}

			reader, err := fake.GenerateStream(context.Background(), llm.Request{Prompt: "brunch"})
			if err != nil {
				t.Errorf("GenerateStream: %v", err)
				return
			}
			defer func() { _ = reader.Close() }()
			if err := drain(reader); err != nil || reader.Response().Text != "ab" {
				t.Errorf("stream ended with %v and response %q", err, reader.Response().Text)
			}
			_ = fake.Requests()
		})
	}
	wg.Wait()

	if got := len(fake.Requests()); got != 32 {
		t.Errorf("recorded %d requests, want 32", got)
	}
}

func drain(reader llm.ChunkReader) error {
	for {
		if _, err := reader.Next(); err != nil {
			if errors.Is(err, io.EOF) {
				return nil
			}
			return err
		}
	}
}

func TestFakeStreamError(t *testing.T) {
	errUpstream := errors.New("upstream")
	fake := &Fake{Chunks: []string{"a"}, StreamErr: errUpstream}

	reader, err := fake.GenerateStream(context.Background(), llm.Request{Prompt: "hi"})
	if err != nil {
		t.Fatalf("GenerateStream: %v", err)
	}
	if chunk, err := reader.Next(); chunk != "a" || err != nil {
		t.Fatalf("first Next = %q, %v", chunk, err)
	}
	if _, err := reader.Next(); !errors.Is(err, errUpstream) {
		t.Fatalf("second Next = %v, want the stream error", err)
	}
}

func TestFakeOutputMismatch(t *testing.T) {
	fake := &Fake{Text: `{"occasion":"brunch","extra":1}`}
	if _, err := llm.Generate[idea](context.Background(), fake, llm.Request{Prompt: "hi"}); !errors.Is(err, llm.ErrInvalidOutput) {
		t.Fatalf("err = %v, want ErrInvalidOutput", err)
	}
}

func TestFakeOutputRejectsNullAndTrailingData(t *testing.T) {
	for _, text := range []string{`null`, `{"occasion":"brunch"} {"occasion":"dinner"}`, `{"occasion":"brunch"} trailing`} {
		fake := &Fake{Text: text}
		if got, err := llm.Generate[idea](context.Background(), fake, llm.Request{Prompt: "hi"}); !errors.Is(err, llm.ErrInvalidOutput) {
			t.Errorf("Text %s: got %+v, %v; want ErrInvalidOutput", text, got, err)
		}
	}
}

func TestFakeResponseIsEmptyUntilEOF(t *testing.T) {
	reader, err := (&Fake{Chunks: []string{"a", "b"}}).GenerateStream(context.Background(), llm.Request{Prompt: "hi"})
	if err != nil {
		t.Fatalf("GenerateStream: %v", err)
	}
	for range 2 {
		if _, err := reader.Next(); err != nil {
			t.Fatalf("Next: %v", err)
		}
	}
	if got := reader.Response().Text; got != "" {
		t.Errorf("Response before io.EOF = %q, want empty", got)
	}
	if _, err := reader.Next(); !errors.Is(err, io.EOF) {
		t.Fatalf("Next = %v, want io.EOF", err)
	}
	if got := reader.Response().Text; got != "ab" {
		t.Errorf("Response after io.EOF = %q, want ab", got)
	}

	failed, err := (&Fake{Chunks: []string{"a"}, StreamErr: errors.New("upstream")}).GenerateStream(context.Background(), llm.Request{Prompt: "hi"})
	if err != nil {
		t.Fatalf("GenerateStream: %v", err)
	}
	if err := drain(failed); err == nil {
		t.Fatal("expected the stream error")
	}
	if got := failed.Response().Text; got != "" {
		t.Errorf("Response after an error = %q, want empty", got)
	}
}

func TestFakeNextAfterClose(t *testing.T) {
	finished, err := (&Fake{Chunks: []string{"a"}}).GenerateStream(context.Background(), llm.Request{Prompt: "hi"})
	if err != nil {
		t.Fatalf("GenerateStream: %v", err)
	}
	if err := drain(finished); err != nil {
		t.Fatalf("drain: %v", err)
	}
	_ = finished.Close()
	if _, err := finished.Next(); !errors.Is(err, io.EOF) {
		t.Errorf("Next after a finished stream was closed = %v, want io.EOF", err)
	}

	unfinished, err := (&Fake{Chunks: []string{"a", "b"}}).GenerateStream(context.Background(), llm.Request{Prompt: "hi"})
	if err != nil {
		t.Fatalf("GenerateStream: %v", err)
	}
	if _, err := unfinished.Next(); err != nil {
		t.Fatalf("Next: %v", err)
	}
	_ = unfinished.Close()
	_, err = unfinished.Next()
	if err == nil || errors.Is(err, io.EOF) || err.Error() != "llm: stream closed before it finished" {
		t.Errorf("Next after an unfinished Close = %v, want the closed-before-finished error", err)
	}
}
