package shopify

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"birdie-and-claire/internal/config"
)

const grantedTokenJSON = `{"access_token":"test-token","scope":"read_products","expires_in":86399}`

func newTestClient(t *testing.T, token, graphQL http.HandlerFunc) CatalogSource {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("POST /admin/oauth/access_token", token)
	mux.HandleFunc("POST /admin/api/2026-10/graphql.json", graphQL)
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return New(config.ShopifyConfig{URL: srv.URL, ClientID: "test-client-id", ClientSecret: "test-client-secret"})
}

func respondWith(status int, body string) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(status)
		_, _ = io.WriteString(w, body)
	}
}

func decodeGraphQLRequest(t *testing.T, r *http.Request) graphQLRequest {
	t.Helper()
	var req graphQLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		t.Errorf("decode graphql request: %v", err)
	}
	return req
}

// buildProductJSON is a product node with no category, tags, or images.
func buildProductJSON(id int64) string {
	return fmt.Sprintf(`{"id":"gid://shopify/Product/%d","handle":"product-%d","title":"Product %d","productType":"",`+
		`"category":null,"tags":[],"media":{"pageInfo":{"hasNextPage":false},"nodes":[]}}`, id, id, id)
}

func buildProductWithImageJSON(imageURL string) string {
	return fmt.Sprintf(`{"id":"gid://shopify/Product/1","media":{"pageInfo":{"hasNextPage":false},"nodes":[`+
		`{"id":"gid://shopify/MediaImage/2","image":{"url":%q,"altText":null,"width":1200,"height":1600}}]}}`, imageURL)
}

func buildPageJSON(hasNextPage bool, endCursor string, products ...string) string {
	return fmt.Sprintf(`{"data":{"products":{"pageInfo":{"hasNextPage":%t,"endCursor":%q},"nodes":[%s]}}}`,
		hasNextPage, endCursor, strings.Join(products, ","))
}

func TestListActiveProductsRequestsTokenWithClientCredentials(t *testing.T) {
	token := func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Content-Type"); got != "application/x-www-form-urlencoded" {
			t.Errorf("Content-Type = %q, want application/x-www-form-urlencoded", got)
		}
		if err := r.ParseForm(); err != nil {
			t.Errorf("parse form: %v", err)
		}
		want := map[string]string{
			"grant_type":    "client_credentials",
			"client_id":     "test-client-id",
			"client_secret": "test-client-secret",
		}
		for field, value := range want {
			if got := r.PostForm.Get(field); got != value {
				t.Errorf("%s = %q, want %q", field, got, value)
			}
		}
		_, _ = io.WriteString(w, grantedTokenJSON)
	}
	graphQL := func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Shopify-Access-Token"); got != "test-token" {
			t.Errorf("X-Shopify-Access-Token = %q, want test-token", got)
		}
		_, _ = io.WriteString(w, buildPageJSON(false, ""))
	}
	client := newTestClient(t, token, graphQL)

	if _, err := client.ListActiveProducts(context.Background()); err != nil {
		t.Fatalf("ListActiveProducts: %v", err)
	}
}

func TestListActiveProductsFollowsEveryPage(t *testing.T) {
	graphQL := func(w http.ResponseWriter, r *http.Request) {
		cursor := decodeGraphQLRequest(t, r).Variables.Cursor
		if cursor == nil {
			_, _ = io.WriteString(w, buildPageJSON(true, "cursor-1", buildProductJSON(1), buildProductJSON(2)))
			return
		}
		if *cursor != "cursor-1" {
			t.Errorf("cursor = %q, want cursor-1 from the first page", *cursor)
		}
		_, _ = io.WriteString(w, buildPageJSON(false, "cursor-2", buildProductJSON(3)))
	}
	client := newTestClient(t, respondWith(http.StatusOK, grantedTokenJSON), graphQL)

	products, err := client.ListActiveProducts(context.Background())
	if err != nil {
		t.Fatalf("ListActiveProducts: %v", err)
	}

	ids := make([]int64, len(products))
	for i, product := range products {
		ids[i] = product.ID
	}
	if want := []int64{1, 2, 3}; !reflect.DeepEqual(ids, want) {
		t.Errorf("product IDs = %v, want %v", ids, want)
	}
}

