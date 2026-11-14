package controllers

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"html/template"
	"net/http"
	"regexp"
	"strings"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"

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

// The frontend host, as Vercel's rewrite passes it. A hostname with an optional port, nothing else.
var linkPreviewHostPattern = regexp.MustCompile(`^[a-z0-9-]+(\.[a-z0-9-]+)*(:[0-9]{1,5})?$`)

// The page has no scripts, styles, or frames, and the only thing it loads is the og:image.
const linkPreviewCSP = "default-src 'none'; img-src https:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"

type OutfitLinkPreviewInput struct {
	// A string, not a uuid.UUID, so a malformed ID gets the generic preview instead of a JSON 422.
	ID string `path:"id"`
	// In the path rather than the query, so a query string on the shared link can't replace it when
	// Vercel's rewrite forwards the request.
	Host string `path:"host"`
}

type OutfitLinkPreviewOutput struct {
	Status                int
	ContentType           string `header:"Content-Type"`
	ContentSecurityPolicy string `header:"Content-Security-Policy"`
	ContentTypeOptions    string `header:"X-Content-Type-Options"`
	Body                  []byte
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
	id, err := uuid.Parse(input.ID)
	if err != nil {
		return renderLinkPreview(http.StatusNotFound, newLinkPreview(nil, input.Host))
	}

	outfit, err := c.service.GetShared(ctx, id)
	if errors.Is(err, errs.ErrNotFound) {
		return renderLinkPreview(http.StatusNotFound, newLinkPreview(nil, input.Host))
	}
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return renderLinkPreview(http.StatusOK, newLinkPreview(&outfit, input.Host))
}

// newLinkPreview builds generic tags when outfit is nil. There is no og:url: anyone can call this
// with any host, so the crawler's own fetched URL is the only one trusted to name the page. The
// image is left out when host isn't a plain hostname, since crawlers need it absolute.
func newLinkPreview(outfit *models.SharedOutfitResponse, host string) linkPreview {
	preview := linkPreview{
		Title:       "Birdie & Claire",
		Description: "Get customized outfit options tailored to your taste with Birdie & Claire’s closet curator.",
		Path:        "/",
	}
	if outfit != nil {
		preview.Title = outfit.Name
		preview.Description = describeSharedOutfit(*outfit)
		preview.Path = "/o/" + outfit.ID.String()
	}

	host = strings.ToLower(host)
	if !linkPreviewHostPattern.MatchString(host) {
		return preview
	}
	// Served from frontend/public at a fixed path, because Vite renames bundled assets on every build.
	preview.ImageURL = "https://" + host + "/og-image.png"
	return preview
}

func describeSharedOutfit(outfit models.SharedOutfitResponse) string {
	pieces := fmt.Sprintf("%d pieces", len(outfit.Products))
	if len(outfit.Products) == 1 {
		pieces = "1 piece"
	}
	if outfit.OwnerName == "" {
		return "An outfit shared on Birdie & Claire · " + pieces
	}
	return outfit.OwnerName + " shared an outfit on Birdie & Claire · " + pieces
}

func renderLinkPreview(status int, preview linkPreview) (*OutfitLinkPreviewOutput, error) {
	var body bytes.Buffer
	if err := linkPreviewTemplate.Execute(&body, preview); err != nil {
		return nil, fmt.Errorf("render link preview: %w", err)
	}
	return &OutfitLinkPreviewOutput{
		Status:                status,
		ContentType:           "text/html; charset=utf-8",
		ContentSecurityPolicy: linkPreviewCSP,
		ContentTypeOptions:    "nosniff",
		Body:                  body.Bytes(),
	}, nil
}
