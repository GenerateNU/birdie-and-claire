package tests

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"birdie-and-claire/internal/config"
	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/server"
	"birdie-and-claire/internal/services"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/humatest"
)

func TestLinkPreviewShowsSharedOutfitAndHidesPrivateOne(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	outfitID, ownerID := insertTestOutfit(t, db)
	controller := controllers.NewOutfitController(services.NewOutfitService(repository.New(db)))
	input := &controllers.OutfitLinkPreviewInput{ID: outfitID.String(), Host: "app.example.com"}

	private, err := controller.GetLinkPreview(ctx, input)
	if err != nil {
		t.Fatalf("private preview: %v", err)
	}
	privateBody := string(private.Body)
	if private.Status != http.StatusNotFound ||
		!strings.Contains(privateBody, `<meta property="og:title" content="Birdie &amp; Claire">`) ||
		strings.Contains(privateBody, `content="fit"`) {
		t.Fatalf("private outfit gave status %d and body:\n%s", private.Status, private.Body)
	}

	if err := repository.NewOutfitRepository(db).Share(ctx, outfitID, ownerID); err != nil {
		t.Fatalf("share: %v", err)
	}
	shared, err := controller.GetLinkPreview(ctx, input)
	if err != nil {
		t.Fatalf("shared preview: %v", err)
	}
	if shared.Status != http.StatusOK || !strings.Contains(string(shared.Body), `<meta property="og:title" content="fit">`) {
		t.Fatalf("shared outfit gave status %d and body:\n%s", shared.Status, shared.Body)
	}
}

// A malformed ID never reaches the database, so this checks huma sends the HTML as HTML without one.
func TestLinkPreviewRouteServesHTMLForMalformedID(t *testing.T) {
	controller := controllers.NewOutfitController(services.NewOutfitService(repository.New(nil)))
	_, api := humatest.New(t, server.APIConfig(&config.Configuration{}))
	huma.Register(api, huma.Operation{
		OperationID: "get-shared-outfit-link-preview",
		Method:      http.MethodGet,
		Path:        "/api/public/outfits/{id}/link-preview/{host}",
		Hidden:      true,
	}, controller.GetLinkPreview)

	response := api.Get("/api/public/outfits/not-an-id/link-preview/app.example.com")

	if response.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusNotFound, response.Body)
	}
	if got := response.Header().Get("Content-Type"); got != "text/html; charset=utf-8" {
		t.Fatalf("content type = %q, want text/html", got)
	}
	if got := response.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("X-Content-Type-Options = %q, want nosniff", got)
	}
	if got := response.Header().Get("Content-Security-Policy"); !strings.HasPrefix(got, "default-src 'none'") {
		t.Fatalf("Content-Security-Policy = %q, want default-src 'none'", got)
	}
	if !strings.Contains(response.Body.String(), `<meta property="og:title" content="Birdie &amp; Claire">`) {
		t.Fatalf("body is missing the generic title:\n%s", response.Body)
	}
}
