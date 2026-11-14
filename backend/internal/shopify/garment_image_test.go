package shopify

import (
	"context"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"io"
	"math/rand/v2"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"birdie-and-claire/internal/config"
)

// serveThumbnails serves a flat-backdrop JPEG at /garment.jpg and a noisy PNG
// at /model.png, and 404s anything else.
func serveThumbnails(t *testing.T) http.HandlerFunc {
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

	return func(w http.ResponseWriter, r *http.Request) {
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
	}
}

// newTLSTestClient serves handler over https, since parseProduct only accepts
// https image URLs.
func newTLSTestClient(t *testing.T, handler http.Handler) (*adminClient, string) {
	t.Helper()
	srv := httptest.NewTLSServer(handler)
	t.Cleanup(srv.Close)
	return &adminClient{ShopifyConfig: config.ShopifyConfig{URL: srv.URL}, http: srv.Client()}, srv.URL
}

func TestListActiveProductsPutsTheGarmentShotFirst(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /admin/oauth/access_token", respondWith(http.StatusOK, grantedTokenJSON))
	mux.HandleFunc("POST /admin/api/2026-10/graphql.json", func(w http.ResponseWriter, r *http.Request) {
		baseURL := "https://" + r.Host
		node := fmt.Sprintf(`{"id":"gid://shopify/Product/1","media":{"pageInfo":{"hasNextPage":false},"nodes":[`+
			`{"id":"gid://shopify/MediaImage/10","image":{"url":"%[1]s/model.png?v=1"}},`+
			`{"id":"gid://shopify/MediaImage/20","image":{"url":"%[1]s/garment.jpg?v=1"}}]}}`, baseURL)
		_, _ = io.WriteString(w, buildPageJSON(false, "", node))
	})
	mux.HandleFunc("GET /", serveThumbnails(t))
	client, _ := newTLSTestClient(t, mux)

	products, err := client.ListActiveProducts(context.Background())
	if err != nil {
		t.Fatalf("ListActiveProducts: %v", err)
	}

	if len(products) != 1 || len(products[0].Images) != 2 || products[0].Images[0].ID != 20 || products[0].Images[0].Position != 0 {
		t.Errorf("products = %+v, want image 20 first with position 0", products)
	}
}

func TestPutGarmentShotFirstMovesTheFlattestImageToTheFront(t *testing.T) {
	client, baseURL := newTLSTestClient(t, serveThumbnails(t))
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
	client, baseURL := newTLSTestClient(t, serveThumbnails(t))
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