func TestListActiveProductsAsksOnlyForActiveProducts(t *testing.T) {
	graphQL := func(w http.ResponseWriter, r *http.Request) {
		if query := decodeGraphQLRequest(t, r).Query; !strings.Contains(query, `query: "status:active"`) {
			t.Errorf("products query does not filter on status:active:\n%s", query)
		}
		_, _ = io.WriteString(w, buildPageJSON(false, ""))
	}
	client := newTestClient(t, respondWith(http.StatusOK, grantedTokenJSON), graphQL)

	if _, err := client.ListActiveProducts(context.Background()); err != nil {
		t.Fatalf("ListActiveProducts: %v", err)
	}
}

// The middle image is still processing, so it is skipped, and the positions
// still follow the store's media order.
func TestListActiveProductsMapsProductFields(t *testing.T) {
	const node = `{
		"id": "gid://shopify/Product/8123456789012",
		"handle": "linen-shirt",
		"title": "Linen Shirt",
		"productType": "Tops",
		"description": "A breezy linen shirt.",
		"category": {"fullName": "Apparel & Accessories > Clothing > Clothing Tops > Shirts"},
		"tags": ["linen", "summer"],
		"options": [{"name": "Color", "values": ["White", "Sage"]}, {"name": "Size", "values": ["S", "M"]}],
		"fabricInfo": {"value": "100% linen"},
		"materials": {"value": "[\"Linen\"]"},
		"modelInfo": {"value": "Model wears size M."},
		"media": {
			"pageInfo": {"hasNextPage": false},
			"nodes": [
				{"id": "gid://shopify/MediaImage/111", "image": {"url": "https://cdn.shopify.com/front.jpg", "altText": "Front", "width": 1200, "height": 1600}},
				{"id": "gid://shopify/MediaImage/222", "image": null},
				{"id": "gid://shopify/MediaImage/333", "image": {"url": "https://cdn.shopify.com/back.jpg", "altText": null, "width": 1200, "height": 1600}}
			]
		}
	}`
	client := newTestClient(t, respondWith(http.StatusOK, grantedTokenJSON), respondWith(http.StatusOK, buildPageJSON(false, "", node)))

	products, err := client.ListActiveProducts(context.Background())
	if err != nil {
		t.Fatalf("ListActiveProducts: %v", err)
	}

	want := []ShopifyProduct{{
		ID:          8123456789012,
		Handle:      "linen-shirt",
		Title:       "Linen Shirt",
		ProductType: "Tops",
		Description: "A breezy linen shirt.",
		Category:    "Apparel & Accessories > Clothing > Clothing Tops > Shirts",
		Tags:        []string{"linen", "summer"},
		Options:     []ShopifyOption{{Name: "Color", Values: []string{"White", "Sage"}}, {Name: "Size", Values: []string{"S", "M"}}},
		FabricInfo:  "100% linen",
		Materials:   []string{"Linen"},
		ModelInfo:   "Model wears size M.",
		Images: []ShopifyImage{
			{ID: 111, URL: "https://cdn.shopify.com/front.jpg", AltText: "Front", Width: 1200, Height: 1600, Position: 1},
			{ID: 333, URL: "https://cdn.shopify.com/back.jpg", Width: 1200, Height: 1600, Position: 3},
		},
		HasProcessingImages: true,
	}}
	if !reflect.DeepEqual(products, want) {
		t.Errorf("got  %+v\nwant %+v", products, want)
	}
}

func TestListActiveProductsLeavesOutMaterialsThatAreNotAList(t *testing.T) {
	const node = `{
		"id": "gid://shopify/Product/1",
		"materials": {"value": "Linen"},
		"media": {"pageInfo": {"hasNextPage": false}, "nodes": []}
	}`
	client := newTestClient(t, respondWith(http.StatusOK, grantedTokenJSON), respondWith(http.StatusOK, buildPageJSON(false, "", node)))

	products, err := client.ListActiveProducts(context.Background())
	if err != nil {
		t.Fatalf("ListActiveProducts: %v", err)
	}
	if len(products) != 1 || products[0].Materials != nil {
		t.Fatalf("products = %+v, want the product kept without materials", products)
	}
}

func TestListActiveProductsLeavesOutFailedImages(t *testing.T) {
	const node = `{"id":"gid://shopify/Product/1","media":{"pageInfo":{"hasNextPage":false},"nodes":[` +
		`{"id":"gid://shopify/MediaImage/2","status":"FAILED","image":null}]}}`
	client := newTestClient(t, respondWith(http.StatusOK, grantedTokenJSON), respondWith(http.StatusOK, buildPageJSON(false, "", node)))

	products, err := client.ListActiveProducts(context.Background())
	if err != nil {
		t.Fatalf("ListActiveProducts: %v", err)
	}
	if len(products) != 1 || len(products[0].Images) != 0 || products[0].HasProcessingImages {
		t.Fatalf("products = %+v, want one product with no images that is not waiting on processing", products)
	}
}

