# Style Preferences: Personalization and Ingestion Design (#108)

This is the design for using shoppers' saved style preferences in recommendations. It covers two things: what the recommender does with the preferences at request time, and what labeled product data the ingestion pipeline has to produce for that to work. The evidence behind it is in `docs/Style_Preferences_Research.md`, and every number here comes from those tests.



## The approach
Personalization happens in two places:

1. In the prompt, the recommender sends the shopper's saved shoes and bottoms picks to `expand_answers`, with one line telling the model that the occasion comes first. The model writes the picks into its search phrases where they fit. This works with today's data.
2. In the ranking, once ingestion fills a `shoe_type` and a `bottom_type` column for every product, the search gives a small boost to products whose type matches a saved pick, and drops products whose type the request rules out. This waits until those columns pass an accuracy check.

Style, neckline and the Dress pick don't affect recommendations yet. Style words mostly sorted products by gender, nothing in the catalog can show necklines reliably yet, and outfits have no slot for a dress.

The tests behind this ran on two models, dev's free model and DeepSeek V4.1 Flash, and on a catalog of 360 products:

- Sending only shoes and bottoms picks worked on both models. Sending every preference swung from the worst option on one model to the best on the other.
- On the 360-product catalog, the prompt change roughly doubled how often the shopper's pick showed up (from about 11 to 14 of 27 to about 20), for an occasion-fit cost of about 2.5%, which is inside today's own run-to-run swing.
- Adding the ranking boost with accurate type columns raised that to 26 or 27 of 27, and occasion fit went slightly up. With the prototype's LLM labels instead, the boost added almost nothing because those labels were wrong too often, so label quality decides whether step 2 helps.

End to end, the saved picks go into the prompt, and the model answers with a search phrase, nice tags and exclude tags for each slot. Each slot's search then ranks products by how close their vectors are to the phrase, gives a small bonus for matching nice tags and, once the columns exist, for a type that matches a saved pick, and drops anything the exclude tags rule out. The top three products in each slot become the outfits.



## What ingestion has to produce

Each product needs these labels, written by a multimodal LLM or a decision model that looks at the photo, title, description and store tags. Every value comes from a fixed list. Anything outside the list is dropped, and the store's own fields stay untouched in their own columns.

| Column | Values | Applies to | Used for |
|||||
| `slot` | top, bottom, accessory, shoe | every product | which search a product is in |
| `shoe_type` | sneakers, boots, sandals, heels, flats | shoes only, otherwise null | type boost and exclusions |
| `bottom_type` | pants, skirt, shorts, dress | bottoms only, otherwise null | type boost and exclusions |
| `neckline_type` | high, modest, low | tops only, otherwise null | a neckline boost later |
| `product_target` | women, men, girls, boys, unisex | every product | keeping products B&C doesn't sell out of outfits |
| `ai_tags` | colors, formality, occasions, season, pattern, fabric and fit, from the lists below | every product | nice-tag and exclude-tag matching, and the embedded text |
| `style_notes` | one short sentence | every product | not used in ranking |

The tag lists:

```json
{
  "colors": ["black", "white", "grey", "charcoal", "navy", "blue", "green", "olive", "red", "pink", "purple",
             "orange", "yellow", "brown", "beige", "cream", "gold", "silver", "bronze", "multi"],
  "formality": ["casual", "smart_casual", "semi_formal", "formal"],
  "occasions": ["everyday", "work", "party", "date_night", "wedding_guest", "brunch", "beach", "travel",
                "workout", "lounge", "funeral"],
  "season": ["spring", "summer", "fall", "winter"],
  "pattern": ["solid", "printed", "floral", "striped", "checked", "graphic", "embroidered"],
  "fabric": ["cotton", "linen", "silk", "wool", "denim", "leather", "synthetic", "knit", "metal", "chiffon"],
  "fit": ["slim", "regular", "relaxed", "oversized"]
}
```

The type values are onboarding's own values, so a saved pick and a product label compare directly. These are the rules the labels have to follow for the ranking to work:

- Each type column holds one value, or null when the product isn't in that column's slot, so a wedge counts as `heels`, ballet flats and ballerinas count as `flats`, and leggings, jeans, trousers and capris count as `pants`.
- Labels should come from looking at the product itself, because the store's fields get types wrong. "Catwalk Women Black Ballerinas" is typed `Heels` in the source data even though it's a pair of flats, and "Ant Kids Pleated Black Skirts" is tagged for women even though it's a kids' skirt.
- A wrong type label removes the wrong products, because exclusions trust the column. The prototype labeled "Portia Women Black Flats" as `sandals`, so a funeral's `sandals` exclusion removed a pair of flats that would have fit.
- The `expand_answers` prompt should use the same lists, since it writes nice tags and exclude tags freely today and only 29 of the 102 nice tags it wrote matched a real catalog tag. It writes "date night" where the list has `date_night`, and words like "elegant" that aren't on any list.
- A product's vector should include its labels, using `normalize(photo vector + text vector of "title, store tags, ai_tags")`, which is the same recipe as today's stored vectors with the labels added to the text.

