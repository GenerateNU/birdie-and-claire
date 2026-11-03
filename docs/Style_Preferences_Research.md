# Style Preferences in Recommendations: Design Doc (#108)

Shoppers pick style preferences during onboarding (#96) and can change them in settings (#100), but the recommender (#102) doesn't use them yet. This doc looks at three ways to use them, tests each one against the 60 demo products, and recommends one. The tests used 3 runs per occasion on dev's free model, so read the numbers as a direction rather than proof.

---

## Recommendation

Give the saved preferences to the LLM along with the shopper's other answers, and leave the rest of the recommender alone.

In practice that's one new key in the `expand_query` input, `saved preferences`, holding the shopper's picks the way onboarding labels them. It also adds one line to the prompt, which only appears when that key is sent. The line tells the model to use the preferences where they suit the occasion and to follow the occasion when they don't. The model then works the preferences into its search phrases, for example "pastel heels, formal wedding style" for a wedding guest who saved heels, and the existing search does the rest. `FindSimilar`, the embedder calls and the ranking don't change. Preferences only steer the search, and nothing gets filtered out.

This option did best in testing. Compared with today, it picked products matching the shopper's shoe and bottom choices more often in every run. Its outfits fit the occasion about as well as today's, within the model's normal run-to-run variation, and it showed fewer men's products. It's also the smallest change. Its weak spot is conflicts. When a saved preference doesn't suit the occasion, like heels for a beach day, the model sometimes follows the preference anyway.

---

## What the search can match

Before comparing options, I checked what the product embeddings can actually pick up. I embedded each preference word with FashionCLIP, the same model `ml/embedder` serves, and compared it with the stored vectors of the 60 products in `backend/cmd/tasks/seeds/products.sql`.

Some products sit close to almost any query in their slot. To keep them from winning every comparison, each word's score is its similarity to a product minus that product's similarity to a plain word for the slot ("shoes", "a bottom" or "a top"). This is the contrast score. To measure how well a word separates products, I used AUC. That's the chance that a product matching the word scores higher than one that doesn't, so 0.5 is a coin flip and 1.0 is perfect. Whether a product matches comes from its title or product type.

The first thing I learned was how the stored vectors are built. Each one is the product photo's vector plus the text vector of its title and tags, normalized, with cosine 0.995 to 0.999 for all 60 products. So a word can match a product through its title and tags, or through its small 60x80 photo.

Words for specific items did well. Heels, flats, sneakers, sandals and skirt scored a perfect 1.00, shorts scored 0.96 and pants 0.95, so each one ranked its matching products first. There's a catch, though. Each word only had 1 to 10 matching products to find, and every one of them has its type in the title, which is part of the vector. B&C's real titles may not name the type as often. Two products have the product type `Heels` but are titled as flats, and my labels follow the titles. The catalog has no boots and no dresses, so those two words couldn't be tested. All six sneakers are men's, out of 9 men's and 6 women's shoes, so a sneakers preference pulls men's shoes up.

None of the neckline words found anything useful, since no product title mentions a neckline. For "low neckline" the top three tops were a printed shrug, a men's waistcoat and a kurta, and for "v-neck" they were a sweater, a hoodie and a T-shirt. Nothing suggests the photos show necklines either.

The style words only partly worked. Checked against the catalog's own tags, timeless sophisticated found formal tops well (0.96) but not formal shoes (0.61). Colorful eclectic found multi-colored or printed tops (0.89), and comfortable relaxed found casual items only loosely (0.80 on tops, 0.75 on shoes). What the style words mostly did was sort products by gender. To check this, I scored them the same way but against each product's `women` or `men` tag, leaving out `unisex` and `girls`. That leaves 12 to 15 products per slot, 5 to 8 of them women's. Above 0.5 means women's products get pulled up, and below 0.5 means men's.

| Slot | chic avant-garde | timeless sophisticated | colorful eclectic | comfortable relaxed |
|---|---|---|---|---|
| Top | 0.84 | 0.35 | 0.84 | 0.27 |
| Bottom | 0.77 | 0.57 | 0.91 | 0.31 |
| Accessory | 0.75 | 0.47 | 0.72 | 0.12 |
| Shoe | 0.80 | 0.31 | 0.59 | 0.30 |

Any one number here is noisy because there are so few products, but each style leans the same way in every slot, apart from timeless sophisticated on bottoms. Chic avant-garde and colorful eclectic pull women's products, and comfortable relaxed and timeless sophisticated pull men's. On shoes, for example, the top three for "chic avant-garde" were all women's: the wedge sandal, a pair of flats and the heels. This gender pull is the main reason not to embed style. It also casts doubt on the 0.89 for colorful eclectic on tops above. All three multi-colored or printed tops are women's, and colorful eclectic pulls women's tops up at 0.84, so that score may be measuring gender rather than style.

I also tried adding "no" to a phrase, and it did the opposite of what you'd expect. These were phrases I wrote myself, not ones `expand_query` produced. "comfortable shoes" ranked the heels 8th of 15, and "comfortable shoes, no heels" ranked them 4th. FashionCLIP doesn't understand "no". It just sees a phrase about heels. Nothing in the #102 prompt tells the model to leave negations out of its phrases, but in my test runs it never wrote one (see "Problems in the current prompt").

For a sense of scale, the gap between the first and third product in a slot is 0.019 to 0.168 for today's search phrases, and a matching nice tag is worth 0.02. The concrete-word gaps of 0.046 to 0.158 are big enough to reorder products that fit the occasion about equally well. They can't beat a clearly better match unless they're weighted heavily.

---

## The three options

**1. All preferences to the LLM.** Every saved field goes into the `expand_query` input under `saved preferences`, along with a prompt line saying the occasion comes first. The ranking code stays the same. This is the one I recommend.

**2. An embedding nudge for every field.** Each preference word adds a bonus in its slot's ranking. Style nudges every slot, neckline nudges tops, bottoms and dress nudge bottoms, and shoes nudge shoes.

**3. A hybrid.** Style goes to the LLM under `saved style`, but only when the request has no vibe answer. Bottoms and shoes get a bonus in their own slot: the more a product looks like the shopper's pick, compared with a plain word like "shoes", the further up it moves. A weight sets how strong the bonus is. Neckline and dress do nothing.

The issue suggested reranking a larger pool of candidates for the nudge options. That isn't needed. `FindSimilar` has no vector index, so it already scores every product in the slot, and the nudge is just one more term in that score.

I also looked at three other ideas. Mapping picks onto tags or product types to reuse the nice-tag bonus doesn't work, because no tag says heels or skirt. `product_type` does, but it's free text from the source catalog, and two of the products typed `Heels` are flats. Shifting the search phrase's vector toward the preference word turns out to rank products exactly the same way as the bonus, so it's the same option. Finally, neckline would need neckline tags on products, drafted by an LLM and checked by a person like the #91 basics tags. That's catalog work outside this ticket.

---

## Results

I measured three things, each averaged over 3 runs. Occasion fit counts the top-3 products in each slot that fit the occasion, across all 4 slots of all 20 pairs, so 240 in total. Preference match counts the top-3 products that match the shopper's shoe or bottom pick, across the 13 slots where a pick applies, so 39 in total. Men's products counts men's items in the top 3 across all slots, also out of 240. The shopper is a woman, so fewer is better there.

| Option | Occasion fit (of 240) | Preference match (of 39) | Men's products (of 240) |
|---|---|---|---|
| Today (no preferences) | 116.7 | 14.7 | 84.0 |
| 1. All to the LLM | 119.0 | 19.0 | 74.7 |
| 2. Nudge every field (weight 0) | 116.7 | 14.7 | 84.0 |
| 3. Hybrid (weight 0.75) | 113.0 | 16.3 | 84.3 |

The weights for options 2 and 3 come from the weight rule described under "How I evaluated".

Sending everything to the LLM held up in every run. Preference match was 19 in each of the 3 runs, against 13 to 17 today, and men's products were 73 to 78, against 76 to 94. Occasion fit ranged from 113 to 124, inside today's range of 106 to 125. Pair by pair, the picture is mixed. Occasion fit went down on 8 pairs (1, 2, 3, 6, 7, 11, 12 and 15), up on 8 (4, 8, 9, 13, 14, 18, 19 and 20), and stayed the same on 4. Those swings are about the size of the model's normal randomness. Three identical Workday runs alone gave 4, 6 and 8 fitting products. Across all pairs, two runs of the same prompt differ by 5.2 of the 12 top-3 products per pair, and all to the LLM differs from today by 5.6.

It had trouble with conflicts. For pair 2, a wedding guest who saved sneakers, a men's shoe made the top three in an average run, where today there are none. For pair 3, a beach day for someone who saved heels, the top three averaged 1.33 heels instead of today's 0.33, and occasion fit dropped from 3.7 to 2.7. Two conflicts held up. The funeral pair (17) didn't change, and for the shopper who typed "no heels" (19), no heels made the top three.

The hybrid did worse because of its style half. Putting a saved style in the prompt lowered occasion fit on all four style pairs: pair 15 from 7.7 to 5.3, pair 16 from 6.0 to 4.3, pair 17 from 3.7 to 3.0 and pair 20 from 7.3 to 5.7. For pairs 15 and 20, even its best run was worse than today's worst. The model often ignored "only where it suits the occasion". With "Comfortable & relaxed" saved, it wrote joggers and canvas sneakers for a workday. With "Chic & avant-garde" for brunch, it wrote phrases like "block heel ankle boots with architectural shape", which nothing in the catalog matches.

The hybrid's nudge helped a little at low weights and hurt at higher ones. The weight rule lets it go up to 0.75, which raises preference match from 13.0 to 16.3. At weight 1, black jeans start losing their workday spot to the yoga skirt or men's track pants (pairs 4 and 5), and higher weights let heels into the beach and "no heels" outfits.

Option 2 couldn't use any weight above 0, because at 0.25 the style nudge already costs occasion fit on pair 15, so the rule leaves it identical to today. For the nudge itself, the contrast score beat raw similarity at every weight, with 25.3 against 18.3 of 39 at weight 3.

---

## How it works

Today the model gets the shopper's answers as one small JSON object. For a brunch, that's:

```json
{"occasion":"Brunch"}
```

With saved preferences, the recommendation service reads the shopper's `style_preferences` and adds one key that lists them the way onboarding labels them. For pair 20, the model gets:

```json
{"occasion":"Brunch","saved preferences":"style: Chic & avant-garde; bottoms: Skirt; shoes: Flats"}
```

The prompt also gets one more line, right after "When weather or vibe is missing, infer it from the occasion.":

> The object may also have saved preferences, the shopper's usual taste from their profile. Let them shape the phrases only where they suit the occasion. When one doesn't, follow the occasion.

Nothing after that changes. The model writes its search phrases, and `FindSimilar` finds products for them the same way it does today.

Every saved field goes in as it is, with its onboarding label, in the order style, neckline, bottoms, shoes. That includes neckline and Dress, and it includes style even when the shopper also picked a vibe. The model decides what to use, which is exactly the version I tested. Fields with no picks are left out. A shopper with no preferences at all, including one whose `style_preferences` is still NULL because onboarding isn't finished, gets no key and no extra line. Both the key and the line live in #102's prompt, so this ships after #102 merges.

---

## Questions and Answers

### Is a preference a soft ranking signal or a hard filter?

Soft, because the model works preferences into its search phrases where they fit, and nothing is ever filtered out. Hard filters would empty slots, because the catalog has no boots and no dresses. #102 returns only as many outfits as its shortest slot has products, so one empty slot means no outfits at all.

### When an occasion and a preference conflict, which wins?

The occasion, because the prompt says so. In testing that held for the funeral and for "no heels", but not every time for heels at the beach or sneakers at a wedding (pairs 3 and 2). A vibe answer and a saved style both reach the model, and so do custom text and saved picks.

### What happens to users with no preferences?

They get the same results they get today. Without saved preferences the prompt is byte for byte what it is today, since the key and the line only appear when there are preferences, and `FindSimilar` doesn't change. A NULL `style_preferences` counts the same as empty lists. Phase 2 tests check that the prompt is identical for these users.

### What does the approach add to latency and cost?

Very little, because on dev's model, requests with preferences used about 51 more input tokens (452 instead of 400) and the same number of output tokens (80 against 81). There's no extra LLM call and no extra embedder call. Median latency was 704 ms today and 708 ms with preferences, well inside today's own spread of 654 to 1,236 ms (25th to 75th percentile). Dev's model is free, so the cost there is $0. On a paid model it's the price of about 51 input tokens per request. The only other addition is one read of `users.style_preferences` by primary key per request.

---

## How I evaluated

I used the 60 seeded products as they are, and that catalog is thin. It has no boots, no dresses, one sandal, two heels and 27 men's products. The shopper is a middle-aged woman, since that's who B&C sells to, so men's and girls' products never count as fitting. That leaves at most 7 tops, 5 bottoms, 12 accessories and 6 shoes that ever can. Results are reported per pair so these gaps stay visible.

The 20 test pairs below share 9 occasions: Wedding guest, Workday, Beach day, Brunch, Party, Date night, Funeral, "Date night, vibe: casual" and "Workday, custom: no heels". For each occasion, I marked which products in each slot fit, on a local page that shows the product photos. Every occasion started from pre-filled guesses that I checked and corrected. Every formal shoe and every sneaker in the catalog is men's, so none of them fit in pair 2. Whether a product matches a shoe or bottom pick isn't hand-labeled. It's read from the title and product type.

Each pair is compared with the same occasion run with no preferences, which is today's behavior. Occasion fit and men's products should be read together. #102's prompt doesn't say the shopper is a woman, so today's results often include men's products. An option that only pulls women's products up would look like it improved occasion fit without actually suiting the occasion any better.

For style, I checked four things
- whether the search phrases reflect the style
- how many top-3 products change compared with no saved style
- whether occasion fit holds
- how many men's products show up

For the nudge options, I picked the weight with the rule to try weights from 0 to 3 and keep only those where no pair loses occasion fit. From those, take the smallest weight that reaches the best preference match. Each weight is compared with the same option at weight 0, so only the nudge counts, and the hybrid's style prompt was judged separately against today. Any slip during the sweep had its label rechecked first. One did: in pair 2, the brown leather flats pushed the wedge sandal out at weight 0.25, and on recheck the flats were relabeled as fitting a wedding.

The search phrases came from the live model in dev's `AI_MODEL` through OpenRouter, using the exact request #102's code sends, with 3 runs per distinct prompt. The 20 pairs need 33 distinct prompts. That's 9 for today, none extra for option 2 (it reuses today's phrases), 4 for the hybrid's style pairs 15, 16, 17 and 20, and 20 for option 1. Pair 18 has a vibe, so the hybrid sends today's prompt for it. That came to 99 calls, and 101 were made because two hit a rate limit and were retried.

