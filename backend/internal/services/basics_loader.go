package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"image/png"
	"io/fs"
	"slices"

	"birdie-and-claire/internal/embedder"
	"birdie-and-claire/internal/log"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/storage"

	"github.com/google/uuid"
)

const (
	basicsKeyPrefix = "basics/"
	// The jpeg is only what the embedder looks at, so its quality is not worth the bytes above this.
	embedJPEGQuality = 95
)

type BasicsLoaderService interface {
	// Load adds or updates every basic and reads each one's PNG from images. A basic whose name and image are unchanged
	// since its last load is left alone, so a rerun makes no embedder calls. It stops at the first error, and a rerun
	// picks up from there.
	Load(ctx context.Context, basics []models.Basic, images fs.FS) error
}

type basicsLoaderService struct {
	repo     *repository.Repository
	store    storage.ObjectStore
	embedder embedder.Embedder
}

func NewBasicsLoaderService(repo *repository.Repository, store storage.ObjectStore, emb embedder.Embedder) BasicsLoaderService {
	return &basicsLoaderService{repo: repo, store: store, embedder: emb}
}

func (s *basicsLoaderService) Load(ctx context.Context, basics []models.Basic, images fs.FS) error {
	for _, basic := range basics {
		if err := s.loadBasic(ctx, basic, images); err != nil {
			return fmt.Errorf("load basic %q: %w", basic.Name, err)
		}
	}
	log.Debug(ctx, "basics loader: done", "basics", len(basics))
	return nil
}

func (s *basicsLoaderService) loadBasic(ctx context.Context, basic models.Basic, images fs.FS) error {
	original, err := fs.ReadFile(images, basic.ImageFile)
	if err != nil {
		return fmt.Errorf("read image: %w", err)
	}
	hash := hashInputs(basic.Name, string(original))

	synced, err := s.repo.Product.UpsertBasic(ctx, basic)
	if err != nil {
		return err
	}
	if synced.EmbeddingHash != nil && *synced.EmbeddingHash == hash {
		return nil
	}

	decoded, err := png.Decode(bytes.NewReader(original))
	if err != nil {
		return fmt.Errorf("decode image: %w", err)
	}
	embedSource, err := flattenOnWhite(decoded)
	if err != nil {
		return err
	}

	// The product keeps the transparent PNG, since the canvas removes white backgrounds and would erase a white tee.
	// The embedder drops transparency, and the pixels under it are black, so it reads a copy flattened onto white, the
	// backdrop of the store's own photos.
	imageKey := basicsKeyPrefix + basic.ID.String() + ".png"
	embedKey := basicsKeyPrefix + basic.ID.String() + "-embed.jpg"
	if err := s.store.PutObject(ctx, imageKey, "image/png", original); err != nil {
		return err
	}
	if err := s.store.PutObject(ctx, embedKey, "image/jpeg", embedSource); err != nil {
		return err
	}

	embedding, err := embedder.EmbedProduct(ctx, s.embedder, basic.Name, s.store.PublicURL(embedKey))
	if err != nil {
		return err
	}

	bounds := decoded.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	err = s.repo.ProductImage.UpsertBasicImage(ctx, models.ProductImage{
		// derived from the basic's ID, so a rerun updates the row instead of adding a second image
		ID:        uuid.NewSHA1(basic.ID, []byte("image")),
		ProductID: basic.ID,
		URL:       s.store.PublicURL(imageKey),
		AltText:   &basic.Name,
		Width:     &width,
		Height:    &height,
	})
	if err != nil {
		return err
	}
	// last, because the hash it stores is what a rerun reads as "this basic is done"
	return s.repo.Product.SaveEmbedding(ctx, synced.ID, embedding, hash)
}

func flattenOnWhite(img image.Image) ([]byte, error) {
	bounds := img.Bounds()
	flat := image.NewRGBA(bounds)
	draw.Draw(flat, bounds, image.NewUniform(color.White), image.Point{}, draw.Src)
	draw.Draw(flat, bounds, img, bounds.Min, draw.Over)

	var encoded bytes.Buffer
	if err := jpeg.Encode(&encoded, flat, &jpeg.Options{Quality: embedJPEGQuality}); err != nil {
		return nil, fmt.Errorf("encode flattened image: %w", err)
	}
	return encoded.Bytes(), nil
}

