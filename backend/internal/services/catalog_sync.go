package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"net/url"
	"slices"
	"strings"

	"birdie-and-claire/internal/embedder"
	"birdie-and-claire/internal/llm"
	"birdie-and-claire/internal/log"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/shopify"
)

// Shopify's taxonomy category, matched on the prefix of its full name. The first
// match wins. Categories that don't fill exactly one slot, such as swimwear,
// sleepwear, underwear, suits, and outfit sets, have no rule, so the sync skips them.
var slotsByCategory = []struct {
	prefix string
	slot   models.ProductSlot
}{
	{"Apparel & Accessories > Clothing > Clothing Tops", models.SlotTop},
	{"Apparel & Accessories > Clothing > Swimwear > Cover Ups", models.SlotTop},
	{"Apparel & Accessories > Clothing > Outerwear > Coats & Jackets", models.SlotTop},
	{"Apparel & Accessories > Clothing > Outerwear > Vests", models.SlotTop},
	{"Apparel & Accessories > Clothing > Activewear > Activewear Tops", models.SlotTop},
	{"Apparel & Accessories > Clothing > Activewear > Activewear Sweatshirts & Hoodies", models.SlotTop},
	{"Apparel & Accessories > Clothing > Activewear > Activewear Vests & Jackets", models.SlotTop},
	{"Apparel & Accessories > Clothing > Maternity Clothing > Maternity Tops", models.SlotTop},
	{"Apparel & Accessories > Clothing > Maternity Clothing > Maternity Outerwear", models.SlotTop},

	{"Apparel & Accessories > Clothing > Skirts", models.SlotBottom},
	{"Apparel & Accessories > Clothing > Skorts", models.SlotBottom},
	{"Apparel & Accessories > Clothing > Pants", models.SlotBottom},
	{"Apparel & Accessories > Clothing > Shorts", models.SlotBottom},
	{"Apparel & Accessories > Clothing > Activewear > Activewear Pants", models.SlotBottom},
	{"Apparel & Accessories > Clothing > Maternity Clothing > Maternity Pants", models.SlotBottom},
	{"Apparel & Accessories > Clothing > Maternity Clothing > Maternity Skirts", models.SlotBottom},

	{"Apparel & Accessories > Clothing > Dresses", models.SlotOnePiece},
	{"Apparel & Accessories > Clothing > One-Pieces", models.SlotOnePiece},
	{"Apparel & Accessories > Clothing > Wedding & Bridal Party Dresses", models.SlotOnePiece},
	{"Apparel & Accessories > Clothing > Maternity Clothing > Maternity Dresses", models.SlotOnePiece},
	{"Apparel & Accessories > Clothing > Maternity Clothing > Maternity One-Pieces", models.SlotOnePiece},

	{"Apparel & Accessories > Shoes", models.SlotShoe},

	{"Apparel & Accessories > Clothing Accessories", models.SlotAccessory},
	{"Apparel & Accessories > Jewelry", models.SlotAccessory},
	{"Apparel & Accessories > Handbags, Wallets & Cases", models.SlotAccessory},
	{"Luggage & Bags", models.SlotAccessory},
}

// Store merchandising tags, lowercase. They describe a campaign or a price band,
// not the clothes, so the sync stores and embeds a product without them.
var (
	marketingTags        = []string{"bestseller", "new", "mod"}
	marketingTagPrefixes = []string{"gifts", "quiz results"}
)

const (
	// Shopify's CDN resizes an image to this width before it is embedded or
	// labeled, which keeps every image under the embedder's 10 MB limit.
	imageWidth = "1024"
	// The first images are the product on its own and on a model. Later ones
	// repeat them in other colors, which the store details already list.
	labeledImagesPerProduct = 3
)

type CatalogSyncService interface {
	// Sync makes the products table match the store's active products. A product
	// whose attributes or embedding fail to refresh is retried on the next run, and
	// its error is returned after every other product is synced.
	Sync(ctx context.Context) error
}

type catalogSyncService struct {
	repo     *repository.Repository
	catalog  shopify.CatalogSource
	embedder embedder.Embedder
	llm      llm.Client
}