Three correctly labeled products, the way ingestion should write them:

```json
{"title": "Inc. 5 Women Casual Golden Heels", "slot": "shoe", "product_target": "women",
 "shoe_type": "heels", "bottom_type": null, "neckline_type": null,
 "ai_tags": ["gold", "semi_formal", "party", "wedding_guest", "date_night", "spring", "summer", "solid", "synthetic", "regular"],
 "style_notes": "Gold heels that dress up a party or wedding outfit."}

{"title": "Catwalk Women Black Ballerinas", "slot": "shoe", "product_target": "women",
 "shoe_type": "flats", "bottom_type": null, "neckline_type": null,
 "ai_tags": ["black", "smart_casual", "work", "everyday", "funeral", "spring", "summer", "fall", "winter", "solid", "synthetic", "regular"],
 "style_notes": "Plain black ballerina flats for work or a quiet formal day."}

{"title": "ONLY Women Black Top", "slot": "top", "product_target": "women",
 "shoe_type": null, "bottom_type": null, "neckline_type": "low",
 "ai_tags": ["black", "casual", "everyday", "date_night", "summer", "solid", "knit", "regular"],
 "style_notes": "A black strapless knit top that pairs with jeans or a skirt."}
```

Before the ranking relies on a column, someone should hand-check a sample of its labels. The research only compared perfect columns with the prototype's labels, which got 4 of 12 heels right, so it can't say exactly where the line is. As a starting point, I'd check 50 products per column and turn the boost on when at least 9 in 10 are right.



## At request time

The recommendation service already builds the answers map that `ExpandAnswers` encodes. It also looks up the shopper's `style_preferences`, turns their shoes and bottoms picks into one line of text, and passes that text to `ExpandAnswers`:

```go
var prefs *models.StylePreferences
user, err := s.repo.User.GetByID(ctx, auth.UserID(ctx))
switch {
case errors.Is(err, errs.ErrNotFound): // no users row yet, so no preferences
case err != nil:
    return nil, err
default:
    prefs = user.StylePreferences // nil until onboarding is finished
}
expanded, err := llm.ExpandAnswers(ctx, s.llm, answers, formatStylePreferences(prefs)) // "bottoms: skirt; shoes: flats", or ""
// each slot: embed the phrase, then search with expanded.ExcludeTags and expanded.NiceTags
```

`formatStylePreferences` uses the stored values as they are, drops Dress, and lists bottoms and shoes in onboarding's order no matter what order they were saved in. It returns an empty string for nil, for empty lists, and for a shopper who only picked Dress. When the text isn't empty, `ExpandAnswers` adds it to the answers under a `saved preferences` key and sets a flag for the template, since the template can't see inside the encoded answers. Both come from the same string, so they can't disagree.

The model gets one more key, and the prompt gets one more line, right after "When weather or vibe is missing, infer it from the occasion.":

```json
{"occasion": "Brunch", "saved preferences": "bottoms: skirt; shoes: flats"}
```

> The object may also have saved preferences, the shoes and bottoms the shopper usually likes. The occasion always comes first: use a saved preference only in its own slot and only when it suits the occasion, and otherwise ignore it. Saved preferences never add exclude_tags.

A shopper with no shoes or bottoms picks gets no key and no line, so their prompt is byte for byte today's. That includes a shopper whose `style_preferences` is still NULL and one with no `users` row. The text uses the stored values (`skirt`, `flats`) instead of onboarding's labels ("Skirt", "Flats"), so Go doesn't need its own copy of the labels. For shoes and bottoms the two differ only in capitalization, but the research runs sent the labels, so the lowercase version itself wasn't tested.



## The search query

Each slot's search scores products like this, where lower ranks higher. Before the type columns exist, the query is today's `FindSimilar` without the type lines.

```sql
SELECT id, title,
    (embedding <=> $phrase_vec)                                                     -- vector match
    - 0.02 * (SELECT count(*) FROM unnest(tags) t WHERE lower(t) = ANY($nice_tags))  -- nice-tag bonus
    - 0.05 * (COALESCE(shoe_type = ANY($shoe_picks), false)
              OR COALESCE(bottom_type = ANY($bottom_picks), false))::int            -- type boost
  AS score
FROM products
WHERE slot = $slot
  AND product_target IN ('women', 'unisex')
  AND NOT EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) = ANY($exclude_tags))
  AND NOT COALESCE(shoe_type = ANY($exclude_tags) OR bottom_type = ANY($exclude_tags), false)
ORDER BY score, id
LIMIT 3;
```