Everything is saved in `backend/internal/tests/testdata/style_preferences_eval.json`: the occasions, the labels, the pairs and the recorded model answers. There are 3 of today's answers per occasion and 3 all-to-the-LLM answers per pair, so Phase 2 tests can replay them through `FindSimilar` without calling the model.

| # | Occasion and details | Saved preferences | What it checks |
|---|---|---|---|
| 1 | Wedding guest | shoes: heels | Heels move up, since they suit the occasion |
| 2 | Wedding guest | shoes: sneakers | A conflict: the sneakers, all men's, stay below the women's shoes that fit |
| 3 | Beach day | shoes: heels | A conflict: heels stay out of the top 3 |
| 4 | Workday | bottoms: skirt | Skirts move up, with 2 in the catalog |
| 5 | Workday | bottoms: pants | Pants move up, with 10 in the catalog |
| 6 | Beach day | bottoms: shorts | Shorts move up, since they suit the occasion |
| 7 | Beach day | shoes: sandals | The only sandal moves up |
| 8 | Brunch | shoes: flats | Flats move up, since they suit the occasion |
| 9 | Party | shoes: heels, flats | Both move up when several values are picked |
| 10 | Party | shoes: boots | Occasion fit holds when no product matches the pick |
| 11 | Brunch | bottoms: dress | Occasion fit holds for a pick with no slot |
| 12 | Brunch | neckline: low | Occasion fit holds for a pick with no signal |
| 13 | Workday | shoes: all five | Occasion fit holds when every value is picked |
| 14 | Workday | bottoms: pants, skirt, shorts | Occasion fit holds when every counted value is picked |
| 15 | Date night | style: Colorful & eclectic | The phrases reflect the style, and occasion fit holds |
| 16 | Workday | style: Comfortable & relaxed | The phrases reflect the style, and occasion fit holds |
| 17 | Funeral | style: Colorful & eclectic | A conflict: occasion fit holds |
| 18 | Date night, vibe: casual | style: Timeless & sophisticated | Occasion fit holds with both a vibe and a saved style |
| 19 | Workday, custom: "no heels" | shoes: heels | No heels reach the top 3, even with a saved heels pick |
| 20 | Brunch | style: Chic & avant-garde, bottoms: skirt, shoes: flats | Skirts and flats move up and occasion fit holds, with everything picked at once |

