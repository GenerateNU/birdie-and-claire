package tests

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/llm"
	"birdie-and-claire/internal/llm/llmtest"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/server/routers"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
)

// mirrors recommendationsPerSlot, which is unexported in services
const recommendationsPerSlot = 10

const expandedAllSlots = `{"slots":{"top":"pastel blouse","bottom":"linen skirt","accessory":"straw hat"},` +
	`"exclude_tags":["white"],"nice_tags":["pastel"]}`

// fakeEmbedder returns a vector whose first value is len(phrase), which tells apart phrases of different lengths.
type fakeEmbedder struct {
	err error

	mu      sync.Mutex
	phrases []string
}

func (e *fakeEmbedder) EmbedText(_ context.Context, text string) ([]float32, error) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.phrases = append(e.phrases, text)
	if e.err != nil {
		return nil, e.err
	}
	return []float32{float32(len(text))}, nil
}

func (e *fakeEmbedder) EmbedImage(context.Context, string) ([]float32, error) {
	return nil, errors.New("not used")
}

func (e *fakeEmbedder) Warm(context.Context) error { return nil }

type findSimilarCall struct {
	embedding   []float32
	slot        models.ProductSlot
	excludeTags []string
	niceTags    []string
	limit       int
}

// fakeProducts answers FindSimilar with one product titled after the slot.
type fakeProducts struct {
	repository.ProductRepository
	err error

	mu    sync.Mutex
	calls []findSimilarCall
}

func (p *fakeProducts) FindSimilar(_ context.Context, embedding []float32, slot models.ProductSlot, excludeTags, niceTags []string, _ []uuid.UUID, limit int) ([]models.ProductResponse, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.calls = append(p.calls, findSimilarCall{embedding: embedding, slot: slot, excludeTags: excludeTags, niceTags: niceTags, limit: limit})
	if p.err != nil {
		return nil, p.err
	}
	return []models.ProductResponse{{Product: models.Product{ID: uuid.New(), Title: string(slot), Slot: slot, Tags: []string{}}}}, nil
}

func (p *fakeProducts) callsBySlot() map[models.ProductSlot]findSimilarCall {
	p.mu.Lock()
	defer p.mu.Unlock()
	bySlot := make(map[models.ProductSlot]findSimilarCall, len(p.calls))
	for _, call := range p.calls {
		bySlot[call.slot] = call
	}
	return bySlot
}

func newRecommendationService(answer string, emb *fakeEmbedder, products *fakeProducts) services.RecommendationService {
	return services.NewRecommendationService(&repository.Repository{Product: products}, &llmtest.Fake{Text: answer}, emb)
}

func titles(products []models.ProductResponse) []string {
	var got []string
	for _, product := range products {
		got = append(got, product.Title)
	}
	return got
}

func TestRecommendSearchesEverySlot(t *testing.T) {
	emb := &fakeEmbedder{}
	products := &fakeProducts{}

	response, err := newRecommendationService(expandedAllSlots, emb, products).RecommendProducts(context.Background(), "summer wedding")
	if err != nil {
		t.Fatalf("Recommend: %v", err)
	}
	if !slices.Equal(titles(response.Top), []string{"top"}) || !slices.Equal(titles(response.Bottom), []string{"bottom"}) ||
		!slices.Equal(titles(response.Accessory), []string{"accessory"}) {
		t.Errorf("response = %+v, want each slot's own products", response)
	}

	slices.Sort(emb.phrases)
	if !slices.Equal(emb.phrases, []string{"linen skirt", "pastel blouse", "straw hat"}) {
		t.Errorf("embedded %q, want each slot phrase once", emb.phrases)
	}

	calls := products.callsBySlot()
	if len(calls) != 3 {
		t.Fatalf("searched slots %v, want top, bottom, and accessory", calls)
	}
	top := calls["top"]
	if top.embedding[0] != float32(len("pastel blouse")) {
		t.Errorf("top searched with embedding %v, want the top phrase's", top.embedding)
	}
	if !slices.Equal(top.excludeTags, []string{"white"}) || !slices.Equal(top.niceTags, []string{"pastel"}) || top.limit != recommendationsPerSlot {
		t.Errorf("top call = %+v, want the expanded tags and a limit of 10", top)
	}
}

