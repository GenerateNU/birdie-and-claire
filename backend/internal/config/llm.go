package config

import (
	"fmt"
	"net/url"
	"os"
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
		// the value is left out because a URL can carry credentials
		return LLMConfig{}, fmt.Errorf("AI_URL must be an https URL with no credentials, query, or fragment")
	}

	return LLMConfig{APIKey: key, BaseURL: baseURL, Model: model}, nil
}
