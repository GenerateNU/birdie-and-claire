import type { StylePreferences } from "@/api/generated/types.gen";
import bootsImage from "@/design-system/assets/style-preferences/boots.png";
import chicAvantGardeImage from "@/design-system/assets/style-preferences/chic-avant-garde.jpg";
import colorfulEclecticImage from "@/design-system/assets/style-preferences/colorful-eclectic.jpg";
import comfortableRelaxedImage from "@/design-system/assets/style-preferences/comfortable-relaxed.jpg";
import flatsImage from "@/design-system/assets/style-preferences/flats.png";
import heelsImage from "@/design-system/assets/style-preferences/heels.png";
import highImage from "@/design-system/assets/style-preferences/high.png";
import lowImage from "@/design-system/assets/style-preferences/low.png";
import modestImage from "@/design-system/assets/style-preferences/modest.png";
import pantsImage from "@/design-system/assets/style-preferences/pants.png";
import sandalsImage from "@/design-system/assets/style-preferences/sandals.png";
import shortsImage from "@/design-system/assets/style-preferences/shorts.png";
import skirtImage from "@/design-system/assets/style-preferences/skirt.png";
import sneakersImage from "@/design-system/assets/style-preferences/sneakers.png";
import timelessSophisticatedImage from "@/design-system/assets/style-preferences/timeless-sophisticated.jpg";

/** A field the shopper answers by picking options. include_one_pieces is a yes or no instead. */
export type PreferenceField = Exclude<keyof StylePreferences, "include_one_pieces">;

/** Any option of any field. A field only offers its own, through `questions`. */
export type PreferenceValue = StylePreferences[PreferenceField][number];

type FitField = Exclude<PreferenceField, "style">;

export const noPreferences: StylePreferences = {
  style: [],
  neckline: [],
  bottoms: [],
  shoes: [],
  include_one_pieces: true,
};

export const includeOnePiecesLabel = "Include dresses and jumpsuits";

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
