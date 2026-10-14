package config

import (
	"maps"
	"strings"
	"testing"
)

type llmCase struct {
	name        string
	envVars     map[string]string
	wantErrMsg  string
	wantBaseURL string
	wantModel   string
}

var llmEnvKeys = []string{"AI_API_KEY", "AI_MODEL", "AI_URL"}

// llmEnv is a valid environment with overrides applied; an empty override sets the variable to empty.
func llmEnv(overrides map[string]string) map[string]string {
	env := map[string]string{
		"AI_API_KEY": "sk-or-test",
		"AI_MODEL":   "openai/gpt-5-mini",
	}
	maps.Copy(env, overrides)
	return env
}

func TestLoadLLM(t *testing.T) {
	tests := []llmCase{
		{
			name:        "valid config",
			envVars:     llmEnv(nil),
			wantBaseURL: "https://openrouter.ai/api/v1",
		},
		{
			name:       "missing key fails",
			envVars:    llmEnv(map[string]string{"AI_API_KEY": ""}),
			wantErrMsg: "AI_API_KEY is required",
		},
		{
			name:        "model defaults to the free model",
			envVars:     llmEnv(map[string]string{"AI_MODEL": ""}),
			wantBaseURL: "https://openrouter.ai/api/v1",
			wantModel:   "nvidia/nemotron-3-super-120b-a12b:free",
		},
		{
			name:        "AI_MODEL overrides the default",
			envVars:     llmEnv(map[string]string{"AI_MODEL": "anthropic/claude-haiku-4.5"}),
			wantBaseURL: "https://openrouter.ai/api/v1",
			wantModel:   "anthropic/claude-haiku-4.5",
		},
		{
			name:        "trailing slash is trimmed",
			envVars:     llmEnv(map[string]string{"AI_URL": "https://openrouter.ai/api/v1/"}),
			wantBaseURL: "https://openrouter.ai/api/v1",
		},
		{
			name:        "path is kept",
			envVars:     llmEnv(map[string]string{"AI_URL": "https://gateway.example.com/api/v1"}),
			wantBaseURL: "https://gateway.example.com/api/v1",
		},
		{
			name:       "http url fails",
			envVars:    llmEnv(map[string]string{"AI_URL": "http://openrouter.ai/api/v1"}),
			wantErrMsg: "AI_URL must be an https URL",
		},
		{
			name:       "url with query fails",
			envVars:    llmEnv(map[string]string{"AI_URL": "https://openrouter.ai/api/v1?env=dev"}),
			wantErrMsg: "AI_URL must be an https URL",
		},
		{
			// url.Parse drops an empty query, so only the raw string shows it.
			name:       "url with empty query fails",
			envVars:    llmEnv(map[string]string{"AI_URL": "https://openrouter.ai/api/v1?"}),
			wantErrMsg: "AI_URL must be an https URL",
		},
		{
			name:       "url with fragment fails",
			envVars:    llmEnv(map[string]string{"AI_URL": "https://openrouter.ai/api/v1#v1"}),
			wantErrMsg: "AI_URL must be an https URL",
		},
		{
			name:       "url with userinfo fails",
			envVars:    llmEnv(map[string]string{"AI_URL": "https://user:pass@openrouter.ai/api/v1"}),
			wantErrMsg: "AI_URL must be an https URL",
		},
		{
			name:       "url without host fails",
			envVars:    llmEnv(map[string]string{"AI_URL": "https:///api/v1"}),
			wantErrMsg: "AI_URL must be an https URL",
		},
		{
			name:       "url without scheme fails",
			envVars:    llmEnv(map[string]string{"AI_URL": "openrouter.ai/api/v1"}),
			wantErrMsg: "AI_URL must be an https URL",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for _, key := range llmEnvKeys {
				t.Setenv(key, tt.envVars[key])
			}

			cfg, err := loadLLM()

			if tt.wantErrMsg != "" {
				assertLoadError(t, err, tt.wantErrMsg)
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			assertLLMConfig(t, cfg, tt)
		})
	}
}

func assertLLMConfig(t *testing.T, cfg LLMConfig, tt llmCase) {
	t.Helper()
	if cfg.APIKey != tt.envVars["AI_API_KEY"] {
		t.Errorf("APIKey = %q, want %q", cfg.APIKey, tt.envVars["AI_API_KEY"])
	}
	wantModel := tt.wantModel
	if wantModel == "" {
		wantModel = tt.envVars["AI_MODEL"]
	}
	if cfg.Model != wantModel {
		t.Errorf("Model = %q, want %q", cfg.Model, wantModel)
	}
	if cfg.BaseURL != tt.wantBaseURL {
		t.Errorf("BaseURL = %q, want %q", cfg.BaseURL, tt.wantBaseURL)
	}
}

func TestLoadLLMErrorOmitsTheURL(t *testing.T) {
	t.Setenv("AI_API_KEY", "sk-or-test")
	t.Setenv("AI_MODEL", "")
	t.Setenv("AI_URL", "https://user:s3cret-pass@gateway.example.com/api/v1?key=s3cret-key")

	_, err := loadLLM()
	assertLoadError(t, err, "AI_URL must be an https URL")
	if strings.Contains(err.Error(), "s3cret") {
		t.Errorf("error %q echoes the URL's credentials", err)
	}
}
