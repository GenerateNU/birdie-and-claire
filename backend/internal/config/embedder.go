package config

import (
	"fmt"
	"net/url"
	"os"
	"strings"
)

type EmbedderConfig struct {
	URL         string
	ProxyKey    string
	ProxySecret string
}

// loadEmbedder rejects anything after the host because the client appends
// /embed to the URL: a pasted endpoint would request /embed/embed, and a query
// or fragment would swallow the path.
func loadEmbedder() (EmbedderConfig, error) {
	raw := strings.TrimSuffix(os.Getenv("EMBEDDER_URL"), "/")
	if raw == "" {
		return EmbedderConfig{}, fmt.Errorf("EMBEDDER_URL is required")
	}

	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" || raw != "https://"+parsed.Host {
		return EmbedderConfig{}, fmt.Errorf("EMBEDDER_URL must be https://<host> with nothing after the host, got %q", raw)
	}

	key := os.Getenv("MODAL_PROXY_KEY")
	if key == "" {
		return EmbedderConfig{}, fmt.Errorf("MODAL_PROXY_KEY is required")
	}

	secret := os.Getenv("MODAL_PROXY_SECRET")
	if secret == "" {
		return EmbedderConfig{}, fmt.Errorf("MODAL_PROXY_SECRET is required")
	}

	return EmbedderConfig{URL: raw, ProxyKey: key, ProxySecret: secret}, nil
}