The 0.05 came from the weight rule in the research: the smallest weight that reached the best preference match without lowering occasion fit on any test pair. It was tuned on the 360-product test catalog, so it should be tuned again on B&C's catalog with the same rule. The `product_target` line is a hard filter here because B&C only sells women's products. A soft penalty of 0.5, which a reviewer suggested, did the same job on the test catalog.



## Worked examples

Each example uses real products from the test catalog and the answer DeepSeek actually gave, with the products labeled the way ingestion should label them. Distances are cosine distances from each product's vector to the model's phrase for that slot. The runs sent onboarding's labels ("Heels"), and the examples show the stored values ("heels") that the recommender will send.

### A saved pick that suits the occasion

Given a wedding guest who saved heels, and these shoes among the closest to the phrase:

```json
{"request": {"occasion": "Wedding guest"}, "style_preferences": {"shoes": ["heels"]}}

{"title": "Enroute Women Casual White Heels",  "shoe_type": "heels",  "colors": ["white"], "distance": 0.367}
{"title": "Catwalk Women White Heels",         "shoe_type": "heels",  "colors": ["white"], "distance": 0.376}
{"title": "Inc. 5 Women Casual Golden Heels",  "shoe_type": "heels",  "colors": ["gold"],  "distance": 0.395}
{"title": "Senorita Women Black Wedges",       "shoe_type": "heels",  "colors": ["black"], "distance": 0.408}
{"title": "Portia Women Black Flats",          "shoe_type": "flats",  "colors": ["black"], "distance": 0.415}
{"title": "Inc.5 Women Gold Casual Heels",     "shoe_type": "heels",  "colors": ["gold"],  "distance": 0.430}
```

the recommender runs `expand_answers` on `{"occasion": "Wedding guest", "saved preferences": "shoes: heels"}`, which answers with the shoe phrase "heeled sandals, comfortable height" and `exclude_tags: ["white"]`, and then the search with `$shoe_picks = ["heels"]`,

which returns:

```
0.345  Inc. 5 Women Casual Golden Heels   (0.395 - 0.05)
0.358  Senorita Women Black Wedges        (0.408 - 0.05)
0.380  Inc.5 Women Gold Casual Heels      (0.430 - 0.05)
```

and those results meet the expectation: all three are heels and all three suit a wedding. The two white pairs are gone because white is excluded for a wedding guest. Without the boost, the third shoe would have been the black flats at 0.415, which don't suit a wedding.

### The request rules out the saved pick

Given a shopper who saved heels but typed "no heels" for a workday:

```json
{"request": {"occasion": "Workday", "details": [{"key": "custom", "value": "no heels"}]},
 "style_preferences": {"shoes": ["heels"]}}

{"title": "Portia Women Black Flats",           "shoe_type": "flats", "distance": 0.462}
{"title": "Catwalk Women Black Ballerinas",     "shoe_type": "flats", "distance": 0.480}
{"title": "Catwalk Women Leather Brown Flats",  "shoe_type": "flats", "distance": 0.485}
{"title": "Enroute Women Casual White Heels",   "shoe_type": "heels", "distance": 0.499}
{"title": "Catwalk Women White Heels",          "shoe_type": "heels", "distance": 0.505}
```

the recommender runs `expand_answers` on `{"occasion": "Workday", "custom": "no heels", "saved preferences": "shoes: heels"}`, which answers with "flat loafers, supportive insole, closed toe, professional" and `exclude_tags: ["heels"]`, and then the search,

which returns:

```
0.462  Portia Women Black Flats
0.480  Catwalk Women Black Ballerinas
0.485  Catwalk Women Leather Brown Flats
```

and those results meet the expectation: no heels reach the top three, even though heels are saved. The exclusion works because it checks `shoe_type`. On the demo catalog, where no product carries a `heels` tag, the same exclusion removed nothing.

### A saved pick that clashes with the occasion

Given a shopper who saved sandals, dressing for a funeral:

```json
{"request": {"occasion": "Funeral"}, "style_preferences": {"shoes": ["sandals"]}}

{"title": "Rocia Women Black Flats",         "shoe_type": "flats",   "colors": ["black"], "distance": 0.481}
{"title": "Senorita Women Black Wedges",     "shoe_type": "heels",   "colors": ["black"], "distance": 0.489}
{"title": "Catwalk Women Black Ballerinas",  "shoe_type": "flats",   "colors": ["black"], "distance": 0.491}
{"title": "Portia Women Black Flats",        "shoe_type": "flats",   "colors": ["black"], "distance": 0.492}
{"title": "Rocia Women Black Sandals",       "shoe_type": "sandals", "colors": ["black"], "distance": 0.494}
```

