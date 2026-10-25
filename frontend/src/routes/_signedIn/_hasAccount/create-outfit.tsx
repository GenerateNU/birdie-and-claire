import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { apiFetch } from "@/api";
import {
  Box,
  Button,
  ImageCard,
  ListCard,
  RadioGroup,
  SearchField,
  Text,
  useToast,
} from "@/design-system";

export const Route = createFileRoute("/_signedIn/_hasAccount/create-outfit")({
  component: CreateOutfit,
});

type Step = "occasion" | "review";

// Photos live in the public Supabase bucket the product images use, until occasions
// come from the backend.
const occasionImageBase =
  "https://zrjwxlrjnnohojbassya.supabase.co/storage/v1/object/public/image_data/occasions";

const occasions = [
  { name: "Work", src: `${occasionImageBase}/workwear.png` },
  { name: "Night out", src: `${occasionImageBase}/nightout.png` },
  { name: "Casual", src: `${occasionImageBase}/casual.png` },
  { name: "Festive", src: `${occasionImageBase}/festive.png` },
];

const weathers = ["Sunny", "Rainy", "Cold"] as const;

type Weather = (typeof weathers)[number];

const vibes = ["Professional", "Relaxed", "Bold"] as const;

type Vibe = (typeof vibes)[number];

type RecommendationResponse = {
  top: { id: string }[];
  bottom: { id: string }[];
  accessory: { id: string }[];
};

function CreateOutfit() {
  const [step, setStep] = useState<Step>("occasion");
  const [cardOccasion, setCardOccasion] = useState<string | null>(null);
  const [customOccasion, setCustomOccasion] = useState("");
  const [weather, setWeather] = useState<Weather>("Sunny");
  const [vibe, setVibe] = useState<Vibe>("Professional");

  const chosenOccasion = cardOccasion ?? customOccasion.trim();
  const canContinue = chosenOccasion !== "";

  function selectCard(occasion: string, pressed: boolean) {
    setCardOccasion(pressed ? occasion : null);
  }

  function switchToCustomOccasion(text: string) {
    setCustomOccasion(text);
    setCardOccasion(null);
  }

  function continueToReview() {
    if (!canContinue) {
      return;
    }

    setStep("review");
  }

  if (step === "review") {
    return (
      <Review
        occasion={chosenOccasion}
        weather={weather}
        vibe={vibe}
        onEditOccasion={() => setStep("occasion")}
        onWeatherChange={setWeather}
        onVibeChange={setVibe}
      />
    );
  }

  return (
    <Box className="flex min-h-screen flex-col items-center gap-lg p-xl">
      <Text variant="heading">What's the occasion?</Text>
      <Box className="grid w-full max-w-content-xl grid-cols-2 gap-md md:grid-cols-4">
        {occasions.map(({ name, src }) => (
          <ImageCard
            key={name}
            label={name}
            src={src}
            pressed={cardOccasion === name}
            onPressedChange={(pressed) => selectCard(name, pressed)}
            showCheckbox={false}
          />
        ))}
      </Box>
      <Text variant="caption">OR</Text>
      <SearchField
        label="Describe your own occasion"
        placeholder="Describe your own…"
        value={customOccasion}
        onValueChange={switchToCustomOccasion}
        onSubmit={continueToReview}
        onClick={() => setCardOccasion(null)}
        inactive={cardOccasion !== null}
        className="max-w-content-md"
      />
      <Button label="Continue" disabled={!canContinue} onClick={continueToReview} />
    </Box>
  );
}

type ReviewProps = {
  occasion: string;
  weather: Weather;
  vibe: Vibe;
  onEditOccasion: () => void;
  onWeatherChange: (weather: Weather) => void;
  onVibeChange: (vibe: Vibe) => void;
};

