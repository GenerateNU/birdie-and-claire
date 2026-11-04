import type { StylePreferences } from "@/api/generated/types.gen";

export type PreferenceField = keyof StylePreferences;

/** Any option of any field. A field only offers its own, through `questions`. */
export type PreferenceValue = StylePreferences[PreferenceField][number];

type FitField = Exclude<PreferenceField, "style">;

export const noPreferences: StylePreferences = { style: [], neckline: [], bottoms: [], shoes: [] };

type Question = {
  readonly name: string;
  readonly prompt: string;
  readonly options: readonly { readonly value: PreferenceValue; readonly label: string }[];
};

export const questions: Readonly<Record<PreferenceField, Question>> = {
  style: {
    name: "Style",
    prompt: "What describes your style best?",
    options: [
      { value: "chic_avant_garde", label: "Chic & avant-garde" },
      { value: "timeless_sophisticated", label: "Timeless & sophisticated" },
      { value: "colorful_eclectic", label: "Colorful & eclectic" },
      { value: "comfortable_relaxed", label: "Comfortable & relaxed" },
    ],
  },
  neckline: {
    name: "Neckline",
    prompt: "What neckline do you prefer?",
    options: [
      { value: "modest", label: "Modest" },
      { value: "high", label: "High" },
      { value: "low", label: "Low" },
    ],
  },
  bottoms: {
    name: "Bottoms",
    prompt: "What bottoms do you prefer?",
    options: [
      { value: "pants", label: "Pants" },
      { value: "dress", label: "Dress" },
      { value: "skirt", label: "Skirt" },
      { value: "shorts", label: "Shorts" },
    ],
  },
  shoes: {
    name: "Shoes",
    prompt: "What shoes do you prefer?",
    options: [
      { value: "sneakers", label: "Sneakers" },
      { value: "boots", label: "Boots" },
      { value: "sandals", label: "Sandals" },
      { value: "heels", label: "Heels" },
      { value: "flats", label: "Flats" },
    ],
  },
};

export const fitFields: readonly FitField[] = ["neckline", "bottoms", "shoes"];

export function togglePreference(
  preferences: StylePreferences,
  field: PreferenceField,
  value: PreferenceValue,
  pressed: boolean,
): StylePreferences {
  return {
    ...preferences,
    [field]: pressed
      ? [...preferences[field], value]
      : preferences[field].filter((picked) => picked !== value),
  };
}
