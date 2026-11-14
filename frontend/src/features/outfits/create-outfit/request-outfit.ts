import { createOutfit, recommendProducts } from "@/api/generated/sdk.gen";
import type {
  RecommendationDetail,
  RecommendationSetting,
  RecommendationVibe,
  RecommendationWeather,
} from "@/api/generated/types.gen";

/** Recommends outfits for the answers and saves the first one.
 * Returns the new outfit's ID, or null when no outfit could be built. */
export async function requestOutfit(
  occasion: string,
  weather: RecommendationWeather | null,
  setting: RecommendationSetting | null,
  conditions: string | null,
  vibe: RecommendationVibe | null,
  custom: string,
  signal: AbortSignal,
): Promise<string | null> {
  const details: RecommendationDetail[] = [];

  if (weather !== null) {
    details.push({ key: "weather", value: weather });
  }

  if (setting !== null) {
    details.push({ key: "setting", value: setting });
  }

  if (conditions !== null) {
    details.push({ key: "conditions", value: conditions });
  }

  if (vibe !== null) {
    details.push({ key: "vibe", value: vibe });
  }

  // The endpoint rejects a blank custom value, and an empty field means the shopper skipped it.
  if (custom !== "") {
    details.push({ key: "custom", value: custom });
  }

  const { data: recommendation } = await recommendProducts({
    body: { occasion, details },
    signal,
    throwOnError: true,
  });

  // Empty only when no slot had a matching product.
  const firstOutfit = recommendation.outfits.at(0);

  if (firstOutfit === undefined) {
    return null;
  }

  const { data: outfit } = await createOutfit({
    body: {
      // The endpoint caps name at 100 characters.
      name: `${occasion} outfit`.slice(0, 100),
      // A slot the catalog couldn't fill is missing from the outfit.
      product_ids: [
        firstOutfit.top,
        firstOutfit.bottom,
        firstOutfit.accessory,
        firstOutfit.shoe,
      ].flatMap((product) => (product === undefined ? [] : [product.id])),
    },
    signal,
    throwOnError: true,
  });

  return outfit.id;
}
