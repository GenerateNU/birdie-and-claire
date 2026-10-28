package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"birdie-and-claire/internal/config"
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

// mirrors outfitsPerRequest, which is unexported in services
const outfitsPerRequest = 3

const expandedAllSlots = `{"slots":{"top":"pastel blouse","bottom":"linen skirt","accessory":"straw hat","shoe":"tan sandals"},` +
	`"exclude_tags":["white"],"nice_tags":["pastel"]}`

var summerWedding = models.RecommendationRequest{Occasion: "summer wedding"}

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

// fakeProducts answers FindSimilar with limit products titled "<slot> <rank>", or counts[slot] of them when set.
type fakeProducts struct {
	repository.ProductRepository
	err    error
	counts map[models.ProductSlot]int

	mu    sync.Mutex
	calls []findSimilarCall
}

func (p *fakeProducts) FindSimilar(_ context.Context, embedding []float32, slot models.ProductSlot, excludeTags, niceTags []string, limit int) ([]models.RecommendedProduct, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.calls = append(p.calls, findSimilarCall{embedding: embedding, slot: slot, excludeTags: excludeTags, niceTags: niceTags, limit: limit})
	if p.err != nil {
		return nil, p.err
	}
	count, ok := p.counts[slot]
	if !ok {
		count = limit
	}
	products := make([]models.RecommendedProduct, 0, count)
	for rank := range count {
		title := fmt.Sprintf("%s %d", slot, rank+1)
		products = append(products, models.RecommendedProduct{Product: models.Product{ID: uuid.New(), Title: title, Slot: slot, Tags: []string{}}})
	}
	return products, nil
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

func outfitTitles(outfit models.RecommendedOutfit) []string {
	return []string{outfit.Top.Title, outfit.Bottom.Title, outfit.Accessory.Title, outfit.Shoe.Title}
}

func TestRecommendSearchesEverySlot(t *testing.T) {
	emb := &fakeEmbedder{}
	products := &fakeProducts{}

	if _, err := newRecommendationService(expandedAllSlots, emb, products).RecommendProducts(context.Background(), summerWedding); err != nil {
		t.Fatalf("Recommend: %v", err)
	}

	slices.Sort(emb.phrases)
	if !slices.Equal(emb.phrases, []string{"linen skirt", "pastel blouse", "straw hat", "tan sandals"}) {
		t.Errorf("embedded %q, want each slot phrase once", emb.phrases)
	}

	calls := products.callsBySlot()
	if len(calls) != 4 {
		t.Fatalf("searched slots %v, want top, bottom, accessory, and shoe", calls)
	}
	shoe := calls["shoe"]
	if shoe.embedding[0] != float32(len("tan sandals")) {
		t.Errorf("shoe searched with embedding %v, want the shoe phrase's", shoe.embedding)
	}
	if !slices.Equal(shoe.excludeTags, []string{"white"}) || !slices.Equal(shoe.niceTags, []string{"pastel"}) || shoe.limit != outfitsPerRequest {
		t.Errorf("shoe call = %+v, want the expanded tags and a limit of %d", shoe, outfitsPerRequest)
	}
}

func TestRecommendBuildsEachOutfitFromOneRank(t *testing.T) {
	response, err := newRecommendationService(expandedAllSlots, &fakeEmbedder{}, &fakeProducts{}).RecommendProducts(context.Background(), summerWedding)
	if err != nil {
		t.Fatalf("Recommend: %v", err)
	}
	if len(response.Outfits) != outfitsPerRequest {
		t.Fatalf("got %d outfits, want %d", len(response.Outfits), outfitsPerRequest)
	}
	for i, outfit := range response.Outfits {
		rank := i + 1
		want := []string{fmt.Sprintf("top %d", rank), fmt.Sprintf("bottom %d", rank), fmt.Sprintf("accessory %d", rank), fmt.Sprintf("shoe %d", rank)}
		if got := outfitTitles(outfit); !slices.Equal(got, want) {
			t.Errorf("outfit %d = %q, want %q", i, got, want)
		}
	}
}

func TestRecommendReturnsAsManyOutfitsAsTheShortestSlot(t *testing.T) {
	tests := []struct {
		name   string
		counts map[models.ProductSlot]int
		want   int
	}{
		{name: "one shoe", counts: map[models.ProductSlot]int{models.SlotShoe: 1}, want: 1},
		{name: "two bottoms", counts: map[models.ProductSlot]int{models.SlotBottom: 2, models.SlotShoe: 3}, want: 2},
		{name: "no accessories", counts: map[models.ProductSlot]int{models.SlotAccessory: 0}, want: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			products := &fakeProducts{counts: tt.counts}
			response, err := newRecommendationService(expandedAllSlots, &fakeEmbedder{}, products).RecommendProducts(context.Background(), summerWedding)
			if err != nil {
				t.Fatalf("Recommend: %v", err)
			}
			if response.Outfits == nil || len(response.Outfits) != tt.want {
				t.Errorf("Outfits = %#v, want a non-nil list of %d", response.Outfits, tt.want)
			}
		})
	}
}