func TestRecommendSkipsASlotWithNoPhrase(t *testing.T) {
	answer := strings.Replace(expandedAllSlots, `"straw hat"`, `""`, 1)
	emb := &fakeEmbedder{}
	products := &fakeProducts{}

	response, err := newRecommendationService(answer, emb, products).RecommendProducts(context.Background(), "a blouse and skirt")
	if err != nil {
		t.Fatalf("Recommend: %v", err)
	}
	if response.Accessory == nil || len(response.Accessory) != 0 {
		t.Errorf("Accessory = %v, want an empty, non-nil list", response.Accessory)
	}
	if _, searched := products.callsBySlot()["accessory"]; searched || len(emb.phrases) != 2 {
		t.Errorf("embedded %q and searched %v, want the accessory slot skipped", emb.phrases, products.callsBySlot())
	}
}

func TestRecommendSkipsASlotWithAWhitespaceOnlyPhrase(t *testing.T) {
	answer := strings.Replace(expandedAllSlots, `"straw hat"`, `"   "`, 1)
	emb := &fakeEmbedder{}
	products := &fakeProducts{}

	response, err := newRecommendationService(answer, emb, products).RecommendProducts(context.Background(), "a blouse and skirt")
	if err != nil {
		t.Fatalf("Recommend: %v", err)
	}
	if response.Accessory == nil || len(response.Accessory) != 0 {
		t.Errorf("Accessory = %v, want an empty, non-nil list", response.Accessory)
	}
	if slices.Contains(emb.phrases, "   ") || len(emb.phrases) != 2 {
		t.Errorf("embedded %q, want the blank accessory phrase skipped", emb.phrases)
	}
}

func TestRecommendReturnsTheExpansion(t *testing.T) {
	answer := `{"slots":{"top":"pastel blouse","bottom":"","accessory":"straw hat"},"exclude_tags":["White","Sequins"],"nice_tags":null}`

	response, err := newRecommendationService(answer, &fakeEmbedder{}, &fakeProducts{}).RecommendProducts(context.Background(), "garden party")
	if err != nil {
		t.Fatalf("Recommend: %v", err)
	}
	wantSlots := models.RecommendationExpandedSlots{Top: "pastel blouse", Bottom: "", Accessory: "straw hat"}
	if response.ExpandedQuery.Slots != wantSlots {
		t.Errorf("Slots = %+v, want %+v", response.ExpandedQuery.Slots, wantSlots)
	}
	if !slices.Equal(response.ExpandedQuery.ExcludeTags, []string{"white", "sequins"}) {
		t.Errorf("ExcludeTags = %q, want the model's tags lowercased", response.ExpandedQuery.ExcludeTags)
	}
	if response.ExpandedQuery.NiceTags == nil || len(response.ExpandedQuery.NiceTags) != 0 {
		t.Errorf("NiceTags = %#v, want an empty, non-nil slice for a null answer", response.ExpandedQuery.NiceTags)
	}
}

func TestRecommendTrimsSlotPhrases(t *testing.T) {
	answer := strings.Replace(strings.Replace(expandedAllSlots, `"straw hat"`, `"   "`, 1), `"pastel blouse"`, `"  pastel blouse  "`, 1)
	emb := &fakeEmbedder{}

	response, err := newRecommendationService(answer, emb, &fakeProducts{}).RecommendProducts(context.Background(), "summer wedding")
	if err != nil {
		t.Fatalf("Recommend: %v", err)
	}
	wantSlots := models.RecommendationExpandedSlots{Top: "pastel blouse", Bottom: "linen skirt", Accessory: ""}
	if response.ExpandedQuery.Slots != wantSlots {
		t.Errorf("Slots = %+v, want %+v", response.ExpandedQuery.Slots, wantSlots)
	}
	if !slices.Contains(emb.phrases, "pastel blouse") {
		t.Errorf("embedded %q, want the trimmed top phrase", emb.phrases)
	}
}

func TestRecommendHidesARejectedPhrase(t *testing.T) {
	const modalDetail = "DETAIL-SENTINEL-5e21"
	rejected := fmt.Errorf("embedder: 422 Unprocessable Entity: %s: %w", modalDetail, errs.ErrInvalidInput)

	_, err := newRecommendationService(expandedAllSlots, &fakeEmbedder{err: rejected}, &fakeProducts{}).RecommendProducts(context.Background(), "brunch")
	if err == nil || errors.Is(err, errs.ErrInvalidInput) {
		t.Fatalf("err = %v, want an error that is not ErrInvalidInput", err)
	}
	if strings.Contains(err.Error(), modalDetail) {
		t.Errorf("err = %v, want Modal's detail left out", err)
	}
}

// numberedTags is a JSON array of count distinct tags.
func numberedTags(count int) string {
	quoted := make([]string, count)
	for i := range quoted {
		quoted[i] = fmt.Sprintf(`"tag%d"`, i)
	}
	return "[" + strings.Join(quoted, ",") + "]"
}

