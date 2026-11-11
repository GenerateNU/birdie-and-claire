package shopify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"birdie-and-claire/internal/config"
)

const (
	// Shopify retires each version about a year after it ships. The dates are at
	// shopify.dev/docs/api/usage/versioning.
	apiVersion        = "2026-10"
	tokenPath         = "/admin/oauth/access_token"
	graphQLPath       = "/admin/api/" + apiVersion + "/graphql.json"
	requestTimeout    = 30 * time.Second
	maxErrorBodyBytes = 4 << 10
	// The product with the most images had 22 when this was set.
	imagesPerProduct = 50
)

// productsQuery requests about 110 of the 1000 points Shopify allows one query.
const productsQuery = `query ActiveProducts($cursor: String, $imagesPerProduct: Int!) {
  products(first: 25, after: $cursor, query: "status:active") {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      handle
      title
      productType
      category { fullName }
      tags
      media(first: $imagesPerProduct, query: "media_type:IMAGE") {
        pageInfo { hasNextPage }
        nodes {
          id
          ... on MediaImage { image { url altText width height } }
        }
      }
    }
  }
}`

type adminClient struct {
	config.ShopifyConfig
	http *http.Client
}

// New returns a CatalogSource backed by the store's GraphQL Admin API.
func New(cfg config.ShopifyConfig) CatalogSource {
	return &adminClient{
		ShopifyConfig: cfg,
		http:          &http.Client{Timeout: requestTimeout},
	}
}

type tokenResponse struct {
	AccessToken string `json:"access_token"`
}

type graphQLRequest struct {
	Query     string            `json:"query"`
	Variables productsVariables `json:"variables"`
}

type productsVariables struct {
	// nil asks for the first page
	Cursor           *string `json:"cursor"`
	ImagesPerProduct int     `json:"imagesPerProduct"`
}

type graphQLError struct {
	Message string `json:"message"`
}

type productsResponse struct {
	Data struct {
		Products *productPage `json:"products"`
	} `json:"data"`
	Errors []graphQLError `json:"errors"`
}

type productPage struct {
	PageInfo struct {
		HasNextPage bool   `json:"hasNextPage"`
		EndCursor   string `json:"endCursor"`
	} `json:"pageInfo"`
	Nodes []productNode `json:"nodes"`
}

type productNode struct {
	ID          string `json:"id"`
	Handle      string `json:"handle"`
	Title       string `json:"title"`
	ProductType string `json:"productType"`
	Category    struct {
		FullName string `json:"fullName"`
	} `json:"category"`
	Tags  []string `json:"tags"`
	Media struct {
		PageInfo struct {
			HasNextPage bool `json:"hasNextPage"`
		} `json:"pageInfo"`
		Nodes []mediaNode `json:"nodes"`
	} `json:"media"`
}

type mediaNode struct {
	ID string `json:"id"`
	// null until Shopify finishes processing the upload
	Image *struct {
		URL     string `json:"url"`
		AltText string `json:"altText"`
		Width   int    `json:"width"`
		Height  int    `json:"height"`
	} `json:"image"`
}

func (c *adminClient) ListActiveProducts(ctx context.Context) ([]ShopifyProduct, error) {
	// A client credentials token lasts 24 hours and can't be refreshed, so
	// every run asks for a new one instead of tracking its expiry.
	token, err := c.requestAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	var products []ShopifyProduct
	var cursor *string
	for {
		page, err := c.queryProducts(ctx, token, cursor)
		if err != nil {
			return nil, err
		}
		for _, node := range page.Nodes {
			product, err := parseProduct(node)
			if err != nil {
				return nil, err
			}
			products = append(products, product)
		}
		if !page.PageInfo.HasNextPage {
			return products, nil
		}
		cursor = &page.PageInfo.EndCursor
	}
}