func NewCatalogSyncService(repo *repository.Repository, catalog shopify.CatalogSource, emb embedder.Embedder, llmClient llm.Client) CatalogSyncService {
	return &catalogSyncService{repo: repo, catalog: catalog, embedder: emb, llm: llmClient}
}

func (s *catalogSyncService) Sync(ctx context.Context) error {
	products, err := s.catalog.ListActiveProducts(ctx)
	if err != nil {
		return fmt.Errorf("list active shopify products: %w", err)
	}
	// An empty answer would deactivate the whole catalog. A real store with no
	// active products is less likely than a bad response.
	if len(products) == 0 {
		return errors.New("shopify returned no active products, so nothing was synced")
	}

	syncedShopifyIDs := make([]int64, 0, len(products))
	var refreshErrs []error
	for _, product := range products {
		slot, found := slotForCategory(product.Category)
		if !found {
			log.Warn(ctx, "catalog sync: skipped a product no slot rule matches", "shopify_id", product.ID, "category", product.Category)
			continue
		}

		// cloned, because filtering in place would rewrite the caller's slice
		product.Tags = slices.DeleteFunc(slices.Clone(product.Tags), isMarketingTag)
		synced, err := s.repo.Product.UpsertShopifyProduct(ctx, product, slot)
		if err != nil {
			return err
		}
		syncedShopifyIDs = append(syncedShopifyIDs, product.ID)
		// Replacing images from an incomplete list would delete the ones still
		// processing, so the images and embedding wait for a run that has them all.
		if product.HasProcessingImages {
			log.Warn(ctx, "catalog sync: kept a product's images while Shopify processes one", "shopify_id", product.ID)
			continue
		}
		if err := s.repo.ProductImage.ReplaceShopifyImages(ctx, synced.ID, product.Images); err != nil {
			return err
		}
		if err := s.refreshAttributesAndEmbedding(ctx, product, slot, synced); err != nil {
			refreshErrs = append(refreshErrs, fmt.Errorf("shopify product %d: %w", product.ID, err))
		}
	}
	// Every product was skipped, which more likely means the categories came back
	// wrong than that the store sells nothing the app can use.
	if len(syncedShopifyIDs) == 0 {
		return errors.New("no shopify product matched a slot, so nothing was deactivated")
	}

	deactivated, err := s.repo.Product.DeactivateShopifyProductsExcept(ctx, syncedShopifyIDs)
	if err != nil {
		return err
	}
	log.Debug(ctx, "catalog sync: done", "synced", len(syncedShopifyIDs), "deactivated", deactivated, "refresh_failures", len(refreshErrs))
	return errors.Join(refreshErrs...)
}

// refreshAttributesAndEmbedding refreshes each on its own, so a product that fails to label still gets its vector.
func (s *catalogSyncService) refreshAttributesAndEmbedding(ctx context.Context, product shopify.ShopifyProduct, slot models.ProductSlot, synced repository.SyncedProduct) error {
	// A product with no image has no picture to show in an outfit, so it is not recommended or labeled.
	if len(product.Images) == 0 {
		return s.repo.Product.ClearEmbedding(ctx, synced.ID)
	}
	var refreshErrs []error
	if err := s.refreshAttributes(ctx, product, slot, synced); err != nil {
		refreshErrs = append(refreshErrs, fmt.Errorf("refresh attributes: %w", err))
	}
	if err := s.refreshEmbedding(ctx, product, synced); err != nil {
		refreshErrs = append(refreshErrs, fmt.Errorf("refresh embedding: %w", err))
	}
	return errors.Join(refreshErrs...)
}

// refreshAttributes labels the product again only when what it is labeled from changed.
func (s *catalogSyncService) refreshAttributes(ctx context.Context, product shopify.ShopifyProduct, slot models.ProductSlot, synced repository.SyncedProduct) error {
	input, err := labelInput(product, slot)
	if err != nil {
		return err
	}
	hash, err := llm.LabelInputHash(input)
	if err != nil {
		return err
	}
	if synced.AttributesHash != nil && *synced.AttributesHash == hash {
		return nil
	}

	attributes, err := llm.LabelProduct(ctx, s.llm, input)
	if err != nil {
		return err
	}
	return s.repo.Product.SaveAttributes(ctx, synced.ID, attributes, hash)
}