func expansionWithTop(top, excludeTags, niceTags string) string {
	return fmt.Sprintf(`{"slots":{"top":%q,"bottom":"","accessory":""},"exclude_tags":%s,"nice_tags":%s}`, top, excludeTags, niceTags)
}

func TestRecommendAcceptsAnExpansionAtTheLimits(t *testing.T) {
	answer := expansionWithTop(strings.Repeat("é", 100), numberedTags(10), numberedTags(10))
	if _, err := newRecommendationService(answer, &fakeEmbedder{}, &fakeProducts{}).RecommendProducts(context.Background(), "brunch"); err != nil {
		t.Fatalf("RecommendProducts: %v", err)
	}
}

func TestRecommendRejectsAnExpansionOverTheLimits(t *testing.T) {
	tests := map[string]string{
		"11 exclude tags":      expansionWithTop("blouse", numberedTags(11), numberedTags(0)),
		"11 nice tags":         expansionWithTop("blouse", numberedTags(0), numberedTags(11)),
		"101 character phrase": expansionWithTop(strings.Repeat("é", 101), numberedTags(0), numberedTags(0)),
	}

	for name, answer := range tests {
		t.Run(name, func(t *testing.T) {
			emb := &fakeEmbedder{}
			_, err := newRecommendationService(answer, emb, &fakeProducts{}).RecommendProducts(context.Background(), "brunch")
			if err == nil || errors.Is(err, errs.ErrInvalidInput) {
				t.Fatalf("err = %v, want a server error", err)
			}
			if strings.Contains(err.Error(), "tag1") || strings.Contains(err.Error(), "é") {
				t.Errorf("err = %v, want sizes only, not the model's text", err)
			}
			if len(emb.phrases) != 0 {
				t.Errorf("embedded %q, want nothing sent once the expansion is over a limit", emb.phrases)
			}
		})
	}
}

func TestRecommendSurfacesErrors(t *testing.T) {
	errEmbed := errors.New("embedder down")
	errSearch := errors.New("database down")

	tests := []struct {
		name     string
		answer   string
		emb      *fakeEmbedder
		products *fakeProducts
		want     error
	}{
		{name: "invalid model answer", answer: `Sure! A blouse.`, emb: &fakeEmbedder{}, products: &fakeProducts{}, want: llm.ErrInvalidOutput},
		{name: "embedder", answer: expandedAllSlots, emb: &fakeEmbedder{err: errEmbed}, products: &fakeProducts{}, want: errEmbed},
		{name: "search", answer: expandedAllSlots, emb: &fakeEmbedder{}, products: &fakeProducts{err: errSearch}, want: errSearch},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := newRecommendationService(tt.answer, tt.emb, tt.products).RecommendProducts(context.Background(), "brunch")
			if !errors.Is(err, tt.want) {
				t.Fatalf("err = %v, want %v", err, tt.want)
			}
		})
	}
}

func recommendationAPI(t *testing.T, fake *llmtest.Fake, emb *fakeEmbedder) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	routers.RecommendationRoutes(api, types.RouteParams{ServiceParams: &types.ServiceParams{
		Repository: &repository.Repository{Product: &fakeProducts{}},
		LLM:        fake,
		Embedder:   emb,
	}})
	return api
}

func TestRecommendRouteValidatesTheQuery(t *testing.T) {
	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
	}{
		{name: "empty", body: map[string]any{"query": ""}, wantStatus: http.StatusUnprocessableEntity},
		{name: "missing", body: map[string]any{}, wantStatus: http.StatusUnprocessableEntity},
		{name: "above maximum 201 characters", body: map[string]any{"query": strings.Repeat("q", 201)}, wantStatus: http.StatusUnprocessableEntity},
		{name: "maximum 200 characters", body: map[string]any{"query": strings.Repeat("q", 200)}, wantStatus: http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := recommendationAPI(t, &llmtest.Fake{Text: expandedAllSlots}, &fakeEmbedder{}).Post("/api/v1/recommend", tt.body)
			if response.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d: %s", response.Code, tt.wantStatus, response.Body)
			}
		})
	}
}

