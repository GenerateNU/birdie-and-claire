package controllers

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"html/template"
	"net/http"
	"strings"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/services"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
)

// Link-preview crawlers don't run JavaScript, so the SPA's /o/{id} looks blank to them. vercel.json
// sends only their user agents here and serves everyone else the SPA.
var linkPreviewTemplate = template.Must(template.New("link-preview").Parse(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{{.Title}}</title>
<meta name="robots" content="noindex">
<meta name="description" content="{{.Description}}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Birdie &amp; Claire">
<meta property="og:title" content="{{.Title}}">
<meta property="og:description" content="{{.Description}}">
{{- if .ImageURL}}
<meta property="og:image" content="{{.ImageURL}}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Birdie &amp; Claire">
{{- end}}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{.Title}}">
<meta name="twitter:description" content="{{.Description}}">
</head>
<body><a href="{{.Path}}">Open on Birdie &amp; Claire</a></body>
</html>
`))

// The page has no scripts, styles, or frames, and the only thing it loads is the og:image.
const linkPreviewCSP = "default-src 'none'; img-src https:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"

type OutfitLinkPreviewInput struct {
	// Keep this a string so a malformed ID gets the generic preview instead of a JSON 422.
	ID string `path:"id"`
	// In the path rather than the query, so a query string on the shared link can't replace it when
	// Vercel's rewrite forwards the request.
	Host string `path:"host" maxLength:"253" pattern:"^[a-zA-Z0-9]([a-zA-Z0-9]|-[a-zA-Z0-9]){0,31}(\\.[a-zA-Z0-9]([a-zA-Z0-9]|-[a-zA-Z0-9]){0,31})*(:[0-9]{1,5})?$"`
}

type OutfitLinkPreviewOutput struct {
	Status int
	Body   []byte
}

// LinkPreviewHeaders sets the constant headers for the HTML crawler response.
func LinkPreviewHeaders(ctx huma.Context, next func(huma.Context)) {
	ctx.SetHeader("Content-Type", "text/html; charset=utf-8")
	ctx.SetHeader("Content-Security-Policy", linkPreviewCSP)
	ctx.SetHeader("X-Content-Type-Options", "nosniff")
	next(ctx)
}

type linkPreview struct {
	Title       string
	Description string
	Path        string
	ImageURL    string
}

// GetLinkPreview answers a crawler with the shared outfit's preview tags, or generic ones with a 404
// for a private, deleted, or malformed one.
func (c *OutfitController) GetLinkPreview(ctx context.Context, input *OutfitLinkPreviewInput) (*OutfitLinkPreviewOutput, error) {
	var outfit *models.SharedOutfitResponse
	if id, err := uuid.Parse(input.ID); err == nil {
		shared, err := c.service.GetShared(ctx, id)
		if err != nil && !errors.Is(err, errs.ErrNotFound) {
			return nil, errs.ToHuma(ctx, err)
		}
		if err == nil {
			outfit = &shared
		}
	}

	if outfit == nil {
		return renderLinkPreview(http.StatusNotFound, newLinkPreview(nil, input.Host))
	}
	return renderLinkPreview(http.StatusOK, newLinkPreview(outfit, input.Host))
}

// newLinkPreview builds generic tags when outfit is nil. Host has already passed request validation.
// There is no og:url because the crawler's fetched URL is the only one trusted to name the page.
func newLinkPreview(outfit *models.SharedOutfitResponse, host string) linkPreview {
	preview := linkPreview{
		Title:       "Birdie & Claire",
		Description: "Get customized outfit options tailored to your taste with Birdie & Claire’s closet curator.",
		Path:        "/",
	}
	if outfit != nil {
		preview.Title = outfit.Name
		preview.Description = services.DescribeSharedOutfit(*outfit)
		preview.Path = "/o/" + outfit.ID.String()
	}

	host = strings.ToLower(host)
	// Served from frontend/public at a fixed path, because Vite renames bundled assets on every build.
	preview.ImageURL = "https://" + host + "/og-image.png"
	return preview
}

func renderLinkPreview(status int, preview linkPreview) (*OutfitLinkPreviewOutput, error) {
	var body bytes.Buffer
	if err := linkPreviewTemplate.Execute(&body, preview); err != nil {
		return nil, fmt.Errorf("render link preview: %w", err)
	}
	return &OutfitLinkPreviewOutput{Status: status, Body: body.Bytes()}, nil
}