---

## Problems in the current prompt

These showed up in the runs with no preferences, so they affect every shopper today.

The model sometimes copies the example in the prompt. It returned "light pastel blouse, breathable fabric" as the top phrase in 11 of 99 answers, 4 of them with no preferences at all.

Most of the model's nice tags don't match anything in the catalog. Only 97 of 447 equal a real catalog tag. The model writes "wedding guest" where the catalog has `wedding_guest`, and words like "comfortable", "pastel" and "elegant" aren't tags at all. Exclude tags matched 68 of 132.

The model never put a negation in a search phrase. None of the 99 answers contained "no", "not", "without" or "avoid", and for "no heels" it wrote loafers or flats every time.

---

## Later

- A slot that can hold a dress.
- Neckline tags on products, so neckline can count for more than the model's reading of it.
- The men's products in the demo catalog.
- The #91 basics, which add jeans, trousers, boots, sandals and pumps.
- Rerunning this evaluation on B&C's real catalog, with more runs per occasion.

---

## Open questions

- **Conflicts.** The occasion-first line didn't hold for heels at the beach or sneakers at a wedding. A stronger line, or naming the conflict in the prompt, is worth trying in Phase 2, and the recorded answers make the before and after measurable.
- **Rules from the hybrid.** I sent every field as is. Dropping style when there's a vibe, leaving out Dress and neckline, and treating "picked everything" as no preference were never tested with this option, so each would need its own run before Phase 2 adds it.
- **A guard against negations.** The model wrote none on dev's model, but one prompt line telling it to put avoidances in `exclude_tags` would protect against other models. That line belongs in #102's prompt.
- **Overlapping PRs.** #102 owns `expand_query.prompt` and the request shape, so this lands after it merges. #94 and #99 also edit the recommendation files, but this approach doesn't change `FindSimilar`, so #99's new `excludeProductIDs` parameter won't conflict.

---

## Sources

- [FashionCLIP model card](https://huggingface.co/patrickjohncyh/fashion-clip): the model `ml/embedder` serves
- `backend/cmd/tasks/seeds/products.sql`: the 60 products and their stored vectors
