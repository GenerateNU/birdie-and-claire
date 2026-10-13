package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
)

const (
	defaultAIURL = "https://openrouter.ai/api/v1"
	// free, so calls work before the key has credits
	defaultAIModel = "nvidia/nemotron-3-super-120b-a12b:free"
)

type LLMConfig struct {
	APIKey  string
	BaseURL string
	// the gateway's own ID, such as "openai/gpt-5-mini" on OpenRouter
	Model string
	// gates the /api/v1/llm test routes, which let any signed-in user spend the key
	DevEndpoints bool
}

func loadLLM() (LLMConfig, error) {
	key := os.Getenv("AI_API_KEY")
	if key == "" {
		return LLMConfig{}, fmt.Errorf("AI_API_KEY is required")
	}

	model := os.Getenv("AI_MODEL")
	if model == "" {
		model = defaultAIModel
	}

	baseURL := strings.TrimSuffix(os.Getenv("AI_URL"), "/")
	if baseURL == "" {
		baseURL = defaultAIURL
	}
	parsed, err := url.Parse(baseURL)
	// a path is allowed because gateways serve under one, like OpenRouter's /api/v1
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil || strings.ContainsAny(baseURL, "?#") {
		return LLMConfig{}, fmt.Errorf("AI_URL must be an https URL with no query or fragment, got %q", baseURL)
	}

	devEndpoints := false
	if raw := os.Getenv("AI_DEV_ENDPOINTS"); raw != "" {
		devEndpoints, err = strconv.ParseBool(raw)
		if err != nil {
			return LLMConfig{}, fmt.Errorf("AI_DEV_ENDPOINTS must be true or false, got %q", raw)
		}
	}

	return LLMConfig{APIKey: key, BaseURL: baseURL, Model: model, DevEndpoints: devEndpoints}, nil
}
