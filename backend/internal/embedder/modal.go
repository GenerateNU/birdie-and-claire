package embedder

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"example_project/internal/config"
	"example_project/internal/errs"
)

const (
	embedPath     = "/embed"
	warmPath      = "/warm"
	embeddingSize = 512
	// Long enough for a cold Modal container to boot and load the model.
	requestTimeout    = 90 * time.Second
	maxErrorBodyBytes = 4 << 10
)

type modalClient struct {
	http   *http.Client
	url    string
	key    string
	secret string
}

// New returns an Embedder backed by the FashionCLIP Modal web app.
func New(cfg config.EmbedderConfig) Embedder {
	return &modalClient{
		http:   &http.Client{Timeout: requestTimeout},
		url:    cfg.URL,
		key:    cfg.ProxyKey,
		secret: cfg.ProxySecret,
	}
}

// Wire types match ml/embedder/app/schemas.py.
type embedInput struct {
	Kind  string `json:"kind"`
	Value string `json:"value"`
}

type embedRequest struct {
	Inputs []embedInput `json:"inputs"`
}

type embedResponse struct {
	Embeddings [][]float32 `json:"embeddings"`
}

func (c *modalClient) EmbedText(ctx context.Context, text string) ([]float32, error) {
	if strings.TrimSpace(text) == "" {
		return nil, fmt.Errorf("embedder: empty text: %w", errs.ErrInvalidInput)
	}
	return c.embed(ctx, embedInput{Kind: "text", Value: text})
}

// EmbedImage passes the URL through untouched. Modal enforces https, public
// addresses, and the size limit, and answers 422 when one fails.
func (c *modalClient) EmbedImage(ctx context.Context, imageURL string) ([]float32, error) {
	if strings.TrimSpace(imageURL) == "" {
		return nil, fmt.Errorf("embedder: empty image url: %w", errs.ErrInvalidInput)
	}
	return c.embed(ctx, embedInput{Kind: "image_url", Value: imageURL})
}

func (c *modalClient) embed(ctx context.Context, input embedInput) ([]float32, error) {
	body, err := json.Marshal(embedRequest{Inputs: []embedInput{input}})
	if err != nil {
		return nil, fmt.Errorf("embedder: encode request: %w", err)
	}

	req, err := c.newRequest(ctx, http.MethodPost, embedPath, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("embedder: request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, statusError(resp)
	}

	var decoded embedResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, fmt.Errorf("embedder: decode response: %w", err)
	}
	if len(decoded.Embeddings) != 1 {
		return nil, fmt.Errorf("embedder: expected 1 vector, got %d", len(decoded.Embeddings))
	}
	vector := decoded.Embeddings[0]
	if len(vector) != embeddingSize {
		return nil, fmt.Errorf("embedder: expected %d dimensions, got %d", embeddingSize, len(vector))
	}
	return vector, nil
}

func (c *modalClient) Warm(ctx context.Context) error {
	req, err := c.newRequest(ctx, http.MethodGet, warmPath, nil)
	if err != nil {
		return err
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("embedder: warm: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusNoContent {
		return statusError(resp)
	}
	return nil
}

// newRequest sets the proxy-auth headers every Modal endpoint requires.
func (c *modalClient) newRequest(ctx context.Context, method, path string, body io.Reader) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, method, c.url+path, body)
	if err != nil {
		return nil, fmt.Errorf("embedder: build request: %w", err)
	}
	req.Header.Set("Modal-Key", c.key)
	req.Header.Set("Modal-Secret", c.secret)
	return req, nil
}

// statusError keeps Modal's body in the message because its 422 detail names
// the rejected input.
func statusError(resp *http.Response) error {
	detail, err := io.ReadAll(io.LimitReader(resp.Body, maxErrorBodyBytes))
	if err != nil {
		return fmt.Errorf("embedder: %s: read body: %w", resp.Status, err)
	}
	detail = bytes.TrimSpace(detail)

	if resp.StatusCode == http.StatusUnprocessableEntity {
		return fmt.Errorf("embedder: %s: %s: %w", resp.Status, detail, errs.ErrInvalidInput)
	}
	return fmt.Errorf("embedder: %s: %s", resp.Status, detail)
}
