package config

import (
	"strings"
	"testing"
)

func TestLoadPublicAPIURL(t *testing.T) {
	tests := []struct {
		name       string
		value      string
		want       string
		wantErrMsg string
	}{
		{name: "https host", value: "https://api.birdieandclaire.com", want: "https://api.birdieandclaire.com"},
		{name: "http host with port", value: "http://localhost:8080", want: "http://localhost:8080"},
		{name: "trailing slash is trimmed", value: "http://localhost:8080/", want: "http://localhost:8080"},
		{name: "missing fails", value: "", wantErrMsg: "PUBLIC_API_URL is required"},
		{name: "no scheme fails", value: "localhost:8080", wantErrMsg: "PUBLIC_API_URL must be http(s)://<host>"},
		{name: "other scheme fails", value: "ftp://localhost", wantErrMsg: "PUBLIC_API_URL must be http(s)://<host>"},
		{name: "path fails", value: "https://example.com/api", wantErrMsg: "PUBLIC_API_URL must be http(s)://<host>"},
		{name: "query fails", value: "https://example.com?env=dev", wantErrMsg: "PUBLIC_API_URL must be http(s)://<host>"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("PUBLIC_API_URL", tt.value)

			got, err := loadPublicAPIURL()
			if tt.wantErrMsg != "" {
				if err == nil || !strings.Contains(err.Error(), tt.wantErrMsg) {
					t.Fatalf("loadPublicAPIURL() error = %v, want it to contain %q", err, tt.wantErrMsg)
				}
				return
			}
			if err != nil {
				t.Fatalf("loadPublicAPIURL() error = %v", err)
			}
			if got != tt.want {
				t.Fatalf("loadPublicAPIURL() = %q, want %q", got, tt.want)
			}
		})
	}
}
