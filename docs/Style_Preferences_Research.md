# Style Preferences in Recommendations: Design Doc (#108)

Shoppers pick style preferences during onboarding (#96) and can change them in settings (#100), but the recommender (#102) doesn't use them yet. This doc looks at four ways to use them, tests each one against the 60 demo products, and recommends one. The tests used 3 runs per prompt on dev's free model, so read the numbers as a direction rather than proof.

Throughout, "today" means #102's branch at commit `d225350`, since that's the recommender this work builds on. Main still sends the model a single free-text query.

---

## Recommendation

Send the shopper's saved shoes and bottoms picks to the LLM along with their other answers, and leave everything else alone.

In practice that's one new key in the `expand_answers` input, `saved preferences`, holding those picks the way onboarding labels them, and one new line in the prompt that only appears when the key is sent. The line tells the model that the occasion comes first, that each preference only applies to its own slot and only when it suits the occasion, and that preferences never add exclusions. The model then works the picks into its search phrases, and the existing search does the rest. `FindSimilar`, the embedder calls and the ranking don't change.

Style, neckline and the Dress pick aren't sent. In testing, sending them made outfits fit the occasion worse and added nothing measurable, so for now only two of the four onboarding questions change recommendations.

This option did best in testing. Its outfits fit the occasion exactly as well as today's in total, and every run landed inside today's range. It matched the shopper's shoe and bottom picks more often than today in every run, never returned an empty outfit, and showed the fewest men's products of any option. Its weak spot is that "the occasion comes first" is only an instruction to the model. Nothing in the code enforces it.

---

## What the search can match

Before comparing options, I checked what the product embeddings can actually pick up. I embedded each preference word with FashionCLIP, the same model `ml/embedder` serves, and compared it with the stored vectors of the 60 products in `backend/cmd/tasks/seeds/products.sql`.

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

I also tried adding "no" to a phrase, and it did the opposite of what you'd expect. These were phrases I wrote myself, not ones the model produced. "comfortable shoes" ranked the heels 8th of 15, and "comfortable shoes, no heels" ranked them 4th. FashionCLIP doesn't understand "no". It just sees a phrase about heels. In practice the model never put a negation in a phrase, and #102 now tells it to put anything the shopper rules out in `exclude_tags` instead.

For a sense of scale, on a few typical search phrases I wrote, like "linen midi skirt" and "tan sandals", the gap between the first and third product in a slot was 0.019 to 0.168. A matching nice tag is worth 0.02. The score gaps between matching and non-matching products for the specific-item words, 0.046 to 0.158, are big enough to reorder products that fit the occasion about equally well. They can't beat a clearly better match unless they're weighted heavily.

---

## The four options

**1. All preferences to the LLM.** Every saved field goes into the `expand_answers` input under `saved preferences`, with a prompt line saying the occasion comes first. The ranking code stays the same.

**2. A nudge for every field.** The model's prompt stays the same. Instead, each preference word moves similar products up in its slot's ranking: style in every slot, neckline on tops, bottoms (including Dress) on bottoms, and shoes on shoes. A weight sets how strong the nudge is.

**3. The hybrid.** Style goes to the LLM under `saved style`, but only when the request has no vibe answer. Bottoms and shoes get the nudge from option 2 in their own slot. Neckline and Dress do nothing.

**4. Shoes and bottoms to the LLM (recommended).** Like option 1, but only the shoes and bottoms picks are sent, Dress is left out, and the prompt line is firmer: the occasion comes first, each preference applies only to its own slot, and preferences never add exclusions. I added this option after option 1 failed, to test whether the failures came from style and from preference-driven exclusions.

The issue suggested reranking a larger pool of candidates for the nudge options. That isn't needed. `FindSimilar` has no vector index, so it already scores every product in the slot, and the nudge is just one more term in that score.

I also looked at three other ideas. Mapping picks onto tags or product types to reuse the nice-tag bonus doesn't work, because no tag says heels or skirt. `product_type` does, but it's free text from the source catalog, and two of the products typed `Heels` are flats. Shifting the search phrase's vector toward the preference word turns out to rank products exactly the same way as the nudge, so it's the same option. Finally, neckline would need neckline tags on products, drafted by an LLM and checked by a person like the #91 basics tags. That's catalog work outside this ticket.

---

## Results

I measured five things, each averaged over 3 runs. Occasion fit counts the top-3 products in each slot that fit the occasion, across all 4 slots of all 20 pairs, so 240 in total. Full outfits counts how many of the 3 outfits per pair #102 actually returns, which drops when a slot comes back with fewer than 3 products, so 60 in total. Preference match counts the top-3 products that match the shopper's pick, only on the 8 pairs where the pick should move up (9 slots, so 27 in total). Conflict picks counts how often the clashing pick reached the top 3 on the 3 conflict pairs, where it should stay out. Men's products counts men's items in the top 3 across all slots, out of 240. The shopper is a woman, so fewer is better there.

| Option | Occasion fit (of 240) | Full outfits (of 60) | Preference match (of 27) | Conflict picks | Men's products (of 240) |
|---|---|---|---|---|---|
| Today (no preferences) | 126.3 | 60 | 13.3 | 0 | 75.0 |
| 1. All preferences to the LLM | 115.3 | 59 | 18.3 | 1.3 | 72.3 |
| 2. A nudge for every field (weight 0) | 126.3 | 60 | 13.3 | 0 | 75.0 |
| 3. The hybrid (weight 0) | 123.3 | 60 | 11.7 | 0 | 72.3 |
| 4. Shoes and bottoms to the LLM | 126.3 | 60 | 19.3 | 0.3 | 70.0 |

Option 4 held up in every run. Its occasion fit was 125, 126 and 128, inside today's range of 119 to 130. Its preference match was 21, 19 and 18, against 13 or 14 today, and its men's products were 68 to 73, against 72 to 77. Pair by pair, occasion fit dipped a little on 5 pairs (3, 5, 10, 14 and 20), rose on 3 (4, 6 and 19) and stayed level on the rest. The biggest dip was pair 20, a brunch with skirt and flats saved, from 9 to 7. Its one conflict pick came from pair 19: for a shopper who typed "no heels" and saved heels, the model excluded heels and asked for flats every time, but in one run the wedge sandal still made the top three, because nothing tags it as a heel.

Option 1 lost occasion fit, and two of its three runs scored below today's worst run. Most of the loss was in shoes and tops. For a wedding guest who saved heels, the model asked for an "elegant knee-length dress" in both the top and the bottom slot. For "Chic & avant-garde" it wrote phrases like "chic avant-garde blouse", which match nothing well. It also showed what preference-driven exclusions can do. For a funeral with sandals saved, one run excluded ten things, including "casual" and "leather", which removed every shoe, so that shopper got no outfits at all. For pair 2, a wedding guest who saved sneakers, men's sneakers reached the top three in two of three runs.

Options 2 and 3 can't use their nudge. Under the weight rule, the first weight above 0 already costs occasion fit on pair 5, so both stay at weight 0. That leaves option 2 identical to today, and option 3 as today plus saved style in the prompt.

Sending style never made outfits fit the occasion better. On the four style pairs, occasion fit per run was 6, 7 and 6 today against 5, 4 and 8 for the hybrid on pair 15. It was 7, 7 and 7 against 7, 6 and 5 on pair 16, 2, 3 and 5 against 3, 3 and 2 on pair 17, and 8, 10 and 9 against 8, 9 and 8 on pair 20. Option 1's numbers on the same pairs were similar. The runs overlap too much to call it a clear loss, but style added nothing that would justify the odd phrases it caused.

---

## How it works

Today the model gets the shopper's answers as one small JSON object. For a brunch, that's:

```json
{"occasion":"Brunch"}
```

With saved preferences, the model gets one more key listing the shopper's shoes and bottoms picks the way onboarding labels them. Pair 20's shopper also saved Chic & avant-garde, but style isn't sent, so the model gets:

```json
{"occasion":"Brunch","saved preferences":"bottoms: Skirt; shoes: Flats"}
```

The prompt also gets one more line, right after "When weather or vibe is missing, infer it from the occasion.":

> The object may also have saved preferences, the shoes and bottoms the shopper usually likes. The occasion always comes first: use a saved preference only in its own slot and only when it suits the occasion, and otherwise ignore it. Saved preferences never add exclude_tags.

Nothing after that changes. The model writes its search phrases, and `FindSimilar` finds products for them the same way it does today.

The recommendation service already builds the answers map that `ExpandAnswers` encodes. It would also read the shopper's `style_preferences`, add the key from their shoes picks and their bottoms picks other than Dress, and tell `ExpandAnswers` whether it added one. `ExpandAnswers` passes that flag to the template next to the encoded answers, because the template can't see inside them, and the line renders only when the flag is set. Since one check in the service decides both the key and the flag, they can't disagree. Every pick in the two fields goes in as it is, including when a shopper picked all of them. A shopper with no shoes or bottoms picks, including one whose `style_preferences` is still NULL because onboarding isn't finished, gets no key and no extra line.

The labels ("Skirt", "Flats") exist today only in onboarding's frontend code, and Go stores the values (`skirt`, `flats`). Phase 2 needs a Go copy of the 8 labels next to `StylePreferences`, with a test that fails when the two lists differ. #102's `TestOccasionOptionsMatchTheBackend` does the same for the weather and vibe lists. The key and the line live in #102's `expand_answers.prompt`, so this ships after #102 merges.

---

## Questions and answers

### Is a preference a soft ranking signal or a hard filter?

Soft. A preference only shapes the search phrases the model writes, and the prompt line tells the model never to add exclusions because of one. The model's `exclude_tags` still filter products the way they do today. Hard filters would empty slots, because the catalog has no boots and no dresses, and #102 returns only as many outfits as its shortest slot has products. Option 1 showed how that goes wrong: one preference-driven exclusion list removed every shoe and left the shopper with no outfits.

### When an occasion and a preference conflict, which wins?

The occasion, because the prompt says so. That's an instruction, not a rule the code enforces. In testing it held: on the three conflict pairs, the clashing pick reached the top three once in nine runs, and that was the untagged wedge sandal. When this request's answers clash with a saved preference, the request's answers reach the model alongside it. #102's prompt already sends anything the shopper rules out, like "no heels", to `exclude_tags`. Saved style isn't sent, so a vibe answer never competes with it.

### What happens to users with no preferences?

They get the same results they get today. Without shoes or bottoms picks, the prompt is byte for byte what it is today, since the key and the line only appear when there are picks, and `FindSimilar` doesn't change. A NULL `style_preferences` counts the same as empty lists. Phase 2 tests check that the rendered prompt is identical for these users.

### What does the approach add to latency and cost?

A little. On dev's model, requests with saved picks used about 65 more input tokens (508 instead of 443) and slightly fewer output tokens (69 against 73). There's no extra LLM call and no extra embedder call. The median latency was 880 ms against 752 ms today, with middle halves of 804 to 1,248 ms and 669 to 847 ms. The ranges overlap, but every prompt with preferences ran slower, so about 130 ms is probably real. Dev's model is free, so the cost there is $0. On a paid model it's the price of about 65 input tokens per request. The only other addition is one read of `users.style_preferences` by primary key per request.

---

## How I evaluated

I used the 60 seeded products as they are, and that catalog is thin. It has no boots, no dresses, one pair of heels, one wedge sandal and 27 men's products. The shopper is a middle-aged woman, since that's who B&C sells to, so men's and girls' products never count as fitting. That leaves at most 7 tops, 5 bottoms, 12 accessories and 6 shoes that ever can.

The 20 test pairs below share 9 requests, each an occasion plus any details: Wedding guest, Workday, Beach day, Brunch, Party, Date night, Funeral, "Date night, vibe: casual" and "Workday, custom: no heels". For each request, I marked which products in each slot fit, on a local page that shows the product photos. Every request started from pre-filled guesses that I checked and corrected. Every formal shoe and every sneaker in the catalog is men's, so none of them fit in pair 2. Whether a product matches a pick isn't hand-labeled. It's read from the title and product type, and the fixture stores the result.

Each pair is compared with its request run with no preferences, which is today's behavior. Occasion fit and men's products should be read together. #102's prompt doesn't say the shopper is a woman, so today's results often include men's products. An option that only pulls women's products up would look like it improved occasion fit without actually suiting the occasion any better.

For the two nudge options, I picked the weight with one rule. I tried weights from 0 to 3 and kept only those where no pair lost occasion fit, comparing each weight with the same option at weight 0. Among those, I'd take the smallest weight that reached the best preference match. For both options, only weight 0 passed.

For style, I checked whether the search phrases reflect the style, how many top-3 products change compared with no saved style, whether occasion fit holds, and how many men's products show up.

The search phrases came from dev's `AI_MODEL`, which was `nvidia/nemotron-3.5-super-vl:free` through OpenRouter, using the exact request #102's code sends at `d225350`, with 3 runs per distinct prompt. The 20 pairs need 47 distinct prompts: 9 for today, 20 for option 1, 4 for the hybrid's style pairs (15, 16, 17 and 20) and 14 for option 4. Option 2 reuses today's phrases, pair 18 has a vibe so the hybrid sends today's prompt for it, and the 6 pairs without shoes or bottoms picks send today's prompt under option 4. That came to 141 calls. None failed, and none would have been rejected by #102's limits on tag counts and phrase length. An earlier round of 101 calls ran against #102's previous prompt, before it changed. Its results aren't reported here.

Everything Phase 2 needs is saved in `backend/internal/tests/testdata/style_preferences_eval.json`. Each request has its occasion and details, the products I marked as fitting, and 3 recorded answers without preferences. Each pair has its saved preferences, what it expects (the pick moves up, the pick stays out, or occasion fit holds), the products that match its pick, and 3 recorded answers from option 4's prompt. Phase 2 tests can replay these answers without calling the LLM. The phrases still have to become vectors through FashionCLIP before `FindSimilar` can use them.

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

These showed up in the runs with no preferences, so they affect every shopper on #102's branch.

Most of the model's tags don't match anything in the catalog. In those runs, only 29 of the 102 nice tags it wrote equal a real catalog tag, and 7 of the 18 exclude tags do. The model writes words like "comfortable", "professional", "elegant" and "workwear", which aren't tags at all.

That includes #102's own fix for "no heels". The model now puts `heels` in `exclude_tags` every time, but no product in the catalog carries a `heels` tag, so the exclusion removes nothing. What kept heels out of pair 19 was the phrase "comfortable flats", not the exclusion.

---

## Later

- A slot that can hold a dress.
- Neckline tags on products, so neckline can count for something.
- Style, once the real catalog is in and it can be tested without the gender pull of the demo products.
- The demo catalog's 27 men's products, which B&C doesn't sell.
- The #91 basics, which add jeans, trousers, boots, sandals and pumps.
- Rerunning this evaluation on B&C's real catalog, with more runs per prompt.

---

## Open questions

- **Enforcing the occasion.** "The occasion comes first" is only a prompt instruction. Phase 2 has no code that stops a preference from beating the occasion, so its tests are the only check.
- **Replaying the recorded answers.** A replay test still has to turn the recorded phrases into vectors before `FindSimilar` can rank anything. It either calls the embedder or stores the vectors, and the fixture doesn't decide which.
- **Untagged products.** Nothing tags the wedge sandal as a heel or anything as `heels`, so "no heels" exclusions and heel matching both depend on titles.
- **Only half the questions count.** Style, neckline and Dress do nothing for now. Whoever owns onboarding should know that two of its four questions don't change recommendations yet.
- **Overlapping PRs.** #102 owns `expand_answers.prompt` and the request shape, so this lands after it merges. #99, the PR for #94, also edits the recommendation files, but this approach doesn't change `FindSimilar`, so #99's new `excludeProductIDs` parameter won't conflict.

---

## Sources

- [FashionCLIP model card](https://huggingface.co/patrickjohncyh/fashion-clip): the model `ml/embedder` serves
- `backend/cmd/tasks/seeds/products.sql`: the 60 products and their stored vectors
