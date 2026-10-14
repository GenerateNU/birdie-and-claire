package tests

import (
	"context"
	"database/sql"
	"math/rand/v2"
	"slices"
	"testing"

	"birdie-and-claire/internal/repository"

	"github.com/google/uuid"
	"github.com/pgvector/pgvector-go"
)

const (
	embeddingSize = 512
	// more than any test inserts, so a limit never hides a row
	findSimilarLimit = 10
)

// queryEmbedding points along the first axis; productEmbedding(lean) tilts away from it, so a larger lean is further.
var queryEmbedding = productEmbedding(0)

func productEmbedding(lean float32) []float32 {
	embedding := make([]float32, embeddingSize)
	embedding[0] = 1
	embedding[1] = lean
	return embedding
}

type testProduct struct {
	id        uuid.UUID
	slot      *string
	tags      []string
	embedding []float32
}

func insertSlotProduct(t *testing.T, db *sql.DB, product testProduct) uuid.UUID {
	t.Helper()

	if product.id == uuid.Nil {
		product.id = uuid.New()
	}
	if product.tags == nil {
		product.tags = []string{}
	}
	var embedding any
	if product.embedding != nil {
		embedding = pgvector.NewVector(product.embedding)
	}
	_, err := db.ExecContext(context.Background(), `
		INSERT INTO products (id, shopify_id, handle, title, slot, tags, embedding)
		VALUES ($1, $2, 'test-product', 'Test product', $3, $4, $5)
	`, product.id, rand.Int64(), product.slot, product.tags, embedding)
	if err != nil {
		t.Fatalf("insert product: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM products WHERE id = $1`, product.id) })
	return product.id
}

// testSlot keeps each test's rows apart from every other row in the table.
func testSlot() string {
	return "test-" + uuid.NewString()
}

func findSimilarIDs(t *testing.T, db *sql.DB, slot string, excludeTags, niceTags []string) []uuid.UUID {
	t.Helper()

	products, err := repository.NewProductRepository(db).FindSimilar(context.Background(), queryEmbedding, slot, excludeTags, niceTags, findSimilarLimit)
	if err != nil {
		t.Fatalf("FindSimilar: %v", err)
	}
	var ids []uuid.UUID
	for _, product := range products {
		ids = append(ids, product.ID)
	}
	return ids
}

func TestFindSimilarFiltersBySlot(t *testing.T) {
	db := openTestDB(t)
	slot, otherSlot := testSlot(), testSlot()

	inSlot := insertSlotProduct(t, db, testProduct{slot: &slot, embedding: productEmbedding(0.1)})
	insertSlotProduct(t, db, testProduct{slot: &otherSlot, embedding: productEmbedding(0.1)})
	insertSlotProduct(t, db, testProduct{slot: nil, embedding: productEmbedding(0.1)})
	insertSlotProduct(t, db, testProduct{slot: &slot, embedding: nil})

	if got := findSimilarIDs(t, db, slot, nil, nil); !slices.Equal(got, []uuid.UUID{inSlot}) {
		t.Errorf("got %v, want only %v: another slot, a NULL slot, and a NULL embedding are excluded", got, inSlot)
	}
}

func TestFindSimilarExcludesTags(t *testing.T) {
	db := openTestDB(t)
	slot := testSlot()

	plain := insertSlotProduct(t, db, testProduct{slot: &slot, tags: []string{"linen"}, embedding: productEmbedding(0.1)})
	white := insertSlotProduct(t, db, testProduct{slot: &slot, tags: []string{"linen", "white"}, embedding: productEmbedding(0.2)})

	if got := findSimilarIDs(t, db, slot, []string{"white"}, nil); !slices.Equal(got, []uuid.UUID{plain}) {
		t.Errorf("excluding white: got %v, want only %v", got, plain)
	}
	for name, excludeTags := range map[string][]string{"nil": nil, "empty": {}} {
		if got := findSimilarIDs(t, db, slot, excludeTags, nil); !slices.Equal(got, []uuid.UUID{plain, white}) {
			t.Errorf("%s exclude tags: got %v, want both rows nearest first", name, got)
		}
	}
}

func TestFindSimilarNiceTagsReorder(t *testing.T) {
	db := openTestDB(t)
	slot := testSlot()

	// cosine distances of about 0.005 and 0.014, a gap smaller than one tag's bonus
	near := insertSlotProduct(t, db, testProduct{slot: &slot, tags: []string{"linen"}, embedding: productEmbedding(0.1)})
	far := insertSlotProduct(t, db, testProduct{slot: &slot, tags: []string{"pastel"}, embedding: productEmbedding(0.17)})

	if got := findSimilarIDs(t, db, slot, nil, nil); !slices.Equal(got, []uuid.UUID{near, far}) {
		t.Errorf("without nice tags: got %v, want nearest first", got)
	}
	if got := findSimilarIDs(t, db, slot, nil, []string{"pastel"}); !slices.Equal(got, []uuid.UUID{far, near}) {
		t.Errorf("with nice tag pastel: got %v, want the pastel row first", got)
	}
}

func TestFindSimilarBreaksTiesByID(t *testing.T) {
	db := openTestDB(t)
	slot := testSlot()

	// the fixed first group orders the two ids; [24:] keeps a fresh uuid's last 12 hex digits so reruns never collide
	lowID := uuid.MustParse("00000000-0000-4000-8000-" + uuid.NewString()[24:])
	highID := uuid.MustParse("ffffffff-0000-4000-8000-" + uuid.NewString()[24:])
	// inserted high first, so insertion order alone would return it first
	insertSlotProduct(t, db, testProduct{id: highID, slot: &slot, embedding: productEmbedding(0.1)})
	insertSlotProduct(t, db, testProduct{id: lowID, slot: &slot, embedding: productEmbedding(0.1)})

	if got := findSimilarIDs(t, db, slot, nil, nil); !slices.Equal(got, []uuid.UUID{lowID, highID}) {
		t.Errorf("got %v, want the lower id first on a tie", got)
	}
}

func TestFindSimilarMatchesStoredTagsCaseInsensitively(t *testing.T) {
	db := openTestDB(t)
	slot := testSlot()

	// cosine distances of about 0.005 and 0.014, a gap smaller than one tag's bonus
	near := insertSlotProduct(t, db, testProduct{slot: &slot, tags: []string{"Linen"}, embedding: productEmbedding(0.1)})
	sage := insertSlotProduct(t, db, testProduct{slot: &slot, tags: []string{"Sage"}, embedding: productEmbedding(0.17)})
	white := insertSlotProduct(t, db, testProduct{slot: &slot, tags: []string{"White"}, embedding: productEmbedding(0.2)})

	if got := findSimilarIDs(t, db, slot, nil, nil); !slices.Equal(got, []uuid.UUID{near, sage, white}) {
		t.Errorf("nil lists: got %v, want every row nearest first", got)
	}
	if got := findSimilarIDs(t, db, slot, []string{"white"}, nil); !slices.Equal(got, []uuid.UUID{near, sage}) {
		t.Errorf("excluding white: got %v, want the stored White row left out", got)
	}
	if got := findSimilarIDs(t, db, slot, nil, []string{"sage"}); !slices.Equal(got, []uuid.UUID{sage, near, white}) {
		t.Errorf("nice tag sage: got %v, want the stored Sage row first", got)
	}
}
