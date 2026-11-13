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
	"birdie-and-claire/internal/log"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/shopify"

	"github.com/google/uuid"
)

// Shopify's taxonomy category, matched on the prefix of its full name. The first
// match wins.
var slotsByCategory = []struct {
	prefix string
	slot   models.ProductSlot
}{
	{"Apparel & Accessories > Clothing > Clothing Tops", models.SlotTop},
	{"Apparel & Accessories > Clothing > Swimwear > Cover Ups", models.SlotTop},
	{"Apparel & Accessories > Clothing > Skirts", models.SlotBottom},
	{"Apparel & Accessories > Clothing Accessories", models.SlotAccessory},
	{"Luggage & Bags", models.SlotAccessory},
}

// A one-piece takes the place of a top and a bottom, which no slot can hold yet (#117).
var onePieceCategories = []string{
	"Apparel & Accessories > Clothing > Dresses",
	"Apparel & Accessories > Clothing > One-Pieces",
}

// Store merchandising tags, lowercase. They describe a campaign or a price band,
// not the clothes, so the sync stores and embeds a product without them.
var (
	marketingTags        = []string{"bestseller", "new", "mod"}
	marketingTagPrefixes = []string{"gifts", "quiz results"}
)

// Shopify's CDN resizes an image to this width before it is embedded, which
// keeps every image under the embedder's 10 MB limit.
const embeddingImageWidth = "1024"

type CatalogSyncService interface {
	// Sync makes the products table match the store's active products. A product
	// whose embedding fails to refresh is retried on the next run, and its error is
	// returned after every other product is synced.
	Sync(ctx context.Context) error
}

type catalogSyncService struct {
	repo     *repository.Repository
	catalog  shopify.CatalogSource
	embedder embedder.Embedder
}

func NewCatalogSyncService(repo *repository.Repository, catalog shopify.CatalogSource, emb embedder.Embedder) CatalogSyncService {
	return &catalogSyncService{repo: repo, catalog: catalog, embedder: emb}
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
	var embedErrs []error
	for _, product := range products {
		slot, found := slotForCategory(product.Category)
		if !found {
			if !isOnePiece(product.Category) {
				log.Warn(ctx, "catalog sync: skipped a product no slot rule matches", "shopify_id", product.ID, "category", product.Category)
			}
			continue
		}

		// cloned, because filtering in place would rewrite the caller's slice
		product.Tags = slices.DeleteFunc(slices.Clone(product.Tags), isMarketingTag)
		productID, storedHash, err := s.repo.Product.UpsertShopifyProduct(ctx, product, slot)
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
		if err := s.repo.ProductImage.ReplaceShopifyImages(ctx, productID, product.Images); err != nil {
			return err
		}
		if err := s.refreshEmbedding(ctx, product, productID, storedHash); err != nil {
			embedErrs = append(embedErrs, fmt.Errorf("refresh embedding of shopify product %d: %w", product.ID, err))
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
	log.Debug(ctx, "catalog sync: done", "synced", len(syncedShopifyIDs), "deactivated", deactivated, "embed_failures", len(embedErrs))
	return errors.Join(embedErrs...)
}

func (s *catalogSyncService) refreshEmbedding(ctx context.Context, product shopify.ShopifyProduct, productID uuid.UUID, storedHash *string) error {
	// A product with no image has no picture to show in an outfit, so it is not recommended.
	if len(product.Images) == 0 {
		return s.repo.Product.ClearEmbedding(ctx, productID)
	}

	text := strings.Join(append([]string{product.Title}, product.Tags...), ", ")
	imageURL, err := resizedImageURL(product.Images[0].URL)
	if err != nil {
		return err
	}
	hash := hashEmbeddingInputs(text, imageURL)
	if storedHash != nil && *storedHash == hash {
		return nil
	}
	embedding, err := s.embedProduct(ctx, text, imageURL)
	if err != nil {
		return err
	}
	return s.repo.Product.SaveEmbedding(ctx, productID, embedding, hash)
}

func slotForCategory(category string) (models.ProductSlot, bool) {
	for _, rule := range slotsByCategory {
		if strings.HasPrefix(category, rule.prefix) {
			return rule.slot, true
		}
	}
	return "", false
}

func isOnePiece(category string) bool {
	for _, prefix := range onePieceCategories {
		if strings.HasPrefix(category, prefix) {
			return true
		}
	}
	return false
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
	query.Set("width", embeddingImageWidth)
	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}

func hashEmbeddingInputs(text, imageURL string) string {
	sum := sha256.Sum256([]byte(text + "\n" + imageURL))
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
