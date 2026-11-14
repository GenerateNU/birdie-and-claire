import {
  CloudIcon,
  SnowflakeIcon,
  SunIcon,
  ThermometerColdIcon,
  ThermometerIcon,
  type Icon,
} from "@phosphor-icons/react";

import {
  RecommendationCondition,
  RecommendationVibe,
  RecommendationWeather,
} from "@/api/generated/types.gen";
import casualOutingPhoto from "@/design-system/assets/occasions/casual-outing.png";
import nightOutPhoto from "@/design-system/assets/occasions/night-out.jpg";
import weddingPhoto from "@/design-system/assets/occasions/wedding.jpg";
import workDayPhoto from "@/design-system/assets/occasions/work-day.jpg";

export type Step =
  | "intro"
  | "occasion"
  | "questions-intro"
  | "weather"
  | "vibe"
  | "specifics"
  | "custom"
  | "review";

export const barSteps = [
  { step: "weather", label: "Weather" },
  { step: "vibe", label: "Vibe" },
  { step: "specifics", label: "Specific items" },
  { step: "custom", label: "Additional info" },
] as const;

export type BarStep = (typeof barSteps)[number]["step"];

export const occasions = [
  { name: "Work Day", src: workDayPhoto },
  { name: "Wedding", src: weddingPhoto },
  { name: "Casual Outing", src: casualOutingPhoto },
  { name: "Night Out", src: nightOutPhoto },
];

export type WeatherTile = "hot" | "warm" | "cool" | "cold" | "freezing";

export const weatherTiles: { value: WeatherTile; label: string; subtitle: string; icon: Icon }[] = [
  { value: "hot", label: "Hot", subtitle: "80° and up", icon: SunIcon },
  { value: "warm", label: "Warm", subtitle: "65° - 80°", icon: ThermometerIcon },
  { value: "cool", label: "Cool", subtitle: "50° - 65°", icon: CloudIcon },
  { value: "cold", label: "Cold", subtitle: "35° - 50°", icon: ThermometerColdIcon },
  { value: "freezing", label: "Freezing", subtitle: "Below 35°", icon: SnowflakeIcon },
];

// Cool and freezing send the API's nearest values, chilly and cold.
export const tileToApiWeather: Record<WeatherTile, RecommendationWeather> = {
  hot: RecommendationWeather.HOT,
  warm: RecommendationWeather.WARM,
  cool: RecommendationWeather.CHILLY,
  cold: RecommendationWeather.COLD,
  freezing: RecommendationWeather.COLD,
};

export const weatherConditions = [
  { label: "Humid", value: RecommendationCondition.HUMID },
  { label: "Rainy", value: RecommendationCondition.RAINY },
  { label: "Snowy", value: RecommendationCondition.SNOWY },
  { label: "Stormy", value: RecommendationCondition.STORMY },
  { label: "Windy", value: RecommendationCondition.WINDY },
];

export const vibes = Object.values(RecommendationVibe);

export type SpecificsAnswer = "yes" | "no";

export const specificsOptions: { label: string; value: SpecificsAnswer }[] = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];
