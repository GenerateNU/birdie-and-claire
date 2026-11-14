package services

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/log"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/utils/pagination"

	"github.com/google/uuid"
)

// OutfitService saves outfits for the authenticated user, reads them back, and
// shares them by public link.
type OutfitService interface {
	Create(ctx context.Context, params models.CreateOutfitParams) (models.OutfitDetailResponse, error)
	Get(ctx context.Context, id uuid.UUID) (models.OutfitDetailResponse, error)
	Update(ctx context.Context, id uuid.UUID, params models.UpdateOutfitParams) (models.OutfitDetailResponse, error)
	List(ctx context.Context, params pagination.CursorParams) (models.ListOutfitsResponse, error)
	Share(ctx context.Context, id uuid.UUID) (models.ShareOutfitResponse, error)
	Unshare(ctx context.Context, id uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetShared(ctx context.Context, id uuid.UUID) (models.SharedOutfitResponse, error)
	// Suggest returns products like each requested product, leaving out the outfit's products and the requested ones.
	// A product missing from the catalog fails the call with errs.ErrNotFound.
	Suggest(ctx context.Context, id uuid.UUID, productIDs []uuid.UUID, limit int) (models.OutfitSuggestionsResponse, error)
}

type outfitService struct {
	repo    *repository.Repository
	shopURL string
}

func NewOutfitService(repo *repository.Repository, shopURL string) OutfitService {
	return &outfitService{repo: repo, shopURL: shopURL}
}

func (s *outfitService) Create(ctx context.Context, params models.CreateOutfitParams) (models.OutfitDetailResponse, error) {
	userID := auth.UserID(ctx)
	outfit, products, err := s.repo.Outfit.Create(ctx, params, userID)
	if err != nil {
		return models.OutfitDetailResponse{}, err
	}
	return s.buildDetailResponse(ctx, userID, outfit, products)
}

func (s *outfitService) Get(ctx context.Context, id uuid.UUID) (models.OutfitDetailResponse, error) {
	userID := auth.UserID(ctx)
	outfit, products, err := s.repo.Outfit.GetByID(ctx, id, userID)
	if err != nil {
		return models.OutfitDetailResponse{}, err
	}
	return s.buildDetailResponse(ctx, userID, outfit, products)
}

func (s *outfitService) Update(ctx context.Context, id uuid.UUID, params models.UpdateOutfitParams) (models.OutfitDetailResponse, error) {
	userID := auth.UserID(ctx)
	outfit, products, err := s.repo.Outfit.Update(ctx, id, params, userID)
	if err != nil {
		return models.OutfitDetailResponse{}, err
	}
	return s.buildDetailResponse(ctx, userID, outfit, products)
}

// buildDetailResponse adds ownership and cart links to an outfit's products. A product gets a cart link when it is a
// Birdie & Claire product that is active, not owned by userID, and has an available variant.
func (s *outfitService) buildDetailResponse(ctx context.Context, userID uuid.UUID, outfit models.Outfit, products []models.ProductResponse) (models.OutfitDetailResponse, error) {
	productIDs := make([]uuid.UUID, 0, len(products))
	for _, product := range products {
		productIDs = append(productIDs, product.ID)
	}
	infos, err := s.repo.Product.FindPurchaseInfo(ctx, userID, productIDs)
	if err != nil {
		return models.OutfitDetailResponse{}, err
	}

	detailProducts := make([]models.OutfitDetailProductResponse, 0, len(products))
	var cartItems []string
	for _, product := range products {
		info := infos[product.ID]
		detail := models.OutfitDetailProductResponse{ProductResponse: product, Owned: info.Owned}
		if product.Source == models.SourceBirdieAndClaire && info.Active && !info.Owned && info.VariantShopifyID != nil {
			item := fmt.Sprintf("%d:1", *info.VariantShopifyID)
			detail.CartURL = s.cartURL(item)
			cartItems = append(cartItems, item)
		}
		detailProducts = append(detailProducts, detail)
	}

	response := models.OutfitDetailResponse{Outfit: outfit, Products: detailProducts}
	if len(cartItems) > 0 {
		response.AddAllToCartURL = s.cartURL(cartItems...)
	}
	return response, nil
}

// cartURL builds a Shopify cart link from lines of variant:quantity.
func (s *outfitService) cartURL(cartItems ...string) string {
	return s.shopURL + "/cart/" + strings.Join(cartItems, ",")
}

func (s *outfitService) List(ctx context.Context, params pagination.CursorParams) (models.ListOutfitsResponse, error) {
	rows, total, err := s.repo.Outfit.List(ctx, auth.UserID(ctx), params)
	if err != nil {
		return models.ListOutfitsResponse{}, err
	}

	outfits, hasMore := pagination.Split(rows, params.Limit)
	response := models.ListOutfitsResponse{
		Page:  pagination.Page[models.OutfitResponse]{Items: outfits, HasMore: hasMore},
		Total: total,
	}
	if !hasMore {
		return response, nil
	}

	last := outfits[len(outfits)-1]
	nextCursor, err := pagination.CursorFields{"created_at": last.CreatedAt, "id": last.ID}.Encode()
	if err != nil {
		return models.ListOutfitsResponse{}, err
	}
	response.NextCursor = &nextCursor
	return response, nil
}

func (s *outfitService) Share(ctx context.Context, id uuid.UUID) (models.ShareOutfitResponse, error) {
	if err := s.repo.Outfit.Share(ctx, id, auth.UserID(ctx)); err != nil {
		return models.ShareOutfitResponse{}, err
	}

	// A path, not a full URL: the frontend knows its own origin, and in a PR preview the backend can't.
	return models.ShareOutfitResponse{URL: "/o/" + id.String()}, nil
}

func (s *outfitService) Unshare(ctx context.Context, id uuid.UUID) error {
	return s.repo.Outfit.Unshare(ctx, id, auth.UserID(ctx))
}

func (s *outfitService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Outfit.Delete(ctx, id, auth.UserID(ctx))
}

func (s *outfitService) GetShared(ctx context.Context, id uuid.UUID) (models.SharedOutfitResponse, error) {
	outfit, ownerName, products, err := s.repo.Outfit.GetShared(ctx, id)
	if err != nil {
		return models.SharedOutfitResponse{}, err
	}
	return models.SharedOutfitResponse{
		ID:          outfit.ID,
		Name:        outfit.Name,
		Description: outfit.Description,
		Tags:        outfit.Tags,
		OwnerID:     outfit.UserID,
		OwnerName:   ownerName,
		Products:    products,
	}, nil
}

// DescribeSharedOutfit returns generic preview text without exposing the owner's name.
func DescribeSharedOutfit(outfit models.SharedOutfitResponse) string {
	pieces := fmt.Sprintf("%d pieces", len(outfit.Products))
	if len(outfit.Products) == 1 {
		pieces = "1 piece"
	}
	return "An outfit shared on Birdie & Claire · " + pieces
}

func (s *outfitService) Suggest(ctx context.Context, id uuid.UUID, productIDs []uuid.UUID, limit int) (models.OutfitSuggestionsResponse, error) {
	_, products, err := s.repo.Outfit.GetByID(ctx, id, auth.UserID(ctx))
	if err != nil {
		return models.OutfitSuggestionsResponse{}, err
	}

	excludeProductIDs := slices.Clone(productIDs)
	for _, product := range products {
		excludeProductIDs = append(excludeProductIDs, product.ID)
	}

	suggestions := make(map[uuid.UUID][]models.ProductResponse, len(productIDs))
	for _, productID := range productIDs {
		embedding, slot, err := s.repo.Product.GetEmbedding(ctx, productID)
		if err != nil {
			return models.OutfitSuggestionsResponse{}, err
		}
		if embedding == nil {
			log.Warn(ctx, "product has no embedding, so it gets no suggestions", "outfit", id, "product", productID)
			suggestions[productID] = []models.ProductResponse{}
			continue
		}

		// nil lists: FindSimilar treats a NULL list as matching nothing
		similar, err := s.repo.Product.FindSimilar(ctx, embedding, slot, nil, nil, nil, excludeProductIDs, limit)
		if err != nil {
			return models.OutfitSuggestionsResponse{}, err
		}
		suggestions[productID] = similar
	}
	return models.OutfitSuggestionsResponse{Suggestions: suggestions}, nil
}
