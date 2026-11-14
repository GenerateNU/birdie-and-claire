package shopify

import (
	"context"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"math/rand/v2"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
)

// newThumbnailServer serves a flat-backdrop JPEG at /garment.jpg and a noisy PNG
// at /model.png, and 404s anything else.
func newThumbnailServer(t *testing.T) (*adminClient, string) {
	t.Helper()
	flat := image.NewRGBA(image.Rect(0, 0, 20, 30))
	noisy := image.NewRGBA(image.Rect(0, 0, 20, 30))
	random := rand.New(rand.NewPCG(1, 2))
	for x := range 20 {
		for y := range 30 {
			flat.Set(x, y, color.RGBA{R: 246, G: 246, B: 246, A: 255})
			noisy.Set(x, y, color.RGBA{R: uint8(random.IntN(256)), G: uint8(random.IntN(256)), B: uint8(random.IntN(256)), A: 255})
		}
	}

	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Query(); got.Get("width") != thumbnailWidth || got.Get("v") != "1" {
			t.Errorf("thumbnail query = %q, want the image version kept with width=%s", r.URL.RawQuery, thumbnailWidth)
		}
		var err error
		switch r.URL.Path {
		case "/garment.jpg":
			err = jpeg.Encode(w, flat, nil)
		case "/model.png":
			err = png.Encode(w, noisy)
		default:
			http.NotFound(w, r)
		}
		if err != nil {
			t.Errorf("encode thumbnail: %v", err)
		}
	}))
	t.Cleanup(srv.Close)
	return &adminClient{http: srv.Client()}, srv.URL
}

func TestPutGarmentShotFirstMovesTheFlattestImageToTheFront(t *testing.T) {
	client, baseURL := newThumbnailServer(t)
	product := ShopifyProduct{ID: 1, Images: []ShopifyImage{
		{ID: 10, URL: baseURL + "/model.png?v=1", Position: 1},
		{ID: 20, URL: baseURL + "/garment.jpg?v=1", Position: 2},
		{ID: 30, URL: baseURL + "/model.png?v=1", Position: 3},
		{ID: 40, URL: baseURL + "/garment.jpg?v=1", Position: 4},
	}}

	got := client.putGarmentShotFirst(context.Background(), product)

	want := []ShopifyImage{
		{ID: 20, URL: baseURL + "/garment.jpg?v=1", Position: 0},
		{ID: 10, URL: baseURL + "/model.png?v=1", Position: 1},
		{ID: 30, URL: baseURL + "/model.png?v=1", Position: 3},
		{ID: 40, URL: baseURL + "/garment.jpg?v=1", Position: 4},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got  %+v\nwant %+v", got, want)
	}
}

func TestPutGarmentShotFirstKeepsStoreOrderWhenAThumbnailFails(t *testing.T) {
	client, baseURL := newThumbnailServer(t)
	images := []ShopifyImage{
		{ID: 10, URL: baseURL + "/model.png?v=1", Position: 1},
		{ID: 20, URL: baseURL + "/missing.png?v=1", Position: 2},
		{ID: 30, URL: baseURL + "/garment.jpg?v=1", Position: 3},
	}

	got := client.putGarmentShotFirst(context.Background(), ShopifyProduct{ID: 1, Images: images})

	if !reflect.DeepEqual(got, images) {
		t.Errorf("got  %+v\nwant the store order %+v", got, images)
	}
}
