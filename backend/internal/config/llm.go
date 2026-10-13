package config

import (
	"fmt"
	"net/url"
	"os"
	"slices"
	"strings"

	"github.com/google/uuid"
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
	// users allowed on the /api/v1/llm test routes, which spend the gateway key
	DevUserIDs []uuid.UUID
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

	devUserIDs, err := loadDevUserIDs()
	if err != nil {
		return LLMConfig{}, err
	}

	return LLMConfig{APIKey: key, BaseURL: baseURL, Model: model, DevUserIDs: devUserIDs}, nil
}

func loadDevUserIDs() ([]uuid.UUID, error) {
	var ids []uuid.UUID
	for entry := range strings.SplitSeq(os.Getenv("AI_DEV_USER_IDS"), ",") {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		id, err := uuid.Parse(entry)
		// a request with no auth context reads as the nil UUID, so allowing it would let that through
		if err != nil || id == uuid.Nil {
			return nil, fmt.Errorf("AI_DEV_USER_IDS must be comma-separated user UUIDs, got %q", entry)
		}
		if !slices.Contains(ids, id) {
			ids = append(ids, id)
		}
	}
	return ids, nil
}
