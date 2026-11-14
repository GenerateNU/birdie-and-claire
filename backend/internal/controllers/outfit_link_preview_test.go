package controllers

import (
	"net/http"
	"strings"
	"testing"

	"birdie-and-claire/internal/models"

	"github.com/google/uuid"
)

func TestLinkPreviewEscapesOutfitAndOwner(t *testing.T) {
	outfit := models.SharedOutfitResponse{
		ID:        uuid.New(),
		Name:      `"><script>alert(1)</script>`,
		OwnerName: "<b>Birdie</b>",
		Products:  []models.ProductResponse{{}},
	}

	output, err := renderLinkPreview(http.StatusOK, newLinkPreview(&outfit, "app.example.com"))
	if err != nil {
		t.Fatalf("render: %v", err)
	}
	body := string(output.Body)

	for _, raw := range []string{"<script>", "<b>"} {
		if strings.Contains(body, raw) {
			t.Fatalf("body contains unescaped %q:\n%s", raw, body)
		}
	}
	for _, want := range []string{
		`<meta property="og:image" content="https://app.example.com/og-image.png">`,
		`<a href="/o/` + outfit.ID.String() + `">`,
		"1 piece",
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("body is missing %q:\n%s", want, body)
		}
	}
	// The host is caller-chosen, so it must never name the page.
	if strings.Contains(body, "og:url") {
		t.Fatalf("body has og:url:\n%s", body)
	}
}

func TestLinkPreviewDropsImageForAnUnsafeHost(t *testing.T) {
	for _, host := range []string{"", "evil.com/path", `evil.com"><script>`, "user@evil.com", "evil.com?x=1"} {
		t.Run(host, func(t *testing.T) {
			if preview := newLinkPreview(nil, host); preview.ImageURL != "" {
				t.Fatalf("host %q gave image %q, want none", host, preview.ImageURL)
			}
		})
	}
}