// refreshEmbedding leaves the attributes out of the embedded text. On the store's catalog, adding them retrieved no
// better than the title and store tags alone, and the embedder reads only the first 77 tokens.
func (s *catalogSyncService) refreshEmbedding(ctx context.Context, product shopify.ShopifyProduct, synced repository.SyncedProduct) error {
	text := strings.Join(append([]string{product.Title}, product.Tags...), ", ")
	imageURL, err := resizedImageURL(product.Images[0].URL)
	if err != nil {
		return err
	}
	hash := hashInputs(text, imageURL)
	if synced.EmbeddingHash != nil && *synced.EmbeddingHash == hash {
		return nil
	}
	embedding, err := s.embedProduct(ctx, text, imageURL)
	if err != nil {
		return err
	}
	return s.repo.Product.SaveEmbedding(ctx, synced.ID, embedding, hash)
}

func labelInput(product shopify.ShopifyProduct, slot models.ProductSlot) (llm.ProductLabelInput, error) {
	var storeDetails []string
	for _, option := range product.Options {
		storeDetails = append(storeDetails, option.Name+": "+strings.Join(option.Values, ", "))
	}
	if product.FabricInfo != "" {
		storeDetails = append(storeDetails, "fabric: "+product.FabricInfo)
	}
	if len(product.Materials) > 0 {
		storeDetails = append(storeDetails, "materials: "+strings.Join(product.Materials, ", "))
	}
	if product.ModelInfo != "" {
		storeDetails = append(storeDetails, "fit: "+product.ModelInfo)
	}

	imageURLs := make([]string, 0, labeledImagesPerProduct)
	for _, image := range product.Images[:min(len(product.Images), labeledImagesPerProduct)] {
		imageURL, err := resizedImageURL(image.URL)
		if err != nil {
			return llm.ProductLabelInput{}, err
		}
		imageURLs = append(imageURLs, imageURL)
	}

	return llm.ProductLabelInput{
		Slot:         slot,
		Title:        product.Title,
		Description:  product.Description,
		Tags:         product.Tags,
		StoreDetails: storeDetails,
		ImageURLs:    imageURLs,
	}, nil
}

func slotForCategory(category string) (models.ProductSlot, bool) {
	for _, rule := range slotsByCategory {
		if strings.HasPrefix(category, rule.prefix) {
			return rule.slot, true
		}
	}
	return "", false
}

func isMarketingTag(tag string) bool {
	lowerTag := strings.ToLower(tag)
	if slices.Contains(marketingTags, lowerTag) {
		return true
	}
	for _, prefix := range marketingTagPrefixes {
		if strings.HasPrefix(lowerTag, prefix) {
			return true
		}
	}
	return false
}

// resizedImageURL keeps the URL's existing query, which on Shopify's CDN holds the
// image version.
func resizedImageURL(imageURL string) (string, error) {
	parsed, err := url.Parse(imageURL)
	if err != nil {
		return "", fmt.Errorf("parse image url: %w", err)
	}
	query := parsed.Query()
	query.Set("width", imageWidth)
	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}

func hashInputs(inputs ...string) string {
	sum := sha256.Sum256([]byte(strings.Join(inputs, "\n")))
	return hex.EncodeToString(sum[:])
}

// embedProduct sums the text and image vectors and normalizes the result, which
// is how the seeded products' vectors were built.
func (s *catalogSyncService) embedProduct(ctx context.Context, text, imageURL string) ([]float32, error) {
	embedding, err := s.embedder.EmbedText(ctx, text)
	if err != nil {
		return nil, err
	}
	imageEmbedding, err := s.embedder.EmbedImage(ctx, imageURL)
	if err != nil {
		return nil, err
	}
	if len(imageEmbedding) != len(embedding) {
		return nil, fmt.Errorf("text vector has %d values and image vector has %d", len(embedding), len(imageEmbedding))
	}
	for i := range embedding {
		embedding[i] += imageEmbedding[i]
	}

	var squares float64
	for _, value := range embedding {
		squares += float64(value) * float64(value)
	}
	norm := float32(math.Sqrt(squares))
	if norm == 0 {
		return nil, errors.New("embedding is all zeros")
	}
	for i := range embedding {
		embedding[i] /= norm
	}
	return embedding, nil
}
