package config

import "testing"

type shopifyCase struct {
	name       string
	envVars    map[string]string
	wantErrMsg string
	wantURL    string
}

var shopifyEnvKeys = []string{"SHOPIFY_URL", "SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET"}

func TestLoadShopify(t *testing.T) {
	tests := []shopifyCase{
		{
			name: "valid config",
			envVars: map[string]string{
				"SHOPIFY_URL":           "https://birdie-and-claire.myshopify.com",
				"SHOPIFY_CLIENT_ID":     "client-id",
				"SHOPIFY_CLIENT_SECRET": "client-secret",
			},
			wantURL: "https://birdie-and-claire.myshopify.com",
		},
		{
			name: "trailing slash is trimmed",
			envVars: map[string]string{
				"SHOPIFY_URL":           "https://birdie-and-claire.myshopify.com/",
				"SHOPIFY_CLIENT_ID":     "client-id",
				"SHOPIFY_CLIENT_SECRET": "client-secret",
			},
			wantURL: "https://birdie-and-claire.myshopify.com",
		},
		{
			name: "missing url fails",
			envVars: map[string]string{
				"SHOPIFY_CLIENT_ID":     "client-id",
				"SHOPIFY_CLIENT_SECRET": "client-secret",
			},
			wantErrMsg: "SHOPIFY_URL is required",
		},
		{
			name: "storefront domain fails",
			envVars: map[string]string{
				"SHOPIFY_URL":           "https://birdieandclaire.com",
				"SHOPIFY_CLIENT_ID":     "client-id",
				"SHOPIFY_CLIENT_SECRET": "client-secret",
			},
			wantErrMsg: "SHOPIFY_URL must be https://<store>.myshopify.com",
		},
		{
			name: "http url fails",
			envVars: map[string]string{
				"SHOPIFY_URL":           "http://birdie-and-claire.myshopify.com",
				"SHOPIFY_CLIENT_ID":     "client-id",
				"SHOPIFY_CLIENT_SECRET": "client-secret",
			},
			wantErrMsg: "SHOPIFY_URL must be https://<store>.myshopify.com",
		},
		{
			name: "url without scheme fails",
			envVars: map[string]string{
				"SHOPIFY_URL":           "birdie-and-claire.myshopify.com",
				"SHOPIFY_CLIENT_ID":     "client-id",
				"SHOPIFY_CLIENT_SECRET": "client-secret",
			},
			wantErrMsg: "SHOPIFY_URL must be https://<store>.myshopify.com",
		},
		{
			name: "url with path fails",
			envVars: map[string]string{
				"SHOPIFY_URL":           "https://birdie-and-claire.myshopify.com/admin",
				"SHOPIFY_CLIENT_ID":     "client-id",
				"SHOPIFY_CLIENT_SECRET": "client-secret",
			},
			wantErrMsg: "SHOPIFY_URL must be https://<store>.myshopify.com",
		},
		{
			name: "missing client id fails",
			envVars: map[string]string{
				"SHOPIFY_URL":           "https://birdie-and-claire.myshopify.com",
				"SHOPIFY_CLIENT_SECRET": "client-secret",
			},
			wantErrMsg: "SHOPIFY_CLIENT_ID is required",
		},
		{
			name: "missing client secret fails",
			envVars: map[string]string{
				"SHOPIFY_URL":       "https://birdie-and-claire.myshopify.com",
				"SHOPIFY_CLIENT_ID": "client-id",
			},
			wantErrMsg: "SHOPIFY_CLIENT_SECRET is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for _, key := range shopifyEnvKeys {
				t.Setenv(key, tt.envVars[key])
			}

			cfg, err := loadShopify()

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
			if cfg.ClientID != tt.envVars["SHOPIFY_CLIENT_ID"] {
				t.Errorf("ClientID = %q, want %q", cfg.ClientID, tt.envVars["SHOPIFY_CLIENT_ID"])
			}
			if cfg.ClientSecret != tt.envVars["SHOPIFY_CLIENT_SECRET"] {
				t.Errorf("ClientSecret = %q, want %q", cfg.ClientSecret, tt.envVars["SHOPIFY_CLIENT_SECRET"])
			}
		})
	}
}
