# Style Preferences in Recommendations: Design Doc (#108)

Shoppers pick style preferences during onboarding (#96) and can change them in settings (#100), but the recommender (#102) doesn't use them yet. This doc looks at four ways to use them, tests each one against the 60 demo products on two LLMs, and recommends one. It also tests a prototype of the product enrichment step from the team's rec-system board, which adds a fifth option, and repeats the comparison on a catalog of 360 products with type columns and soft filters in SQL. Every test used 3 runs per prompt, so read the numbers as a direction rather than proof.

Throughout, "today" means main, which has the occasion-based recommender from #102. Its recommender code and prompt are identical to commit `d225350` on #102's branch, which is what the tests ran against.

---

## Recommendation

Send the shopper's saved shoes and bottoms picks to the LLM along with their other answers, and leave everything else alone.

In practice that's one new key in the `expand_answers` input, `saved preferences`, holding those picks the way onboarding labels them, and one new line in the prompt that only appears when the key is sent. The line tells the model that the occasion comes first, that each preference only applies to its own slot and only when it suits the occasion, and that preferences never add exclusions. The model then works the picks into its search phrases, and the existing search does the rest. `FindSimilar`, the embedder calls and the ranking don't change.

Style, neckline and the Dress pick aren't sent. In testing, sending them made outfits fit the occasion worse and added nothing measurable, so for now only two of the four onboarding questions change recommendations.

This option did best in testing, on both models. On dev's free model its outfits fit the occasion exactly as well as today's in total, and on DeepSeek V4.1 Flash they fit better. It matched the shopper's shoe and bottom picks more often than today in every run on both models and never returned an empty outfit. Sending every preference instead went from the worst option on the free model to the best on DeepSeek, so option 4 is also the one that depends least on which LLM runs it. Enriching the products didn't change any of this. On a catalog six times larger, it raised preference match by about half on the free model and nearly doubled it on DeepSeek, for an occasion-fit cost of about 2.5% that stays inside today's own run-to-run swing. Its weak spot is that "the occasion comes first" is only an instruction to the model. Nothing in the code enforces it.

There's a second step for later. If the ingestion step adds accurate `shoe_type` and `bottom_type` columns, a small SQL boost for products that match a saved pick, on top of option 4, brought preference match to 26 or 27 of 27 on the bigger catalog without lowering occasion fit. With the prototype's own LLM labels, the same boost added almost nothing, so that step waits until the columns are accurate.

---

## What the search can match

Before comparing options, I checked what the product embeddings can actually pick up. I embedded each preference word with FashionCLIP, the same model `ml/embedder` serves, and compared it with the stored vectors of the 60 demo products. Those came from a seed file, `backend/cmd/tasks/seeds/products.sql`, which was removed once the Shopify sync became the only way products get into the database. It is still in git history.

Some products sit close to almost any query in their slot. To keep them from winning every comparison, each word's score is its similarity to a product minus that product's similarity to a plain word for the slot ("shoes", "a bottom" or "a top"). This is the contrast score. To measure how well a word separates products, I used AUC. That's the chance that a product matching the word scores higher than one that doesn't, so 0.5 is a coin flip and 1.0 is perfect. Whether a product matches comes from its title or product type.

The first thing I learned was how the stored vectors are built. Each one is the sum of the product photo's vector and the text vector of its title and tags, normalized. Every stored vector has a cosine of 0.995 to 0.999 with that sum. So a word can match a product through its title and tags, or through its small 60x80 photo.

Words for specific items did well. "heels", "flats", "sneakers", "sandals" and "skirt" scored a perfect 1.00, "shorts" scored 0.96 and "pants" 0.95, so each one ranked its matching products first. Each word only had 1 to 10 matching products to find, though, and every one of them has its type in the title, which is part of the vector. B&C's real titles may not name the type as often. "heels" matched two products, the grey heels and the wedge sandal, and two products typed `Heels` are titled as flats. My labels follow the titles. The catalog has no boots and no dresses, so those two words couldn't be tested. All six sneakers are men's, out of 9 men's and 6 women's shoes, so a sneakers preference pulls men's shoes up.

None of the neckline words found anything useful, since no product title mentions a neckline. For "low neckline" the top three tops were a printed shrug, a men's waistcoat and a kurta, and for "v-neck" they were a sweater, a hoodie and a T-shirt. Nothing suggests the photos show necklines either.

The style words only partly worked. I tested each style as plain words, like "chic avant-garde" for Chic & avant-garde. Checked against the catalog's own tags, "timeless sophisticated" found formal tops well (0.96) but not formal shoes (0.61). "colorful eclectic" found multi-colored or printed tops (0.89), and "comfortable relaxed" found casual items only loosely (0.80 on tops, 0.75 on shoes). What the style words mostly did was sort products by gender. To check this, I scored them the same way but against each product's `women` or `men` tag, leaving out `unisex` and `girls`. That leaves 12 to 15 products per slot, 5 to 8 of them women's. Above 0.5 means women's products get pulled up, and below 0.5 means men's.

| Slot | chic avant-garde | timeless sophisticated | colorful eclectic | comfortable relaxed |
|---|---|---|---|---|
| Top | 0.84 | 0.35 | 0.84 | 0.27 |
| Bottom | 0.77 | 0.57 | 0.91 | 0.31 |
| Accessory | 0.75 | 0.47 | 0.72 | 0.12 |
| Shoe | 0.80 | 0.31 | 0.59 | 0.30 |

Any one number here is noisy because there are so few products, but each style leans the same way in every slot, apart from "timeless sophisticated" on bottoms. "chic avant-garde" and "colorful eclectic" pull women's products, and "comfortable relaxed" and "timeless sophisticated" pull men's. On shoes, for example, the top three for "chic avant-garde" were all women's: the wedge sandal, a pair of flats and the heels. This gender pull is the main reason not to embed style. It also casts doubt on the 0.89 for "colorful eclectic" on tops above. All three multi-colored or printed tops are women's, and "colorful eclectic" pulls women's tops up at 0.84, so that score may be measuring gender rather than style.

I also tried adding "no" to a phrase, and it did the opposite of what you'd expect. These were phrases I wrote myself, not ones the model produced. "comfortable shoes" ranked the heels 8th of 15, and "comfortable shoes, no heels" ranked them 4th. FashionCLIP doesn't understand "no". It just sees a phrase about heels. In practice the model never put a negation in a phrase, and the prompt now tells it to put anything the shopper rules out in `exclude_tags` instead.

For a sense of scale, on a few typical search phrases I wrote, like "linen midi skirt" and "tan sandals", the gap between the first and third product in a slot was 0.019 to 0.168. A matching nice tag is worth 0.02. The score gaps between matching and non-matching products for the specific-item words, 0.046 to 0.158, are big enough to reorder products that fit the occasion about equally well. They can't beat a clearly better match unless they're weighted heavily.

---

## The options

**1. All preferences to the LLM.** Every saved field goes into the `expand_answers` input under `saved preferences`, with a prompt line saying the occasion comes first. The ranking code stays the same.

**2. A nudge for every field.** The model's prompt stays the same. Instead, each preference word moves similar products up in its slot's ranking: style in every slot, neckline on tops, bottoms (including Dress) on bottoms, and shoes on shoes. A weight sets how strong the nudge is.

**3. The hybrid.** Style goes to the LLM under `saved style`, but only when the request has no vibe answer. Bottoms and shoes get the nudge from option 2 in their own slot. Neckline and Dress do nothing.

**4. Shoes and bottoms to the LLM (recommended).** Like option 1, but only the shoes and bottoms picks are sent, Dress is left out, and the prompt line is firmer: the occasion comes first, each preference applies only to its own slot, and preferences never add exclusions. I added this option after option 1 failed, to test whether the failures came from style and from preference-driven exclusions.

**5. Saved picks as an enriched-tag bonus.** This one only exists on the enriched catalog (see "Enriched products"). The prompt stays the same. Instead, each product gets a small bonus for every saved pick its enriched tags carry, including style and neckline, and a weight sets the size of the bonus.

### What the options look like in SQL

These are sketches of the scores, not the code the evaluation ran, which computed the same formulas in Python over the stored vectors. Like `FindSimilar`, lower scores rank higher. Options 1 and 4 change only the prompt, so their query is today's `FindSimilar`.

```sql
-- options 2 and 3: the nudge. $pick_vec is the vector for a saved pick ("heels"),
-- $plain_vec the vector for the plain slot word ("shoes"). With several picks, the best one counts.
SELECT id, title,
    (embedding <=> $phrase_vec)
    - 0.02 * (SELECT count(*) FROM unnest(tags) t WHERE lower(t) = ANY($nice_tags))
    - $w * ((embedding <=> $plain_vec) - (embedding <=> $pick_vec)) AS score
FROM products
WHERE slot = $slot AND NOT EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) = ANY($exclude_tags))
ORDER BY score, id
LIMIT 3;

-- option 5: a bonus for each saved pick the product's enriched tags carry
    - $w * (SELECT count(*) FROM unnest(tags) t WHERE t = ANY($saved_picks)) AS score
```

The issue suggested reranking a larger pool of candidates for the nudge options. That isn't needed. `FindSimilar` has no vector index, so it already scores every product in the slot, and the nudge is just one more term in that score.

I also looked at three other ideas. Mapping picks onto tags or product types to reuse the nice-tag bonus doesn't work, because no tag says heels or skirt. `product_type` does, but it's free text from the source catalog, and two of the products typed `Heels` are flats. Shifting the search phrase's vector toward the preference word turns out to rank products exactly the same way as the nudge, so it's the same option. Finally, neckline would need neckline tags on products, drafted by an LLM and checked by a person like the #91 basics tags. That's catalog work outside this ticket.

---

## Results

I measured five things, each averaged over 3 runs. Occasion fit counts the top-3 products in each slot that fit the occasion, across all 4 slots of all 20 pairs, so 240 in total. Full outfits counts how many of the 3 outfits per pair the recommender actually returns, which drops when a slot comes back with fewer than 3 products, so 60 in total. Preference match counts the top-3 products that match the shopper's pick, only on the 8 pairs where the pick should move up (9 slots, so 27 in total). Conflict picks counts how often the clashing pick reached the top 3 on the 3 conflict pairs, where it should stay out. Men's products counts men's items in the top 3 across all slots, out of 240. The shopper is a woman, so fewer is better there.

The two models are dev's free model, `nvidia/nemotron-3.5-super-vl:free`, and DeepSeek V4.1 Flash, `deepseek/deepseek-v4.1-flash`, which the team named for production. Each cell shows the free model first and DeepSeek second.

| Option | Occasion fit (of 240) | Preference match (of 27) | Conflict picks | Men's products (of 240) |
|---|---|---|---|---|
| Today (no preferences) | 126.3 / 120.0 | 13.3 / 13.7 | 0 / 0 | 75.0 / 79.3 |
| 1. All preferences to the LLM | 115.3 / 131.3 | 18.3 / 19.3 | 1.3 / 0 | 72.3 / 59.7 |
| 2. A nudge for every field (weight 0 / 0) | 126.3 / 120.0 | 13.3 / 13.7 | 0 / 0 | 75.0 / 79.3 |
| 3. The hybrid (weight 0 / 0.9) | 123.3 / 123.0 | 11.7 / 17.0 | 0 / 0.3 | 72.3 / 72.7 |
| 4. Shoes and bottoms to the LLM | 126.3 / 128.7 | 19.3 / 19.7 | 0.3 / 0 | 70.0 / 67.3 |

Every option returned all 60 outfits on both models, except option 1 on the free model, which returned 59.

Option 4 held up in every run. Its occasion fit was 125, 126 and 128, inside today's range of 119 to 130. Its preference match was 21, 19 and 18, against 13 or 14 today, and its men's products were 68 to 73, against 72 to 77. Pair by pair, occasion fit dipped a little on 5 pairs (3, 5, 10, 14 and 20), rose on 3 (4, 6 and 19) and stayed level on the rest. The biggest dip was pair 20, a brunch with skirt and flats saved, from 9 to 7. Its one conflict pick came from pair 19: for a shopper who typed "no heels" and saved heels, the model excluded heels and asked for flats every time, but in one run the wedge sandal still made the top three, because nothing tags it as a heel. On DeepSeek its occasion fit was 132, 131 and 123, against 116 to 124 today, and its preference match was 19 or 20, against 11 to 17. No conflicting pick got through.

Option 1 lost occasion fit, and two of its three runs scored below today's worst run. Most of the loss was in shoes and tops. For a wedding guest who saved heels, the model asked for an "elegant knee-length dress" in both the top and the bottom slot. For "Chic & avant-garde" it wrote phrases like "chic avant-garde blouse", which match nothing well. It also showed what preference-driven exclusions can do. For a funeral with sandals saved, one run excluded ten things, including "casual" and "leather", which removed every shoe, so that shopper got no outfits at all. For pair 2, a wedding guest who saved sneakers, men's sneakers reached the top three in two of three runs. On DeepSeek, the same option had the best occasion fit of all (131.3) and the fewest men's products (59.7), with no empty outfits. Part of that gain is gender, since men's products never fit, so showing fewer of them raises occasion fit by itself. The bigger problem is the swing. The same prompt went from worst to best depending on the LLM.

On the free model, options 2 and 3 can't use their nudge. Under the weight rule, the first weight above 0 already costs occasion fit on pair 5, so both stay at weight 0. That leaves option 2 identical to today, and option 3 as today plus saved style in the prompt. On DeepSeek, option 3's nudge passes the rule up to weight 0.9, which lifts its preference match to 17.0, still below option 4's.

Sending style never made outfits fit the occasion better. On the four style pairs, occasion fit per run was 6, 7 and 6 today against 5, 4 and 8 for the hybrid on pair 15. It was 7, 7 and 7 against 7, 6 and 5 on pair 16, 2, 3 and 5 against 3, 3 and 2 on pair 17, and 8, 10 and 9 against 8, 9 and 8 on pair 20. Option 1's numbers on the same pairs were similar. On DeepSeek the picture was mixed: the hybrid did better on pair 16 (7, 8 and 7 against 5, 6 and 5) and worse on pair 15 (7, 6 and 6 against 8, 8 and 8). The runs overlap too much to call it a clear loss, but style added nothing that would justify the odd phrases it caused.

---

## Enriched products

The team's rec-system board has a product enrichment step. A cheap model with structured output and fixed option lists labels each product from its title, description, Shopify tags and first photo, and the labels are flattened into tags that search and ranking can match. I prototyped it on the 60 demo products with dev's free vision model, sending each photo inline because that model's endpoint rejects image links. On top of the board's fields (slot, colors, formality, occasions, season, pattern, fabric, fit and a short style note), I added the four the preferences need, in onboarding's own values: neckline for tops, bottom type, shoe type and up to two styles. Each product's tags gained its labels, and its vector was rebuilt the way the stored ones were built, from the photo plus its title and its now longer tags. Rebuilding the original vectors that way reproduces them at a cosine of 0.995 to 0.999. The demo catalog has no descriptions, so the model saw only titles, tags and 60x80 photos.

Here's one product from the bigger catalog below. The model gets the title and the dataset's tags, plus the photo inline:

```json
{"title": "ONLY Women Black Top", "tags": ["top", "women", "black", "summer", "casual"]}
```

After dropping anything outside the lists, its answer is:

```json
{"colors": ["black"], "formality": "casual", "occasions": ["everyday", "date_night"],
 "season": ["summer"], "pattern": "solid", "fabric": "knit", "fit": "regular",
 "neckline": "low", "bottom_type": null, "shoe_type": null,
 "style": ["comfortable_relaxed", "timeless_sophisticated"],
 "style_notes": "A black strapless knit top that pairs well with jeans or a skirt."}
```

That gets flattened into these tags, which join the product's own:

```json
["black", "casual", "everyday", "date_night", "summer", "solid", "knit",
 "low_neckline", "comfortable_relaxed", "timeless_sophisticated"]
```

The product's vector is then `normalize(photo vector + text vector of "ONLY Women Black Top, top, women, black, summer, casual, everyday, date_night, solid, knit, low_neckline, comfortable_relaxed, timeless_sophisticated")`.

The labels were coarse. Of the 15 tops, 13 got a modest neckline, 1 a high one and none a low one. Comfortable & relaxed went on 41 of the 60 products, so the style tags barely tell products apart. A few labels were plainly wrong: a men's formal shoe got heels, a pair of striped flats got sandals, and the yoga skirt with leggings got pants. I haven't hand-checked the rest. The model's slot agreed with the catalog's for 59 of the 60.

I reran every option on the enriched catalog with both models' recorded answers. Enrichment only changes products, so no new LLM calls were needed for options 1 to 4.

| Option | Occasion fit (of 240) | Preference match (of 27) |
|---|---|---|
| Today (no preferences) | 127.3 / 121.7 | 12.0 / 12.7 |
| 1. All preferences to the LLM | 119.3 / 131.3 | 17.7 / 18.3 |
| 2. A nudge for every field (weight 0.45 / 0) | 129.3 / 121.7 | 13.7 / 12.7 |
| 3. The hybrid (weight 0.75 / 0.85) | 127.3 / 123.3 | 13.3 / 15.7 |
| 4. Shoes and bottoms to the LLM | 126.0 / 125.0 | 18.7 / 17.7 |
| 5. Saved picks as an enriched-tag bonus (weight 0.04 / 0) | 128.0 / 121.7 | 12.7 / 12.7 |

Option 4 still had the best or close to the best preference match on both models, with occasion fit close to today's on the free model and above it on DeepSeek. Option 1 still swung between the models. Option 5, the first option that can use style and neckline without embedding them, barely moved preference match. At higher weights it cost occasion fit, mostly on the style pairs, so the rule held it at 0.04 on the free model and 0 on DeepSeek. The labels are too coarse for style and neckline to help yet.

Enrichment did fix exclusions. The heels now carry a `heels` tag, so "no heels" removes them, and option 4's one conflict pick, the wedge sandal, disappeared on the free model. In the runs without preferences, 12 of the free model's 18 exclude tags matched an enriched tag, up from 7. Nice tags didn't improve, at 29 of 102, because the model still writes words like "elegant", "professional" and "date night" where the fixed list has `date_night`. Closing that gap needs `expand_answers` to use the same lists.

---

## A bigger catalog

With only 60 products, one label can swing a result, so I repeated the comparison on 360. The extra 300 are women's products from `ashraq/fashion-product-images-small` on Hugging Face, the same public dataset the demo catalog came from, pulled through its filter API without downloading the whole file. I sampled them evenly across product types (90 tops, 70 bottoms, 70 shoes and 70 accessories), used the dataset's gender, color, season and usage fields as their thin store tags, enriched them like the demo products, and built their vectors the same way. The dataset page lists no license, which is fine for a test set that never ships.

Nobody hand-labeled the new products, so DeepSeek labeled their occasion fit, reading each product's title, type and tags in batches of 30 per request and slot. I checked it on the 60 demo products first. It agreed with my hand labels on 86% of decisions (a kappa of 0.64), with a precision of 0.71 and a recall of 0.76. It broke the shopper rule three times, marking men's sunglasses and a men's cap as fitting, so that rule is applied in code instead. The demo products keep their hand labels. The judge cost about 2 cents and the enrichment $0. No new prompt calls were needed, because the recorded answers don't depend on the catalog.

| Option | Occasion fit (of 240) | Preference match (of 27) |
|---|---|---|
| Today (no preferences) | 142.7 / 153.7 | 13.7 / 10.7 |
| 1. All preferences to the LLM | 138.7 / 149.7 | 20.7 / 20.0 |
| 2. A nudge for every field (weight 0 / 0) | 142.7 / 153.7 | 13.7 / 10.7 |
| 3. The hybrid (weight 0.3 / 0.25) | 138.3 / 152.3 | 12.3 / 9.7 |
| 4. Shoes and bottoms to the LLM | 139.0 / 150.0 | 20.0 / 20.7 |
| 5. Saved picks as an enriched-tag bonus (weight 0.04 / 0.02) | 145.0 / 154.3 | 14.3 / 11.3 |

Options 1 and 4 raised preference match by about half on the free model and nearly doubled it on DeepSeek. Both cost about 4 points of occasion fit out of about 150, roughly 2.5%. Today's own three runs ranged from 133 to 158 on the free model and from 146 to 167 on DeepSeek, so that cost sits well inside the swing. Five of option 4's six runs landed in today's range, and the sixth missed by a point. I count that as the occasion still winning. Option 4 stays ahead of option 1, which again returned an empty outfit for the funeral with sandals saved on the free model and let more clashing picks through (2.3 against 0.7). Option 5 nudged occasion fit up but barely moved preference match.

The enrichment labels were coarse here too. 83 of the 90 new tops got a modest neckline, Comfortable & relaxed went on 222 of the 300 products, and only 4 of the 12 shoes typed `Heels` were labeled heels. The model called most of the others sandals.

---

## Type columns and soft filters in SQL

The ingestion step is meant to add `neckline_type`, `bottom_type` and `shoe_type` columns, and search doesn't have to stay plain vector search. It can mix in soft filters in SQL. I tested what that adds on the bigger catalog, again with no new LLM calls:

- A boost for products whose type column matches a saved shoes or bottoms pick, on top of option 4. I built accurate columns from the titles and product types, which is the same rule preference match uses, so this is the best case.
- The same boost using the prototype's LLM labels instead, which is what today's enrichment would give.
- A soft penalty of 0.5 for men's products.
- Exclusions check the type columns too, so "no heels" removes every product whose shoe type is heels.

| Variant | Occasion fit (of 240) | Preference match (of 27) |
|---|---|---|
| Option 4 alone | 139.0 / 150.0 | 20.0 / 20.7 |
| Option 4 + boost from accurate columns (weight 0.05 / 0.06) | 140.7 / 151.7 | 26.0 / 27 |
| Option 4 + boost from the prototype's labels (weight 0.01 / 0.01) | 139.0 / 150.3 | 20.3 / 21.0 |
| Boost from accurate columns with today's prompt (weight 0.06 / 0.06) | 143.3 / 154.3 | 17.3 / 16.7 |
| Today + men's penalty | 152.3 / 160.3 | 13.7 / 10.7 |
| Option 4 + accurate boost + men's penalty | 148.7 / 157.3 | 26.0 / 27 |

With accurate type columns, shoes and bottoms personalization is close to complete. The boost on top of option 4 matched almost every pick and occasion fit went slightly up, not down. The prompt and the boost help each other: the boost alone, with today's prompt, only reached about 17. Label quality is the limit. With the prototype's labels, the boost added well under one point, mostly because heels were labeled as sandals. An accurate `neckline_type` column would work the same way for tops, but the demo data has no reliable neckline labels to measure that against.

The men's penalty was the biggest occasion-fit gain of anything I tested, about 7 to 10 points. That mostly fixes the demo catalog, though. B&C only sells women's products, so its real catalog has nothing to penalize.

Put together, the query looks like this. `product_target` stands for whatever column says who a product is for.

```sql
SELECT id, title,
    (embedding <=> $phrase_vec)                                                 -- vector match
    - 0.02 * (SELECT count(*) FROM unnest(tags) t WHERE lower(t) = ANY($nice_tags))
    - 0.05 * (COALESCE(shoe_type = ANY($shoe_picks), false)
              OR COALESCE(bottom_type = ANY($bottom_picks), false))::int        -- soft boost
    + 0.5 * (product_target = 'men')::int                                       -- soft penalty, not a WHERE
  AS score
FROM products
WHERE slot = $slot
  AND NOT EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) = ANY($exclude_tags))
  AND NOT COALESCE(shoe_type = ANY($exclude_tags) OR bottom_type = ANY($exclude_tags), false)
ORDER BY score, id
LIMIT 3;
```

---

## How it works

Today the model gets the shopper's answers as one small JSON object. For a brunch, that's:

```json
{"occasion":"Brunch"}
```

With saved preferences, the model gets one more key listing the shopper's shoes and bottoms picks by the values Go stores. Pair 20's shopper also saved Chic & avant-garde, but style isn't sent, so the model gets:

```json
{"occasion":"Brunch","saved preferences":"bottoms: skirt; shoes: flats"}
```

The prompt also gets one more line, right after "When weather or vibe is missing, infer it from the occasion.":

> The object may also have saved preferences, the shoes and bottoms the shopper usually likes. The occasion always comes first: use a saved preference only in its own slot and only when it suits the occasion, and otherwise ignore it. Saved preferences never add exclude_tags.

Nothing after that changes. The model writes its search phrases, and `FindSimilar` finds products for them the same way it does today.

The recommendation service already builds the answers map that `ExpandAnswers` encodes. It would also read the shopper's `style_preferences`, turn their shoes picks and their bottoms picks other than Dress into one line of text, and pass that text to `ExpandAnswers`, where an empty string means no preferences. When the text isn't empty, `ExpandAnswers` adds it as the key and passes a flag to the template next to the encoded answers, because the template can't see inside them, and the line renders only when the flag is set. Since the key and the flag come from the same string, they can't disagree. Every pick in the two fields goes in as it is, including when a shopper picked all of them. A shopper with no shoes or bottoms picks, including one whose `style_preferences` is still NULL because onboarding isn't finished, gets no key and no extra line.

The text uses the values Go stores (`skirt`, `flats`), not onboarding's labels ("Skirt", "Flats"), so Go doesn't need its own copy of the labels. For shoes and bottoms the two differ only in capitalization. The runs in this doc sent the labels, so the lowercase version itself wasn't tested. The key and the line go into `backend/internal/llm/prompts/expand_answers.prompt`, which is on main now that #102 has merged.

---

## Questions and answers

### Is a preference a soft ranking signal or a hard filter?

Soft. A preference only shapes the search phrases the model writes, and the prompt line tells the model never to add exclusions because of one. The model's `exclude_tags` still filter products the way they do today. Hard filters would empty slots, because the catalog has no boots and no dresses, and the recommender returns only as many outfits as its shortest slot has products. Option 1 showed how that goes wrong: one preference-driven exclusion list removed every shoe and left the shopper with no outfits. Soft filters in SQL fit the same rule. A type-column boost or a penalty moves products up or down, and only the shopper's own exclusions remove anything.

### When an occasion and a preference conflict, which wins?

The occasion, because the prompt says so. That's an instruction, not a rule the code enforces. In testing it held: on the three conflict pairs, the clashing pick reached the top three once in nine runs on the free model, and that was the untagged wedge sandal. On DeepSeek it never did, and on the enriched catalog the wedge sandal carries a `heels` tag, so even that one gets excluded. When this request's answers clash with a saved preference, the request's answers reach the model alongside it. The prompt already sends anything the shopper rules out, like "no heels", to `exclude_tags`. Saved style isn't sent, so a vibe answer never competes with it.

### What happens to users with no preferences?

They get the same results they get today. Without shoes or bottoms picks, the prompt is byte for byte what it is today, since the key and the line only appear when there are picks, and `FindSimilar` doesn't change. A NULL `style_preferences` counts the same as empty lists. Phase 2 tests check that the rendered prompt is identical for these users.

### What does the approach add to latency and cost?

A little. On dev's model, requests with saved picks used about 65 more input tokens (508 instead of 443) and slightly fewer output tokens (69 against 73). There's no extra LLM call and no extra embedder call. The median latency was 880 ms against 752 ms today, with middle halves of 804 to 1,248 ms and 669 to 847 ms. The ranges overlap, but every prompt with preferences ran slower, so about 130 ms is probably real. Dev's model is free, so the cost there is $0. On DeepSeek, option 4 added about 55 input tokens (494 instead of 439), and its latency varied too much between runs to compare. The whole 141-call DeepSeek run cost $0.0107, under a hundredth of a cent per request, so the extra tokens cost almost nothing. The only other addition is one read of `users.style_preferences` by primary key per request. The later SQL boost would add one more term to a scan `FindSimilar` already does.

---

## How I evaluated

I used the 60 seeded products as they are, and that catalog is thin. It has no boots, no dresses, one pair of heels, one wedge sandal and 27 men's products. The shopper is a middle-aged woman, since that's who B&C sells to, so men's and girls' products never count as fitting. That leaves at most 7 tops, 5 bottoms, 12 accessories and 6 shoes that ever can.

The 20 test pairs below share 9 requests, each an occasion plus any details: Wedding guest, Workday, Beach day, Brunch, Party, Date night, Funeral, "Date night, vibe: casual" and "Workday, custom: no heels". For each request, I marked which products in each slot fit, on a local page that shows the product photos. Every request started from pre-filled guesses that I checked and corrected. Every formal shoe and every sneaker in the catalog is men's, so none of them fit in pair 2. Whether a product matches a pick isn't hand-labeled. It's read from the title and product type, and the fixture stores the result.

Each pair is compared with its request run with no preferences, which is today's behavior. Occasion fit and men's products should be read together. The prompt doesn't say the shopper is a woman, so today's results often include men's products. An option that only pulls women's products up would look like it improved occasion fit without actually suiting the occasion any better.

For the two nudge options, I picked the weight with one rule. I tried weights from 0 to 3 and kept only those where no pair lost occasion fit, comparing each weight with the same option at weight 0. Among those, I'd take the smallest weight that reached the best preference match. On the free model, only weight 0 passed for both options. On DeepSeek, the hybrid passed up to 0.9. Option 5 used the same rule with weights from 0 to 0.3, since its bonus counts tags rather than vector similarity.

For style, I checked whether the search phrases reflect the style, how many top-3 products change compared with no saved style, whether occasion fit holds, and how many men's products show up.

The search phrases came from dev's `AI_MODEL`, which was `nvidia/nemotron-3.5-super-vl:free` through OpenRouter, using the exact request the recommender sends at `d225350`, with 3 runs per distinct prompt. The 20 pairs need 47 distinct prompts: 9 for today, 20 for option 1, 4 for the hybrid's style pairs (15, 16, 17 and 20) and 14 for option 4. Option 2 reuses today's phrases, pair 18 has a vibe so the hybrid sends today's prompt for it, and the 6 pairs without shoes or bottoms picks send today's prompt under option 4. That came to 141 calls. None failed, and none would have been rejected by the recommender's limits on tag counts and phrase length. I ran the same 141 calls on DeepSeek V4.1 Flash, which cost $0.0107, and the enrichment took 60 more calls on the free model. The bigger catalog added 300 enrichment calls on the free model and about 170 judge calls on DeepSeek, counting the check against the demo labels and retries, and reused every recorded answer. An earlier round of 101 calls ran against #102's previous prompt, before it changed. Its results aren't reported here.

Everything the tests need is saved in `backend/internal/tests/testdata/style_preferences_eval.json`. Each request has its occasion and details, the products I marked as fitting, and 3 recorded answers without preferences. Each pair has its saved preferences, what it expects (the pick moves up, the pick stays out, or occasion fit holds), the products that match its pick, and 3 recorded answers from option 4's prompt. The recorded answers come from the free model, and the DeepSeek answers and the enriched catalog aren't stored. Phase 2's tests use each pair's saved preferences. The type boost's tests can replay the recorded answers without calling the LLM, though the phrases still have to become vectors through FashionCLIP before `FindSimilar` can use them.

| # | Request | Saved preferences | What it checks |
|---|---|---|---|
| 1 | Wedding guest | shoes: heels | Heels move up, since they suit the occasion |
| 2 | Wedding guest | shoes: sneakers | A conflict: the sneakers, all men's, stay out of the top 3 |
| 3 | Funeral | shoes: sandals | A conflict: the wedge sandal stays out of the top 3 |
| 4 | Workday | bottoms: skirt | Skirts move up, with 2 in the catalog |
| 5 | Workday | bottoms: pants | Pants move up, with 10 in the catalog |
| 6 | Beach day | bottoms: skirt | Skirts move up, since they suit the beach |
| 7 | Beach day | shoes: sandals | The only sandal moves up |
| 8 | Brunch | shoes: flats | Flats move up, since they suit the occasion |
| 9 | Party | shoes: heels, flats | Both move up when several values are picked |
| 10 | Party | shoes: boots | Occasion fit holds when no product matches the pick |
| 11 | Brunch | bottoms: dress | Occasion fit holds. Dress isn't sent, so the prompt is today's |
| 12 | Brunch | neckline: low | Occasion fit holds. Neckline isn't sent, so the prompt is today's |
| 13 | Workday | shoes: all five | Occasion fit holds when every value is picked |
| 14 | Workday | bottoms: pants, skirt, shorts | Occasion fit holds when every value but Dress is picked |
| 15 | Date night | style: Colorful & eclectic | Occasion fit holds. Style isn't sent under option 4 |
| 16 | Workday | style: Comfortable & relaxed | Occasion fit holds. Style isn't sent under option 4 |
| 17 | Funeral | style: Colorful & eclectic | A style conflict for options 1 and 3. Style isn't sent under option 4 |
| 18 | Date night, vibe: casual | style: Timeless & sophisticated | Occasion fit holds with both a vibe and a saved style |
| 19 | Workday, custom: "no heels" | shoes: heels | No heels reach the top 3, even with a saved heels pick |
| 20 | Brunch | style: Chic & avant-garde, bottoms: skirt, shoes: flats | Skirts and flats move up and occasion fit holds |

---

## Problems in the current prompt

These showed up in the runs with no preferences, so they affect every shopper on main.

Most of the model's tags don't match anything in the catalog. In those runs, only 29 of the 102 nice tags it wrote equal a real catalog tag, and 7 of the 18 exclude tags do. The model writes words like "comfortable", "professional", "elegant" and "workwear", which aren't tags at all.

That includes the prompt's own rule for "no heels". The model now puts `heels` in `exclude_tags` every time, but no product in the demo catalog carries a `heels` tag, so the exclusion removes nothing. What kept heels out of pair 19 was the phrase "comfortable flats", not the exclusion. Enrichment fixes this one (see "Enriched products"), but not the nice tags.

---

## Later

- A slot that can hold a dress.
- Neckline labels good enough to use. The prototype's came back almost all modest from 60x80 photos, so enrichment needs bigger photos or product descriptions.
- `expand_answers` using the same fixed tag lists as enrichment, so nice tags match.
- Accurate `shoe_type` and `bottom_type` columns from ingestion, then the SQL boost on top of option 4.
- A hand check of a sample of the labeler's type columns before the boost relies on them.
- Style, once the real catalog is in and it can be tested without the gender pull of the demo products.
- The demo catalog's 27 men's products, which B&C doesn't sell.
- The #91 basics, which add jeans, trousers, boots, sandals and pumps.
- Rerunning this evaluation on B&C's real catalog, with more runs per prompt.

---

## Open questions

- **Enforcing the occasion.** "The occasion comes first" is only a prompt instruction. Phase 2 has no code that stops a preference from beating the occasion, so its tests are the only check.
- **Replaying the recorded answers.** The replay test, which comes with the type boost, still has to turn the recorded phrases into vectors before `FindSimilar` can rank anything. It either calls the embedder or stores the vectors, and the fixture doesn't decide which.
- **Untagged products.** Without enrichment, nothing tags the wedge sandal as a heel or anything as `heels`, so "no heels" exclusions and heel matching both depend on titles. Enrichment fixes that, but its labels still need a hand check before they're trusted.
- **Labeler quality.** The SQL boost is only as good as the type columns. The prototype labeled 4 of 12 heels correctly, so whichever model or decision model fills the columns needs an accuracy check first.
- **Judge labels.** Occasion fit on the 300 new products came from an LLM that agreed with my hand labels 86% of the time on the demo products. The bigger-catalog numbers carry that error.
- **Only half the questions count.** Style, neckline and Dress do nothing for now. Whoever owns onboarding should know that two of its four questions don't change recommendations yet.
- **Overlapping PRs.** #102 has merged, so Phase 2 builds on main. #99, the PR for #94, also edits the recommendation files, but this approach doesn't change `FindSimilar`, so #99's new `excludeProductIDs` parameter won't conflict.

---

## Sources

- [FashionCLIP model card](https://huggingface.co/patrickjohncyh/fashion-clip): the model `ml/embedder` serves
- `backend/cmd/tasks/seeds/products.sql` (removed, in git history): the 60 products and their stored vectors