func TestListActiveProductsErrors(t *testing.T) {
	tests := []struct {
		name    string
		token   http.HandlerFunc
		graphQL http.HandlerFunc
		wantErr string
	}{
		{
			name:    "token refused",
			token:   respondWith(http.StatusBadRequest, `{"error":"shop_not_permitted"}`),
			graphQL: respondWith(http.StatusOK, buildPageJSON(false, "")),
			wantErr: "shop_not_permitted",
		},
		{
			name:    "graphql status error",
			token:   respondWith(http.StatusOK, grantedTokenJSON),
			graphQL: respondWith(http.StatusUnauthorized, `{"errors":"[API] Invalid API key or access token"}`),
			wantErr: "Invalid API key or access token",
		},
		{
			name:    "graphql errors with a 200",
			token:   respondWith(http.StatusOK, grantedTokenJSON),
			graphQL: respondWith(http.StatusOK, `{"errors":[{"message":"Throttled","extensions":{"code":"THROTTLED"}}]}`),
			wantErr: "Throttled",
		},
		{
			name:    "http image url",
			token:   respondWith(http.StatusOK, grantedTokenJSON),
			graphQL: respondWith(http.StatusOK, buildPageJSON(false, "", buildProductWithImageJSON("http://cdn.shopify.com/front.jpg"))),
			wantErr: "not an https URL",
		},
		{
			name:    "empty image url",
			token:   respondWith(http.StatusOK, grantedTokenJSON),
			graphQL: respondWith(http.StatusOK, buildPageJSON(false, "", buildProductWithImageJSON(""))),
			wantErr: "not an https URL",
		},
		{
			name:    "next page with an empty cursor",
			token:   respondWith(http.StatusOK, grantedTokenJSON),
			graphQL: respondWith(http.StatusOK, buildPageJSON(true, "", buildProductJSON(1))),
			wantErr: "does not advance",
		},
		{
			name:  "next page with a cursor seen two pages back",
			token: respondWith(http.StatusOK, grantedTokenJSON),
			graphQL: func(w http.ResponseWriter, r *http.Request) {
				next := "cursor-a"
				if cursor := decodeGraphQLRequest(t, r).Variables.Cursor; cursor != nil && *cursor == "cursor-a" {
					next = "cursor-b"
				}
				_, _ = io.WriteString(w, buildPageJSON(true, next, buildProductJSON(1)))
			},
			wantErr: "does not advance",
		},
		{
			name:    "next page with the same cursor",
			token:   respondWith(http.StatusOK, grantedTokenJSON),
			graphQL: respondWith(http.StatusOK, buildPageJSON(true, "cursor-1", buildProductJSON(1))),
			wantErr: "does not advance",
		},
		{
			name:    "no data",
			token:   respondWith(http.StatusOK, grantedTokenJSON),
			graphQL: respondWith(http.StatusOK, `{}`),
			wantErr: "response has no products field",
		},
		{
			name:    "null products",
			token:   respondWith(http.StatusOK, grantedTokenJSON),
			graphQL: respondWith(http.StatusOK, `{"data":{"products":null}}`),
			wantErr: "response has no products field",
		},
		{
			name:    "product id of another resource",
			token:   respondWith(http.StatusOK, grantedTokenJSON),
			graphQL: respondWith(http.StatusOK, buildPageJSON(false, "", `{"id":"gid://shopify/Collection/1","media":{"nodes":[]}}`)),
			wantErr: "is not a Product ID",
		},
		{
			name:    "product id that is not a number",
			token:   respondWith(http.StatusOK, grantedTokenJSON),
			graphQL: respondWith(http.StatusOK, buildPageJSON(false, "", `{"id":"gid://shopify/Product/abc","media":{"nodes":[]}}`)),
			wantErr: "is not a Product ID",
		},
		{
			name:    "more images than one page holds",
			token:   respondWith(http.StatusOK, grantedTokenJSON),
			graphQL: respondWith(http.StatusOK, buildPageJSON(false, "", `{"id":"gid://shopify/Product/1","media":{"pageInfo":{"hasNextPage":true},"nodes":[]}}`)),
			wantErr: "has more than 50 images",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := newTestClient(t, tt.token, tt.graphQL)

			_, err := client.ListActiveProducts(context.Background())
			if err == nil {
				t.Fatal("expected an error")
			}
			if !strings.Contains(err.Error(), tt.wantErr) {
				t.Errorf("error %q does not contain %q", err, tt.wantErr)
			}
		})
	}
}
