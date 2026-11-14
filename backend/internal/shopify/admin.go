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
	"birdie-and-claire/internal/log"
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
	// Set above the variant count of any product when this was set.
	variantsPerProduct = 100
)

// productsQuery has to stay under the 1000 points Shopify allows one query, so
// check its cost when raising imagesPerProduct or variantsPerProduct.
const productsQuery = `query ActiveProducts($cursor: String, $imagesPerProduct: Int!, $variantsPerProduct: Int!) {
  products(first: 25, after: $cursor, query: "status:active") {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      handle
      title
      productType
      description
      category { fullName }
      tags
      options { name values }
      fabricInfo: metafield(namespace: "custom", key: "fabric_info") { value }
      materials: metafield(namespace: "custom", key: "materials") { value }
      modelInfo: metafield(namespace: "custom", key: "model_info") { value }
      media(first: $imagesPerProduct, query: "media_type:IMAGE") {
        pageInfo { hasNextPage }
        nodes {
          id
          ... on MediaImage { status image { url altText width height } }
        }
      }
      variants(first: $variantsPerProduct) {
        pageInfo { hasNextPage }
        nodes { id availableForSale position }
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
	Cursor             *string `json:"cursor"`
	ImagesPerProduct   int     `json:"imagesPerProduct"`
	VariantsPerProduct int     `json:"variantsPerProduct"`
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
	Description string `json:"description"`
	Category    struct {
		FullName string `json:"fullName"`
	} `json:"category"`
	Tags    []string `json:"tags"`
	Options []struct {
		Name   string   `json:"name"`
		Values []string `json:"values"`
	} `json:"options"`
	// null when the product has no value for the metafield
	FabricInfo *metafieldNode `json:"fabricInfo"`
	Materials  *metafieldNode `json:"materials"`
	ModelInfo  *metafieldNode `json:"modelInfo"`
	Media      struct {
		PageInfo struct {
			HasNextPage bool `json:"hasNextPage"`
		} `json:"pageInfo"`
		Nodes []mediaNode `json:"nodes"`
	} `json:"media"`
	Variants variantPage `json:"variants"`
}

type variantPage struct {
	PageInfo struct {
		HasNextPage bool `json:"hasNextPage"`
	} `json:"pageInfo"`
	Nodes []variantNode `json:"nodes"`
}

type variantNode struct {
	ID               string `json:"id"`
	AvailableForSale bool   `json:"availableForSale"`
	Position         int    `json:"position"`
}

type metafieldNode struct {
	Value string `json:"value"`
}

type mediaNode struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	// null until Shopify finishes processing the upload, and for good if processing failed
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
	seenCursors := map[string]bool{}
	for {
		page, err := c.queryProducts(ctx, token, cursor)
		if err != nil {
			return nil, err
		}
		pageProducts, err := c.parseProducts(ctx, page.Nodes)
		if err != nil {
			return nil, err
		}
		products = append(products, pageProducts...)
		if !page.PageInfo.HasNextPage {
			return products, nil
		}
		// A cursor seen before would ask for the same pages forever.
		if page.PageInfo.EndCursor == "" || seenCursors[page.PageInfo.EndCursor] {
			return nil, fmt.Errorf("shopify: query products: next page has cursor %q, which does not advance", page.PageInfo.EndCursor)
		}
		seenCursors[page.PageInfo.EndCursor] = true
		cursor = &page.PageInfo.EndCursor
	}
}

func (c *adminClient) parseProducts(ctx context.Context, nodes []productNode) ([]ShopifyProduct, error) {
	products := make([]ShopifyProduct, 0, len(nodes))
	for _, node := range nodes {
		product, err := parseProduct(ctx, node)
		if err != nil {
			return nil, err
		}
		// The sync keeps the stored images while one is processing, so scoring
		// them would be wasted.
		if !product.HasProcessingImages {
			if scored := c.putGarmentShotFirst(ctx, product); scored != nil {
				product.Images = scored
			}
		}
		products = append(products, product)
	}
	return products, nil
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
		Variables: productsVariables{Cursor: cursor, ImagesPerProduct: imagesPerProduct, VariantsPerProduct: variantsPerProduct},
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

func parseProduct(ctx context.Context, node productNode) (ShopifyProduct, error) {
	id, err := parseGID(node.ID, "Product")
	if err != nil {
		return ShopifyProduct{}, err
	}
	// A partial list would make the sync delete the images left off it.
	if node.Media.PageInfo.HasNextPage {
		return ShopifyProduct{}, fmt.Errorf("shopify: product %d has more than %d images, the most the client fetches per product", id, imagesPerProduct)
	}

	images := make([]ShopifyImage, 0, len(node.Media.Nodes))
	hasProcessingImages := false
	for i, media := range node.Media.Nodes {
		if media.Image == nil {
			// A failed image never gets a URL, so it is left out instead of
			// holding back the product's images on every run.
			if media.Status != "FAILED" {
				hasProcessingImages = true
			}
			continue
		}
		imageID, err := parseGID(media.ID, "MediaImage")
		if err != nil {
			return ShopifyProduct{}, err
		}
		imageURL, err := url.Parse(media.Image.URL)
		if err != nil || imageURL.Scheme != "https" || imageURL.Host == "" {
			return ShopifyProduct{}, fmt.Errorf("shopify: image %d of product %d has %q, not an https URL", imageID, id, media.Image.URL)
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

	variants, err := parseVariants(id, node.Variants)
	if err != nil {
		return ShopifyProduct{}, err
	}

	options := make([]ShopifyOption, len(node.Options))
	for i, option := range node.Options {
		options[i] = ShopifyOption{Name: option.Name, Values: option.Values}
	}
	var materials []string
	// A list metafield's value is the list encoded as a JSON string. Store staff can redefine the metafield as plain
	// text, and that should cost the product its materials, not stop the whole sync.
	if node.Materials != nil && json.Unmarshal([]byte(node.Materials.Value), &materials) != nil {
		log.Warn(ctx, "shopify: left out a product's materials, which are not a JSON list", "shopify_id", id)
		materials = nil
	}

	return ShopifyProduct{
		ID:                  id,
		Handle:              node.Handle,
		Title:               node.Title,
		ProductType:         node.ProductType,
		Description:         node.Description,
		Category:            node.Category.FullName,
		Tags:                node.Tags,
		Options:             options,
		FabricInfo:          metafieldValue(node.FabricInfo),
		Materials:           materials,
		ModelInfo:           metafieldValue(node.ModelInfo),
		Images:              images,
		Variants:            variants,
		HasProcessingImages: hasProcessingImages,
	}, nil
}

func parseVariants(productID int64, page variantPage) ([]ShopifyVariant, error) {
	// A partial list would make the sync delete the variants left off it.
	if page.PageInfo.HasNextPage {
		return nil, fmt.Errorf("shopify: product %d has more than %d variants, the most the client fetches per product", productID, variantsPerProduct)
	}
	// Shopify gives every product a variant, so none means the response is wrong.
	if len(page.Nodes) == 0 {
		return nil, fmt.Errorf("shopify: product %d has no variants", productID)
	}

	variants := make([]ShopifyVariant, 0, len(page.Nodes))
	for _, variant := range page.Nodes {
		variantID, err := parseGID(variant.ID, "ProductVariant")
		if err != nil {
			return nil, err
		}
		variants = append(variants, ShopifyVariant{ID: variantID, Available: variant.AvailableForSale, Position: variant.Position})
	}
	return variants, nil
}

func metafieldValue(metafield *metafieldNode) string {
	if metafield == nil {
		return ""
	}
	return metafield.Value
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