func TestRecommendRejectsABlankSlotPhrase(t *testing.T) {
	for _, blank := range []string{`""`, `"   "`} {
		t.Run(blank, func(t *testing.T) {
			model := &llmtest.Fake{Text: strings.Replace(expandedAllSlots, `"tan sandals"`, blank, 1)}
			emb := &fakeEmbedder{}
			service := services.NewRecommendationService(&repository.Repository{Product: &fakeProducts{}}, model, emb)

			_, err := service.RecommendProducts(context.Background(), summerWedding)
			if !errors.Is(err, llm.ErrInvalidOutput) {
				t.Fatalf("err = %v, want ErrInvalidOutput", err)
			}
			if got := len(model.Requests()); got != 2 {
				t.Errorf("made %d model requests, want 2", got)
			}
			if len(emb.phrases) != 0 {
				t.Errorf("embedded %q, want nothing searched", emb.phrases)
			}
		})
	}
}

func TestRecommendReturnsTheExpansion(t *testing.T) {
	answer := `{"slots":{"top":"pastel blouse","bottom":"linen skirt","accessory":"straw hat","shoe":"tan sandals"},` +
		`"exclude_tags":["White","Sequins"],"nice_tags":null}`

	response, err := newRecommendationService(answer, &fakeEmbedder{}, &fakeProducts{}).RecommendProducts(context.Background(), summerWedding)
	if err != nil {
		t.Fatalf("Recommend: %v", err)
	}
	wantSlots := models.RecommendationExpandedSlots{Top: "pastel blouse", Bottom: "linen skirt", Accessory: "straw hat", Shoe: "tan sandals"}
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
	answer := strings.Replace(expandedAllSlots, `"pastel blouse"`, `"  pastel blouse  "`, 1)
	emb := &fakeEmbedder{}

	response, err := newRecommendationService(answer, emb, &fakeProducts{}).RecommendProducts(context.Background(), summerWedding)
	if err != nil {
		t.Fatalf("Recommend: %v", err)
	}
	if response.ExpandedQuery.Slots.Top != "pastel blouse" {
		t.Errorf("Top = %q, want the trimmed phrase", response.ExpandedQuery.Slots.Top)
	}
	if !slices.Contains(emb.phrases, "pastel blouse") {
		t.Errorf("embedded %q, want the trimmed top phrase", emb.phrases)
	}
}

func TestRecommendHidesARejectedPhrase(t *testing.T) {
	const modalDetail = "DETAIL-SENTINEL-5e21"
	rejected := fmt.Errorf("embedder: 422 Unprocessable Entity: %s: %w", modalDetail, errs.ErrInvalidInput)

	_, err := newRecommendationService(expandedAllSlots, &fakeEmbedder{err: rejected}, &fakeProducts{}).RecommendProducts(context.Background(), summerWedding)
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

func expansionWithShoe(shoe, excludeTags, niceTags string) string {
	return fmt.Sprintf(`{"slots":{"top":"blouse","bottom":"skirt","accessory":"hat","shoe":%q},"exclude_tags":%s,"nice_tags":%s}`, shoe, excludeTags, niceTags)
}

func TestRecommendAcceptsAnExpansionAtTheLimits(t *testing.T) {
	answer := expansionWithShoe(strings.Repeat("é", 100), numberedTags(10), numberedTags(10))
	if _, err := newRecommendationService(answer, &fakeEmbedder{}, &fakeProducts{}).RecommendProducts(context.Background(), summerWedding); err != nil {
		t.Fatalf("RecommendProducts: %v", err)
	}
}

func TestRecommendRejectsAnExpansionOverTheLimits(t *testing.T) {
	tests := map[string]string{
		"11 exclude tags":           expansionWithShoe("sandals", numberedTags(11), numberedTags(0)),
		"11 nice tags":              expansionWithShoe("sandals", numberedTags(0), numberedTags(11)),
		"101 character shoe phrase": expansionWithShoe(strings.Repeat("é", 101), numberedTags(0), numberedTags(0)),
	}

	for name, answer := range tests {
		t.Run(name, func(t *testing.T) {
			emb := &fakeEmbedder{}
			_, err := newRecommendationService(answer, emb, &fakeProducts{}).RecommendProducts(context.Background(), summerWedding)
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
			_, err := newRecommendationService(tt.answer, tt.emb, tt.products).RecommendProducts(context.Background(), summerWedding)
			if !errors.Is(err, tt.want) {
				t.Fatalf("err = %v, want %v", err, tt.want)
			}
		})
	}
}

func recommendationAPI(t *testing.T, model llm.Client, products *fakeProducts, emb *fakeEmbedder) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	routers.RecommendationRoutes(api, types.RouteParams{ServiceParams: &types.ServiceParams{
		Repository: &repository.Repository{Product: products},
		LLM:        model,
		Embedder:   emb,
	}})
	return api
}

