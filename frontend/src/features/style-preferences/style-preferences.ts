import type { StylePreferences } from "@/api/generated/types.gen";
import bootsImage from "@/design-system/assets/style-preferences/boots.jpg";
import chicAvantGardeImage from "@/design-system/assets/style-preferences/chic-avant-garde.jpg";
import colorfulEclecticImage from "@/design-system/assets/style-preferences/colorful-eclectic.jpg";
import comfortableRelaxedImage from "@/design-system/assets/style-preferences/comfortable-relaxed.jpg";
import dressImage from "@/design-system/assets/style-preferences/dress.jpg";
import flatsImage from "@/design-system/assets/style-preferences/flats.jpg";
import heelsImage from "@/design-system/assets/style-preferences/heels.jpg";
import highImage from "@/design-system/assets/style-preferences/high.jpg";
import lowImage from "@/design-system/assets/style-preferences/low.jpg";
import modestImage from "@/design-system/assets/style-preferences/modest.jpg";
import pantsImage from "@/design-system/assets/style-preferences/pants.jpg";
import sandalsImage from "@/design-system/assets/style-preferences/sandals.jpg";
import shortsImage from "@/design-system/assets/style-preferences/shorts.jpg";
import skirtImage from "@/design-system/assets/style-preferences/skirt.jpg";
import sneakersImage from "@/design-system/assets/style-preferences/sneakers.jpg";
import timelessSophisticatedImage from "@/design-system/assets/style-preferences/timeless-sophisticated.jpg";

export type PreferenceField = keyof StylePreferences;

/** Any option of any field. A field only offers its own, through `questions`. */
export type PreferenceValue = StylePreferences[PreferenceField][number];

type FitField = Exclude<PreferenceField, "style">;

export const noPreferences: StylePreferences = { style: [], neckline: [], bottoms: [], shoes: [] };

type Question = {
  readonly name: string;
  readonly prompt: string;
  readonly options: readonly {
    readonly value: PreferenceValue;
    readonly label: string;
    readonly image: string;
  }[];
};

export const questions: Readonly<Record<PreferenceField, Question>> = {
  style: {
    name: "Style",
    prompt: "What describes your style best?",
    options: [
      { value: "chic_avant_garde", image: chicAvantGardeImage, label: "Chic & avant-garde" },
      {
        value: "timeless_sophisticated",
        image: timelessSophisticatedImage,
        label: "Timeless & sophisticated",
      },
      { value: "colorful_eclectic", image: colorfulEclecticImage, label: "Colorful & eclectic" },
      {
        value: "comfortable_relaxed",
        image: comfortableRelaxedImage,
        label: "Comfortable & relaxed",
      },
    ],
  },
  neckline: {
    name: "Neckline",
    prompt: "What neckline do you prefer?",
    options: [
      { value: "modest", image: modestImage, label: "Modest" },
      { value: "high", image: highImage, label: "High" },
      { value: "low", image: lowImage, label: "Low" },
    ],
  },
  bottoms: {
    name: "Bottoms",
    prompt: "What bottoms do you prefer?",
    options: [
      { value: "pants", image: pantsImage, label: "Pants" },
      { value: "dress", image: dressImage, label: "Dress" },
      { value: "skirt", image: skirtImage, label: "Skirt" },
      { value: "shorts", image: shortsImage, label: "Shorts" },
    ],
  },
  shoes: {
    name: "Shoes",
    prompt: "What shoes do you prefer?",
    options: [
      { value: "sneakers", image: sneakersImage, label: "Sneakers" },
      { value: "boots", image: bootsImage, label: "Boots" },
      { value: "sandals", image: sandalsImage, label: "Sandals" },
      { value: "heels", image: heelsImage, label: "Heels" },
      { value: "flats", image: flatsImage, label: "Flats" },
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