// ParseBasics reads data/basics.json and checks every value against the lists the rest of the app uses. The file is
// written by hand and nothing relabels it, so a value off its list would otherwise load and never match a search.
func ParseBasics(data []byte) ([]models.Basic, error) {
	var basics []models.Basic
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&basics); err != nil {
		return nil, fmt.Errorf("decode basics: %w", err)
	}
	if len(basics) == 0 {
		return nil, errors.New("basics file has no basics")
	}

	ids := make(map[uuid.UUID]bool, len(basics))
	imageFiles := make(map[string]bool, len(basics))
	for _, basic := range basics {
		if err := validateBasic(basic); err != nil {
			return nil, fmt.Errorf("basic %q: %w", basic.Name, err)
		}
		if ids[basic.ID] {
			return nil, fmt.Errorf("basic %q: id %s is used twice", basic.Name, basic.ID)
		}
		if imageFiles[basic.ImageFile] {
			return nil, fmt.Errorf("basic %q: image file %s is used twice", basic.Name, basic.ImageFile)
		}
		ids[basic.ID] = true
		imageFiles[basic.ImageFile] = true
	}
	return basics, nil
}

func validateBasic(basic models.Basic) error {
	if basic.ID == uuid.Nil {
		return errors.New("id is required")
	}
	if basic.Name == "" || basic.ProductType == "" || basic.ImageFile == "" {
		return errors.New("name, product_type and image_file are required")
	}
	if basic.Source != models.SourceBasic {
		return fmt.Errorf("source is %q, want %q", basic.Source, models.SourceBasic)
	}

	switch basic.Slot {
	case models.SlotTop, models.SlotBottom, models.SlotShoe, models.SlotAccessory, models.SlotOnePiece:
	default:
		return fmt.Errorf("slot %q is not a product slot", basic.Slot)
	}

	if !slices.Contains(models.ProductTargets, basic.ProductTarget) {
		return fmt.Errorf("product_target %q is not on its list", basic.ProductTarget)
	}
	if err := validateTypes(basic); err != nil {
		return err
	}
	return validateTags(basic.Tags)
}

func validateTypes(basic models.Basic) error {
	// only the type for the basic's own slot may be set, as LabelProduct does for a store product
	typeFields := []struct {
		name    string
		value   *string
		allowed []string
		slot    models.ProductSlot
	}{
		{"neckline_type", basic.NecklineType, models.NecklineTypes, models.SlotTop},
		{"bottom_type", basic.BottomType, models.BottomTypes, models.SlotBottom},
		{"shoe_type", basic.ShoeType, models.ShoeTypes, models.SlotShoe},
	}
	for _, field := range typeFields {
		if field.value == nil {
			continue
		}
		if basic.Slot != field.slot {
			return fmt.Errorf("%s is set on a %s", field.name, basic.Slot)
		}
		if !slices.Contains(field.allowed, *field.value) {
			return fmt.Errorf("%s %q is not on its list", field.name, *field.value)
		}
	}
	return nil
}

func validateTags(tags models.ProductTags) error {
	allowed := models.ProductTagValues
	tagLists := []struct {
		name            string
		values, allowed []string
	}{
		{"colors", tags.Colors, allowed.Colors},
		{"formality", tags.Formality, allowed.Formality},
		{"occasions", tags.Occasions, allowed.Occasions},
		{"season", tags.Season, allowed.Season},
		{"pattern", tags.Pattern, allowed.Pattern},
		{"fabric", tags.Fabric, allowed.Fabric},
		{"fit", tags.Fit, allowed.Fit},
	}
	for _, list := range tagLists {
		// a missing list would be stored as null, and FindSimilar fails on a null list for every search in the slot
		if list.values == nil {
			return fmt.Errorf("%s is missing", list.name)
		}
		for _, value := range list.values {
			if !slices.Contains(list.allowed, value) {
				return fmt.Errorf("%s value %q is not on its list", list.name, value)
			}
		}
	}
	return nil
}