func detail(key, value string) map[string]any {
	return map[string]any{"key": key, "value": value}
}

func TestRecommendRouteValidatesTheRequest(t *testing.T) {
	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
	}{
		{name: "occasion only", body: map[string]any{"occasion": "Workday"}, wantStatus: http.StatusOK},
		{name: "empty details", body: map[string]any{"occasion": "Workday", "details": []any{}}, wantStatus: http.StatusOK},
		{name: "every key", body: map[string]any{"occasion": "Workday", "details": []any{
			detail("weather", "chilly"), detail("vibe", "chic"), detail("custom", "no heels"),
		}}, wantStatus: http.StatusOK},
		{name: "occasion of 100 characters", body: map[string]any{"occasion": strings.Repeat("o", 100)}, wantStatus: http.StatusOK},
		{name: "custom of 200 characters", body: map[string]any{"occasion": "Workday", "details": []any{detail("custom", strings.Repeat("c", 200))}}, wantStatus: http.StatusOK},

		{name: "missing occasion", body: map[string]any{}, wantStatus: http.StatusUnprocessableEntity},
		{name: "empty occasion", body: map[string]any{"occasion": ""}, wantStatus: http.StatusUnprocessableEntity},
		{name: "blank occasion", body: map[string]any{"occasion": "   "}, wantStatus: http.StatusUnprocessableEntity},
		{name: "occasion of 101 characters", body: map[string]any{"occasion": strings.Repeat("o", 101)}, wantStatus: http.StatusUnprocessableEntity},
		{name: "unknown key", body: map[string]any{"occasion": "Workday", "details": []any{detail("budget", "low")}}, wantStatus: http.StatusUnprocessableEntity},
		{name: "repeated key", body: map[string]any{"occasion": "Workday", "details": []any{
			detail("vibe", "chic"), detail("vibe", "casual"),
		}}, wantStatus: http.StatusUnprocessableEntity},
		{name: "unlisted weather", body: map[string]any{"occasion": "Workday", "details": []any{detail("weather", "sunny")}}, wantStatus: http.StatusUnprocessableEntity},
		{name: "vibe in another case", body: map[string]any{"occasion": "Workday", "details": []any{detail("vibe", "Chic")}}, wantStatus: http.StatusUnprocessableEntity},
		{name: "empty value", body: map[string]any{"occasion": "Workday", "details": []any{detail("custom", "")}}, wantStatus: http.StatusUnprocessableEntity},
		{name: "blank custom", body: map[string]any{"occasion": "Workday", "details": []any{detail("custom", "   ")}}, wantStatus: http.StatusUnprocessableEntity},
		{name: "custom of 201 characters", body: map[string]any{"occasion": "Workday", "details": []any{detail("custom", strings.Repeat("c", 201))}}, wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			model := &llmtest.Fake{Text: expandedAllSlots}
			response := recommendationAPI(t, model, &fakeProducts{}, &fakeEmbedder{}).Post("/api/v1/recommend", tt.body)
			if response.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d: %s", response.Code, tt.wantStatus, response.Body)
			}
			if tt.wantStatus != http.StatusOK && len(model.Requests()) != 0 {
				t.Errorf("made %d model requests for a rejected body, want 0", len(model.Requests()))
			}
		})
	}
}

// TestRecommendRouteSendsEachAnswerUnderItsLabel runs the real llm client, since the prompt input is unexported.
func TestRecommendRouteSendsEachAnswerUnderItsLabel(t *testing.T) {
	var mu sync.Mutex
	var sentBody []byte
	gateway := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		mu.Lock()
		sentBody = body
		mu.Unlock()
		content, _ := json.Marshal(expandedAllSlots)
		w.Header().Set("Content-Type", "application/json")
		_, _ = fmt.Fprintf(w, `{"id":"c1","object":"chat.completion","created":0,"model":"vendor/test-model",`+
			`"choices":[{"index":0,"message":{"role":"assistant","content":%s},"finish_reason":"stop"}],`+
			`"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}`, content)
	}))
	t.Cleanup(gateway.Close)
	model := llm.New(context.Background(), config.LLMConfig{APIKey: "test-key", BaseURL: gateway.URL, Model: "vendor/test-model"})

	response := recommendationAPI(t, model, &fakeProducts{}, &fakeEmbedder{}).Post("/api/v1/recommend", map[string]any{
		"occasion": "  Workday ",
		"details":  []any{detail("weather", "chilly"), detail("vibe", "chic"), detail("custom", "  no heels  ")},
	})
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", response.Code, response.Body)
	}

	answers, _ := json.Marshal(map[string]string{"occasion": "Workday", "weather": "chilly", "vibe": "chic", "other details": "no heels"})
	// the gateway body carries the prompt as a JSON string, so the answers appear there string-escaped
	escaped, _ := json.Marshal(string(answers))
	mu.Lock()
	defer mu.Unlock()
	if !bytes.Contains(sentBody, escaped[1:len(escaped)-1]) {
		t.Errorf("gateway body = %s, want the trimmed answers under their labels: %s", sentBody, answers)
	}
}