function Review({
  occasion,
  weather,
  vibe,
  onEditOccasion,
  onWeatherChange,
  onVibeChange,
}: ReviewProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<"weather" | "vibe" | null>(null);
  const [creating, setCreating] = useState(false);
  const abortController = useRef(new AbortController());

  useEffect(() => {
    // StrictMode mounts twice, and the first unmount aborts the controller, so make a fresh one.
    abortController.current = new AbortController();
    // Best effort: a cold embedder takes tens of seconds, so start it while the user reviews.
    apiFetch("/api/v1/embedder/warm", { method: "POST" }).catch(() => {});

    // Leaving the page cancels a pending create, so it can't navigate back to the new outfit.
    return () => abortController.current.abort();
  }, []);

  function toggleEditing(field: "weather" | "vibe") {
    setEditing(editing === field ? null : field);
  }

  async function createOutfit() {
    const { signal } = abortController.current;
    setCreating(true);
    setEditing(null);

    try {
      const outfitId = await requestOutfit(occasion, weather, vibe, signal);

      if (outfitId === null) {
        toast.show({ message: "No matching pieces, try another occasion" });
        setCreating(false);

        return;
      }

      await navigate({ to: "/outfits/$outfitId", params: { outfitId } });
    } catch (err) {
      if (signal.aborted) {
        return;
      }

      toast.show({
        message: "Couldn't create the outfit",
        subtitle: err instanceof Error ? err.message : String(err),
      });
      setCreating(false);
    }
  }

  return (
    <Box className="flex min-h-screen flex-col items-center gap-lg p-xl">
      <Text variant="heading">Let's review</Text>
      <Box className="flex w-full max-w-content-md flex-col gap-xs">
        <ListCard
          title="Occasion"
          value={occasion}
          action={{
            label: "Edit",
            accessibleLabel: "Edit Occasion",
            onClick: onEditOccasion,
            disabled: creating,
          }}
        />
        <ListCard
          title="Weather"
          value={weather}
          action={{
            label: "Edit",
            accessibleLabel: "Edit Weather",
            onClick: () => toggleEditing("weather"),
            disabled: creating,
          }}
        />
        {editing === "weather" && (
          <RadioGroup
            label="Weather"
            options={weathers.map((option) => ({ label: option, value: option }))}
            value={weather}
            onValueChange={(value) => {
              onWeatherChange(value);
              setEditing(null);
            }}
            className="px-md"
          />
        )}
        <ListCard
          title="Vibe"
          value={vibe}
          action={{
            label: "Edit",
            accessibleLabel: "Edit Vibe",
            onClick: () => toggleEditing("vibe"),
            disabled: creating,
          }}
        />
        {editing === "vibe" && (
          <RadioGroup
            label="Vibe"
            options={vibes.map((option) => ({ label: option, value: option }))}
            value={vibe}
            onValueChange={(value) => {
              onVibeChange(value);
              setEditing(null);
            }}
            className="px-md"
          />
        )}
        {/* Hardcoded stand-in, with no Edit, until the endpoint can limit how many pieces it picks. */}
        <ListCard title="Items to include" value="2" />
      </Box>
      <Button
        label="Create my outfit"
        loading={creating}
        loadingLabel="Styling your outfit…"
        onClick={() => void createOutfit()}
      />
    </Box>
  );
}

/** Recommends products for the review answers and saves the top pick of each slot as an outfit.
 * Returns the new outfit's ID, or null when no slot found a product. */
async function requestOutfit(
  occasion: string,
  weather: Weather,
  vibe: Vibe,
  signal: AbortSignal,
): Promise<string | null> {
  // The endpoint caps query at 200 characters, and a custom occasion is free text.
  const query = `${occasion}, ${weather.toLowerCase()} weather, ${vibe.toLowerCase()} vibe`.slice(
    0,
    200,
  );

  const recommendRes = await apiFetch("/api/v1/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  });

  if (!recommendRes.ok) {
    throw new Error(`Recommend failed: ${recommendRes.status} ${recommendRes.statusText}`);
  }

  // SAFETY: a 2xx from POST /api/v1/recommend is the RecommendationResponse schema in openapi.yaml.
  const recommendation = (await recommendRes.json()) as RecommendationResponse;

  // The top pick of each slot; a slot the query didn't ask for comes back empty.
  const productIds = [recommendation.top, recommendation.bottom, recommendation.accessory].flatMap(
    (products) => products.slice(0, 1).map((product) => product.id),
  );

  // POST /outfits requires at least one product.
  if (productIds.length === 0) {
    return null;
  }

  const outfitRes = await apiFetch("/api/v1/outfits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // The endpoint caps name at 100 characters.
    body: JSON.stringify({ name: `${occasion} outfit`.slice(0, 100), product_ids: productIds }),
    signal,
  });

  if (!outfitRes.ok) {
    throw new Error(`Saving the outfit failed: ${outfitRes.status} ${outfitRes.statusText}`);
  }

  // SAFETY: a 2xx from POST /api/v1/outfits is the Outfit schema in openapi.yaml.
  const outfit = (await outfitRes.json()) as { id: string };

  return outfit.id;
}