func TestRecommendRouteReturnsProductsPerSlot(t *testing.T) {
	response := recommendationAPI(t, &llmtest.Fake{Text: expandedAllSlots}, &fakeEmbedder{}).Post("/api/v1/recommend", map[string]any{"query": "summer wedding"})
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", response.Code, response.Body)
	}

	var decoded models.RecommendationResponse
	if err := json.Unmarshal(response.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode body %s: %v", response.Body, err)
	}
	productsBySlot := map[string][]models.ProductResponse{"top": decoded.Top, "bottom": decoded.Bottom, "accessory": decoded.Accessory}
	for _, slot := range []string{"top", "bottom", "accessory"} {
		if !slices.Equal(titles(productsBySlot[slot]), []string{slot}) {
			t.Errorf("%s = %+v, want that slot's product", slot, productsBySlot[slot])
		}
	}
}

func TestRecommendRouteRejectsABlankQuery(t *testing.T) {
	fake := &llmtest.Fake{Text: expandedAllSlots}

	response := recommendationAPI(t, fake, &fakeEmbedder{}).Post("/api/v1/recommend", map[string]any{"query": "   "})
	if response.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusUnprocessableEntity, response.Body)
	}
	if got := len(fake.Requests()); got != 0 {
		t.Errorf("made %d model requests, want 0", got)
	}
}

func TestRecommendRouteReturnsTheExpandedQuery(t *testing.T) {
	tests := []struct {
		name   string
		answer string
	}{
		{name: "every slot", answer: expandedAllSlots},
		{name: "every slot empty", answer: `{"slots":{"top":"","bottom":"","accessory":""},"exclude_tags":[],"nice_tags":null}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := recommendationAPI(t, &llmtest.Fake{Text: tt.answer}, &fakeEmbedder{}).Post("/api/v1/recommend", map[string]any{"query": "summer wedding"})
			if response.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200: %s", response.Code, response.Body)
			}

			requireExpandedQuery(t, response.Body.Bytes())
		})
	}
}

func requireExpandedQuery(t *testing.T, responseBody []byte) {
	t.Helper()

	var body struct {
		ExpandedQuery map[string]json.RawMessage `json:"expanded_query"`
	}
	if err := json.Unmarshal(responseBody, &body); err != nil {
		t.Fatalf("decode body %s: %v", responseBody, err)
	}
	var slots map[string]*string
	if err := json.Unmarshal(body.ExpandedQuery["slots"], &slots); err != nil {
		t.Fatalf("decode expanded_query.slots in %s: %v", responseBody, err)
	}
	for _, slot := range []string{"top", "bottom", "accessory"} {
		if slots[slot] == nil {
			t.Errorf("expanded_query.slots lacks %s: %s", slot, responseBody)
		}
	}
	for _, key := range []string{"exclude_tags", "nice_tags"} {
		var tags []string
		if err := json.Unmarshal(body.ExpandedQuery[key], &tags); err != nil || tags == nil {
			t.Errorf("expanded_query.%s = %s, want an array", key, body.ExpandedQuery[key])
		}
	}
}

// deadlineLLM records the deadline on the ctx it is called with.
type deadlineLLM struct {
	deadline    time.Time
	hasDeadline bool
}

func (d *deadlineLLM) Generate(ctx context.Context, _ llm.Request) (llm.Response, error) {
	d.deadline, d.hasDeadline = ctx.Deadline()
	return llm.Response{Text: expandedAllSlots}, nil
}

func (d *deadlineLLM) GenerateStream(context.Context, llm.Request) (llm.ChunkReader, error) {
	return nil, errors.New("not used")
}

func TestRecommendBoundsTheModelCall(t *testing.T) {
	// mirrors expandQueryTimeout, which is unexported in services
	const expandQueryTimeout = 30 * time.Second
	model := &deadlineLLM{}
	service := services.NewRecommendationService(&repository.Repository{Product: &fakeProducts{}}, model, &fakeEmbedder{})

	start := time.Now()
	if _, err := service.RecommendProducts(context.Background(), "summer wedding"); err != nil {
		t.Fatalf("Recommend: %v", err)
	}
	if !model.hasDeadline {
		t.Fatal("the model was called without a deadline")
	}
	if model.deadline.Before(start) || model.deadline.After(time.Now().Add(expandQueryTimeout)) {
		t.Errorf("deadline = %v, want within %v of %v", model.deadline, expandQueryTimeout, start)
	}
}

func TestRecommendRouteRejectedPhraseIsAServerError(t *testing.T) {
	rejected := fmt.Errorf("embedder: 422 Unprocessable Entity: too long: %w", errs.ErrInvalidInput)

	response := recommendationAPI(t, &llmtest.Fake{Text: expandedAllSlots}, &fakeEmbedder{err: rejected}).
		Post("/api/v1/recommend", map[string]any{"query": "summer wedding"})
	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusInternalServerError, response.Body)
	}
}