func (c *adminClient) requestAccessToken(ctx context.Context) (string, error) {
	form := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {c.ClientID},
		"client_secret": {c.ClientSecret},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.URL+tokenPath, strings.NewReader(form.Encode()))
	if err != nil {
		return "", fmt.Errorf("shopify: build token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	var token tokenResponse
	if err := c.do(req, &token); err != nil {
		return "", fmt.Errorf("shopify: request access token: %w", err)
	}
	return token.AccessToken, nil
}

func (c *adminClient) queryProducts(ctx context.Context, token string, cursor *string) (productPage, error) {
	body, err := json.Marshal(graphQLRequest{
		Query:     productsQuery,
		Variables: productsVariables{Cursor: cursor, ImagesPerProduct: imagesPerProduct},
	})
	if err != nil {
		return productPage{}, fmt.Errorf("shopify: encode products query: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.URL+graphQLPath, bytes.NewReader(body))
	if err != nil {
		return productPage{}, fmt.Errorf("shopify: build products query: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Shopify-Access-Token", token)

	var decoded productsResponse
	if err := c.do(req, &decoded); err != nil {
		return productPage{}, fmt.Errorf("shopify: query products: %w", err)
	}

	// GraphQL answers a failed query, throttling included, with a 200.
	if len(decoded.Errors) > 0 {
		messages := make([]string, len(decoded.Errors))
		for i, graphQLErr := range decoded.Errors {
			messages[i] = graphQLErr.Message
		}
		return productPage{}, fmt.Errorf("shopify: query products: %s", strings.Join(messages, "; "))
	}
	// Read as an empty page, a missing field would tell the sync the store has
	// no products, and it would archive the whole catalog.
	if decoded.Data.Products == nil {
		return productPage{}, fmt.Errorf("shopify: query products: response has no products field")
	}
	return *decoded.Data.Products, nil
}

// do sends req and decodes a 200 response into target.
func (c *adminClient) do(req *http.Request, target any) error {
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return readStatusError(resp)
	}
	if err := json.NewDecoder(resp.Body).Decode(target); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}
	return nil
}

// readStatusError keeps Shopify's body in the message because it says why the
// request was refused, such as a store outside the app's organization.
func readStatusError(resp *http.Response) error {
	detail, err := io.ReadAll(io.LimitReader(resp.Body, maxErrorBodyBytes))
	if err != nil {
		return fmt.Errorf("%s: read body: %w", resp.Status, err)
	}
	return fmt.Errorf("%s: %s", resp.Status, bytes.TrimSpace(detail))
}

func parseProduct(node productNode) (ShopifyProduct, error) {
	id, err := parseGID(node.ID, "Product")
	if err != nil {
		return ShopifyProduct{}, err
	}
	// A partial list would make the sync delete the images left off it.
	if node.Media.PageInfo.HasNextPage {
		return ShopifyProduct{}, fmt.Errorf("shopify: product %d has more than %d images, the most the client fetches per product", id, imagesPerProduct)
	}

	images := make([]ShopifyImage, 0, len(node.Media.Nodes))
	for i, media := range node.Media.Nodes {
		if media.Image == nil {
			continue
		}
		imageID, err := parseGID(media.ID, "MediaImage")
		if err != nil {
			return ShopifyProduct{}, err
		}
		images = append(images, ShopifyImage{
			ID:      imageID,
			URL:     media.Image.URL,
			AltText: media.Image.AltText,
			Width:   media.Image.Width,
			Height:  media.Image.Height,
			// The API has no position field. Media comes back in the store's order.
			Position: i + 1,
		})
	}

	return ShopifyProduct{
		ID:          id,
		Handle:      node.Handle,
		Title:       node.Title,
		ProductType: node.ProductType,
		Category:    node.Category.FullName,
		Tags:        node.Tags,
		Images:      images,
	}, nil
}

// parseGID returns the number at the end of a Shopify global ID such as
// gid://shopify/Product/123, which is what our shopify_id columns hold.
func parseGID(gid, resource string) (int64, error) {
	raw, found := strings.CutPrefix(gid, "gid://shopify/"+resource+"/")
	if !found {
		return 0, fmt.Errorf("shopify: %q is not a %s ID", gid, resource)
	}
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("shopify: %q is not a %s ID: %w", gid, resource, err)
	}
	return id, nil
}
