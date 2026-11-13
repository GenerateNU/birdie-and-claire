package config

import (
	"fmt"
	"net/url"
	"os"
	"strings"
)

type ShopifyConfig struct {
	URL          string
	ClientID     string
	ClientSecret string
}

// loadShopify requires the myshopify.com origin because the Admin API answers
// only there, not on the storefront's own domain, and the client appends its
// /admin paths to it.
func loadShopify() (ShopifyConfig, error) {
	raw := strings.TrimSuffix(os.Getenv("SHOPIFY_URL"), "/")
	if raw == "" {
		return ShopifyConfig{}, fmt.Errorf("SHOPIFY_URL is required")
	}

	parsed, err := url.Parse(raw)
	if err != nil || raw != "https://"+parsed.Host || !strings.HasSuffix(parsed.Host, ".myshopify.com") {
		return ShopifyConfig{}, fmt.Errorf("SHOPIFY_URL must be https://<store>.myshopify.com with nothing after the host, got %q", raw)
	}

	clientID := os.Getenv("SHOPIFY_CLIENT_ID")
	if clientID == "" {
		return ShopifyConfig{}, fmt.Errorf("SHOPIFY_CLIENT_ID is required")
	}

	clientSecret := os.Getenv("SHOPIFY_CLIENT_SECRET")
	if clientSecret == "" {
		return ShopifyConfig{}, fmt.Errorf("SHOPIFY_CLIENT_SECRET is required")
	}

	return ShopifyConfig{URL: raw, ClientID: clientID, ClientSecret: clientSecret}, nil
}