the recommender runs `expand_answers` on `{"occasion": "Funeral", "saved preferences": "shoes: sandals"}`, which answers with "black closed-toe low heel pumps, matte", `nice_tags` including `black`, and `exclude_tags: ["bright colors", "sandals", "open toe", "heels"]`, and then the search with `$shoe_picks = ["sandals"]`,

which returns:

```
0.461  Rocia Women Black Flats          (0.481 - 0.02)
0.471  Catwalk Women Black Ballerinas   (0.491 - 0.02)
0.472  Portia Women Black Flats         (0.492 - 0.02)
```

and those results meet the expectation: the occasion wins. The sandals are excluded, so the boost never reaches them, and every shoe shown is a plain black flat. The example also shows the boost's risk, because if the model hadn't excluded sandals, the boost would have put them first at 0.424 (0.494 - 0.02 - 0.05). That's why the weight stays small and why exclusions come from the model's reading of the occasion.

### A shopper with no preferences

Given a shopper whose `style_preferences` is NULL, asking for brunch:

```json
{"request": {"occasion": "Brunch"}, "style_preferences": null}
```

the recommender runs `expand_answers` on `{"occasion": "Brunch"}` with the same prompt as today, which answers with "comfortable flat sandals or low block heels" and `nice_tags` including `brunch` and `casual`, and then the search with no picks,

which returns:

```
0.340  Portia Women Black Flats           (0.380 - 0.04)
0.365  Enroute Women Casual White Heels   (0.405 - 0.04)
0.382  Catwalk Women White Heels          (0.422 - 0.04)
```

and those results meet the expectation: the rendered prompt is byte for byte today's, the type boost adds nothing, and the results are exactly what the recommender returns without this change.



## Tests for Phase 2

Phase 2 ships only the prompt change, and none of its tests call the LLM:

- In `package llm`, the stub-client test renders the request. With no saved preferences, the rendered messages match a golden file captured from main's prompt before the template changed. With saved preferences, they have the `saved preferences` key and the extra line.
- In `package services`, a test checks the text for nil, empty lists, Dress only and real picks (`"bottoms: skirt; shoes: flats"`). Nil covers both a NULL `style_preferences` and a missing `users` row. The test also reads each of the 20 pairs in the eval fixture, `backend/internal/tests/testdata/style_preferences_eval.json`, and checks its text against an expected string written in the test, since the fixture doesn't store one.
- Another test in `package services` reads the `enum` tags on `StylePreferences.Bottoms` and `StylePreferences.Shoes`, and fails when a value is missing from the order lists the text uses. Dress is the one value left out on purpose.
- In `internal/tests`, a shopper with no `users` row still gets outfits, and a user lookup that fails for any other reason returns that error.

The ranking tests move to the type boost's PR, since they need the type columns:

- For each fixture pair, replaying its recorded answers through the search meets its `expect` value: the pick moves up, the pick stays out of the top 3, or occasion fit holds. The phrases still need FashionCLIP to become vectors, so these tests either call the embedder or store the vectors.
- An exclude tag that names a type removes every product with that `shoe_type` or `bottom_type`.
- With the type columns empty, the query ranks exactly like today's `FindSimilar`.



## Order of work

1. Ship the prompt change first, since it needs no new data and worked on both models tested.
2. Add the ingestion labels above, and add the same tag lists to the `expand_answers` prompt.
3. Hand-check a sample of `shoe_type` and `bottom_type`, and once they pass, turn on the type boost and the type exclusions and tune the weight on B&C's catalog with the research's weight rule.
4. Once `neckline_type` passes the same check, add a neckline boost for tops the same way. Style and Dress stay out until there's a way to test them, since style needs labels that tell products apart (the prototype put Comfortable & relaxed on 222 of 300 products) and Dress needs an outfit slot.



## Open questions

- The accuracy bar of 9 in 10 correct labels is a starting point I picked, not a number the research tested.
- Tuning the weight on B&C's catalog will need occasion-fit labels. An LLM judge agreed with hand labels 86% of the time in the research, so it could do most of that labeling as long as someone checks a sample.
- The tag lists and type values are shared by ingestion, the prompt and the search, so they should live in one Go package that all three use.
- Nothing in the code enforces "the occasion comes first", since it's only an instruction in the prompt. In the funeral example, it was the model's exclusions that kept the boosted sandals out.
