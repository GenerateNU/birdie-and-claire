package config

import "testing"

type embedderCase struct {
	name       string
	envVars    map[string]string
	wantErrMsg string
	wantURL    string
}

var embedderEnvKeys = []string{"EMBEDDER_URL", "MODAL_PROXY_KEY", "MODAL_PROXY_SECRET"}

func TestLoadEmbedder(t *testing.T) {
	tests := []embedderCase{
		{
			name: "valid config",
			envVars: map[string]string{
				"EMBEDDER_URL":       "https://workspace--embedder.modal.run",
				"MODAL_PROXY_KEY":    "wk-key",
				"MODAL_PROXY_SECRET": "ws-secret",
			},
			wantURL: "https://workspace--embedder.modal.run",
		},
		{
			name: "trailing slash is trimmed",
			envVars: map[string]string{
				"EMBEDDER_URL":       "https://workspace--embedder.modal.run/",
				"MODAL_PROXY_KEY":    "wk-key",
				"MODAL_PROXY_SECRET": "ws-secret",
			},
			wantURL: "https://workspace--embedder.modal.run",
		},
		{
			name: "missing url fails",
			envVars: map[string]string{
				"MODAL_PROXY_KEY":    "wk-key",
				"MODAL_PROXY_SECRET": "ws-secret",
			},
			wantErrMsg: "EMBEDDER_URL is required",
		},
		{
			name: "http url fails",
			envVars: map[string]string{
				"EMBEDDER_URL":       "http://workspace--embedder.modal.run",
				"MODAL_PROXY_KEY":    "wk-key",
				"MODAL_PROXY_SECRET": "ws-secret",
			},
			wantErrMsg: "EMBEDDER_URL must be https://<host>",
		},
		{
			name: "url without scheme fails",
			envVars: map[string]string{
				"EMBEDDER_URL":       "workspace--embedder.modal.run",
				"MODAL_PROXY_KEY":    "wk-key",
				"MODAL_PROXY_SECRET": "ws-secret",
			},
			wantErrMsg: "EMBEDDER_URL must be https://<host>",
		},
		{
			name: "url with path fails",
			envVars: map[string]string{
				"EMBEDDER_URL":       "https://workspace--embedder.modal.run/embed",
				"MODAL_PROXY_KEY":    "wk-key",
				"MODAL_PROXY_SECRET": "ws-secret",
			},
			wantErrMsg: "EMBEDDER_URL must be https://<host>",
		},
		{
			name: "url with query fails",
			envVars: map[string]string{
				"EMBEDDER_URL":       "https://workspace--embedder.modal.run?env=dev",
				"MODAL_PROXY_KEY":    "wk-key",
				"MODAL_PROXY_SECRET": "ws-secret",
			},
			wantErrMsg: "EMBEDDER_URL must be https://<host>",
		},
		{
			name: "url with fragment fails",
			envVars: map[string]string{
				"EMBEDDER_URL":       "https://workspace--embedder.modal.run#embed",
				"MODAL_PROXY_KEY":    "wk-key",
				"MODAL_PROXY_SECRET": "ws-secret",
			},
			wantErrMsg: "EMBEDDER_URL must be https://<host>",
		},
		{
			name: "url with empty query fails",
			envVars: map[string]string{
				"EMBEDDER_URL":       "https://workspace--embedder.modal.run?",
				"MODAL_PROXY_KEY":    "wk-key",
				"MODAL_PROXY_SECRET": "ws-secret",
			},
			wantErrMsg: "EMBEDDER_URL must be https://<host>",
		},
		{
			name: "missing key fails",
			envVars: map[string]string{
				"EMBEDDER_URL":       "https://workspace--embedder.modal.run",
				"MODAL_PROXY_SECRET": "ws-secret",
			},
			wantErrMsg: "MODAL_PROXY_KEY is required",
		},
		{
			name: "missing secret fails",
			envVars: map[string]string{
				"EMBEDDER_URL":    "https://workspace--embedder.modal.run",
				"MODAL_PROXY_KEY": "wk-key",
			},
			wantErrMsg: "MODAL_PROXY_SECRET is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for _, key := range embedderEnvKeys {
				t.Setenv(key, tt.envVars[key])
			}

			cfg, err := loadEmbedder()

			if tt.wantErrMsg != "" {
				assertLoadError(t, err, tt.wantErrMsg)
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if cfg.URL != tt.wantURL {
				t.Errorf("URL = %q, want %q", cfg.URL, tt.wantURL)
			}
			if cfg.ProxyKey != tt.envVars["MODAL_PROXY_KEY"] {
				t.Errorf("ProxyKey = %q, want %q", cfg.ProxyKey, tt.envVars["MODAL_PROXY_KEY"])
			}
			if cfg.ProxySecret != tt.envVars["MODAL_PROXY_SECRET"] {
				t.Errorf("ProxySecret = %q, want %q", cfg.ProxySecret, tt.envVars["MODAL_PROXY_SECRET"])
			}
		})
	}
}
