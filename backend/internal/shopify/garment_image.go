package shopify

import (
	"context"
	"fmt"
	"image"
	"image/color"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"net/url"
	"slices"

	"birdie-and-claire/internal/log"
)

const (
	thumbnailWidth    = "200"
	maxThumbnailBytes = 4 << 20
	// A JPEG keeps slight noise in a flat studio backdrop.
	flatBorderTolerance = 3
)

// putGarmentShotFirst moves the image most likely to show the garment alone to
// the front with position 0, since the first image is the one the app displays
// and embeds. Garment shots sit on a flat studio backdrop and model photos do
// not, so the image whose border is flattest wins, and a tie goes to the
// earlier image. When a thumbnail cannot be scored, the store order is kept.
func (c *adminClient) putGarmentShotFirst(ctx context.Context, product ShopifyProduct) []ShopifyImage {
	images := product.Images
	if len(images) < 2 {
		return images
	}
	bestIndex, bestScore := 0, -1.0
	for i, img := range images {
		score, err := c.scoreBorderFlatness(ctx, img.URL)
		if err != nil {
			log.Warn(ctx, "catalog sync: kept the store's image order, could not score an image", "shopify_id", product.ID, "image_id", img.ID, "error", err)
			return images
		}
		if score > bestScore {
			bestIndex, bestScore = i, score
		}
	}

	chosen := images[bestIndex]
	chosen.Position = 0
	rest := slices.Delete(slices.Clone(images), bestIndex, bestIndex+1)
	return append([]ShopifyImage{chosen}, rest...)
}

func (c *adminClient) scoreBorderFlatness(ctx context.Context, imageURL string) (float64, error) {
	thumbnail, err := thumbnailURL(imageURL)
	if err != nil {
		return 0, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, thumbnail, nil)
	if err != nil {
		return 0, fmt.Errorf("build thumbnail request: %w", err)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return 0, fmt.Errorf("fetch thumbnail: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("fetch thumbnail: %w", readStatusError(resp))
	}
	// Without a webp Accept header, Shopify's CDN answers a webp source with a
	// JPEG, so PNG and JPEG cover every image.
	decoded, _, err := image.Decode(io.LimitReader(resp.Body, maxThumbnailBytes))
	if err != nil {
		return 0, fmt.Errorf("decode thumbnail: %w", err)
	}
	return borderFlatness(decoded), nil
}

// thumbnailURL keeps the URL's existing query, which on Shopify's CDN holds the
// image version.
func thumbnailURL(imageURL string) (string, error) {
	parsed, err := url.Parse(imageURL)
	if err != nil {
		return "", fmt.Errorf("parse image url: %w", err)
	}
	query := parsed.Query()
	query.Set("width", thumbnailWidth)
	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}

// borderFlatness is the share of the image's edge pixels that match its
// top-left pixel.
func borderFlatness(img image.Image) float64 {
	bounds := img.Bounds()
	if bounds.Empty() {
		return 0
	}
	corner := img.At(bounds.Min.X, bounds.Min.Y)
	var matching, total int
	count := func(x, y int) {
		total++
		if colorsMatch(img.At(x, y), corner) {
			matching++
		}
	}
	for x := bounds.Min.X; x < bounds.Max.X; x++ {
		count(x, bounds.Min.Y)
		count(x, bounds.Max.Y-1)
	}
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		count(bounds.Min.X, y)
		count(bounds.Max.X-1, y)
	}
	return float64(matching) / float64(total)
}

func colorsMatch(a, b color.Color) bool {
	ar, ag, ab, _ := a.RGBA()
	br, bg, bb, _ := b.RGBA()
	return channelsMatch(ar, br) && channelsMatch(ag, bg) && channelsMatch(ab, bb)
}

// RGBA returns 16-bit channels, so the 8-bit tolerance is scaled to match.
func channelsMatch(a, b uint32) bool {
	diff := int64(a) - int64(b)
	return diff >= -flatBorderTolerance*0x101 && diff <= flatBorderTolerance*0x101
}