func TestRecommendRouteReturnsOutfits(t *testing.T) {
	response := recommendationAPI(t, &llmtest.Fake{Text: expandedAllSlots}, &fakeProducts{}, &fakeEmbedder{}).
		Post("/api/v1/recommend", map[string]any{"occasion": "summer wedding"})
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", response.Code, response.Body)
	}

	var decoded models.RecommendationResponse
	if err := json.Unmarshal(response.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode body %s: %v", response.Body, err)
	}
	if len(decoded.Outfits) != outfitsPerRequest {
		t.Fatalf("got %d outfits, want %d: %s", len(decoded.Outfits), outfitsPerRequest, response.Body)
	}
	if got := outfitTitles(decoded.Outfits[0]); !slices.Equal(got, []string{"top 1", "bottom 1", "accessory 1", "shoe 1"}) {
		t.Errorf("first outfit = %q, want each slot's first product", got)
	}
}

func TestRecommendRouteReturnsAnEmptyListWhenNoOutfitFits(t *testing.T) {
	products := &fakeProducts{counts: map[models.ProductSlot]int{models.SlotShoe: 0}}

	response := recommendationAPI(t, &llmtest.Fake{Text: expandedAllSlots}, products, &fakeEmbedder{}).
		Post("/api/v1/recommend", map[string]any{"occasion": "summer wedding"})
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", response.Code, response.Body)
	}
	var body struct {
		Outfits json.RawMessage `json:"outfits"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil || string(body.Outfits) != "[]" {
		t.Errorf("outfits = %s, want []", body.Outfits)
	}
}

func TestRecommendRouteReturnsTheExpandedQuery(t *testing.T) {
	response := recommendationAPI(t, &llmtest.Fake{Text: expandedAllSlots}, &fakeProducts{}, &fakeEmbedder{}).
		Post("/api/v1/recommend", map[string]any{"occasion": "summer wedding"})
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", response.Code, response.Body)
	}

	var body struct {
		ExpandedQuery map[string]json.RawMessage `json:"expanded_query"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode body %s: %v", response.Body, err)
	}
	var slots map[string]*string
	if err := json.Unmarshal(body.ExpandedQuery["slots"], &slots); err != nil {
		t.Fatalf("decode expanded_query.slots in %s: %v", response.Body, err)
	}
	for _, slot := range []string{"top", "bottom", "accessory", "shoe"} {
		if slots[slot] == nil {
			t.Errorf("expanded_query.slots lacks %s: %s", slot, response.Body)
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
	if _, err := service.RecommendProducts(context.Background(), summerWedding); err != nil {
		t.Fatalf("Recommend: %v", err)
	}
	if !model.hasDeadline {
		t.Fatal("the model was called without a deadline")
	}
	if model.deadline.Before(start) || model.deadline.After(time.Now().Add(expandQueryTimeout)) {
		t.Errorf("deadline = %v, want within %v of %v", model.deadline, expandQueryTimeout, start)
	}
}

func TestRecommendRouteServerErrors(t *testing.T) {
	rejected := fmt.Errorf("embedder: 422 Unprocessable Entity: too long: %w", errs.ErrInvalidInput)
	tests := []struct {
		name   string
		answer string
		emb    *fakeEmbedder
	}{
		{name: "rejected phrase", answer: expandedAllSlots, emb: &fakeEmbedder{err: rejected}},
		{name: "blank slot phrase", answer: strings.Replace(expandedAllSlots, `"straw hat"`, `""`, 1), emb: &fakeEmbedder{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := recommendationAPI(t, &llmtest.Fake{Text: tt.answer}, &fakeProducts{}, tt.emb).Post("/api/v1/recommend", map[string]any{"occasion": "summer wedding"})
			if response.Code != http.StatusInternalServerError {
				t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusInternalServerError, response.Body)
			}
		})
	}
}
