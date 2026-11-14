package tests

import (
	"context"
	"errors"
	"slices"
	"testing"

	"birdie-and-claire/internal/llm"
	"birdie-and-claire/internal/llm/llmtest"
	"birdie-and-claire/internal/models"
)

const emptyTagLists = `{"colors":[],"formality":[],"occasions":[],"season":[],"pattern":[],"fabric":[],"fit":[]}`

func labelAnswer(target, neckline, bottom, shoe, tags string) string {
	return `{"product_target":"` + target + `","neckline_type":"` + neckline + `","bottom_type":"` + bottom +
		`","shoe_type":"` + shoe + `","tags":` + tags + `}`
}

func TestLabelProductKeepsOnlyListedValues(t *testing.T) {
	tags := `{"colors":["Navy","navy","teal"],"formality":["casual"],"occasions":["date night","date_night"],` +
		`"season":["fall"],"pattern":["solid"],"fabric":["viscose","knit"],"fit":["regular"]}`
	fake := &llmtest.Fake{Text: labelAnswer(" Women ", "modest", "", "", tags)}

	got, err := llm.LabelProduct(context.Background(), fake, llm.ProductLabelInput{Slot: models.SlotTop})
	if err != nil {
		t.Fatalf("LabelProduct: %v", err)
	}

	if got.ProductTarget != "women" {
		t.Errorf("ProductTarget = %q, want women", got.ProductTarget)
	}
	if got.NecklineType == nil || *got.NecklineType != "modest" {
		t.Errorf("NecklineType = %v, want modest", got.NecklineType)
	}
	want := models.ProductTags{
		Colors: []string{"navy"}, Formality: []string{"casual"}, Occasions: []string{"date_night"},
		Season: []string{"fall"}, Pattern: []string{"solid"}, Fabric: []string{"knit"}, Fit: []string{"regular"},
	}
	for name, lists := range map[string][2][]string{
		"colors": {got.Tags.Colors, want.Colors}, "formality": {got.Tags.Formality, want.Formality},
		"occasions": {got.Tags.Occasions, want.Occasions}, "season": {got.Tags.Season, want.Season},
		"pattern": {got.Tags.Pattern, want.Pattern}, "fabric": {got.Tags.Fabric, want.Fabric}, "fit": {got.Tags.Fit, want.Fit},
	} {
		if !slices.Equal(lists[0], lists[1]) {
			t.Errorf("%s = %q, want %q", name, lists[0], lists[1])
		}
	}
}

func TestLabelProductSetsOnlyTheSlotsOwnType(t *testing.T) {
	answer := labelAnswer("women", "low", "skirt", "heels", emptyTagLists)
	tests := []struct {
		slot                               models.ProductSlot
		wantNeckline, wantBottom, wantShoe bool
	}{
		{slot: models.SlotTop, wantNeckline: true},
		{slot: models.SlotBottom, wantBottom: true},
		{slot: models.SlotShoe, wantShoe: true},
		{slot: models.SlotAccessory},
	}

	for _, tt := range tests {
		t.Run(string(tt.slot), func(t *testing.T) {
			got, err := llm.LabelProduct(context.Background(), &llmtest.Fake{Text: answer}, llm.ProductLabelInput{Slot: tt.slot})
			if err != nil {
				t.Fatalf("LabelProduct: %v", err)
			}
			if (got.NecklineType != nil) != tt.wantNeckline || (got.BottomType != nil) != tt.wantBottom || (got.ShoeType != nil) != tt.wantShoe {
				t.Errorf("types = %v / %v / %v, want only the %s slot's type set", got.NecklineType, got.BottomType, got.ShoeType, tt.slot)
			}
		})
	}
}

func TestLabelProductDropsAnUnlistedType(t *testing.T) {
	fake := &llmtest.Fake{Text: labelAnswer("women", "sweetheart", "", "", emptyTagLists)}

	got, err := llm.LabelProduct(context.Background(), fake, llm.ProductLabelInput{Slot: models.SlotTop})
	if err != nil {
		t.Fatalf("LabelProduct: %v", err)
	}
	if got.NecklineType != nil {
		t.Errorf("NecklineType = %q, want nil for a value off the list", *got.NecklineType)
	}
}

func TestLabelProductRetriesAnAnswerWithoutATarget(t *testing.T) {
	fake := &llmtest.Fake{Text: labelAnswer("everyone", "", "", "", emptyTagLists)}

	_, err := llm.LabelProduct(context.Background(), fake, llm.ProductLabelInput{Slot: models.SlotAccessory})
	if !errors.Is(err, llm.ErrInvalidOutput) {
		t.Fatalf("err = %v, want ErrInvalidOutput", err)
	}
	if calls := len(fake.Requests()); calls != 2 {
		t.Errorf("made %d calls, want 2", calls)
	}
}
