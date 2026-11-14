import { recommendProducts } from "@/api/generated/sdk.gen";
import type {
  RecommendationDetail,
  RecommendedOutfit,
  RecommendationSetting,
  RecommendationVibe,
  RecommendationWeather,
} from "@/api/generated/types.gen";

/** Recommends up to three outfits for the answers, best first. Empty when no slot had a match. */
export async function recommendOutfits(
  occasion: string,
  weather: RecommendationWeather | null,
  setting: RecommendationSetting | null,
  conditions: string | null,
  vibe: RecommendationVibe | null,
  custom: string,
  signal: AbortSignal,
): Promise<RecommendedOutfit[]> {
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

  return recommendation.outfits;
}
