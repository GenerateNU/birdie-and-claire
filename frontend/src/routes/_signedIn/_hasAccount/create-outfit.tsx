import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { apiFetch } from "@/api";
import {
  Box,
  Button,
  Empty,
  ImageCard,
  ListCard,
  OptionCardGroup,
  SearchField,
  Text,
  TextField,
  useToast,
} from "@/design-system";
import { vibes, weathers } from "@/occasionOptions";

export const Route = createFileRoute("/_signedIn/_hasAccount/create-outfit")({
  component: CreateOutfit,
});

type Step = "occasion" | "weather" | "vibe" | "specifics" | "custom" | "review";

const barSteps = ["weather", "vibe", "specifics", "custom"] as const;

type BarStep = (typeof barSteps)[number];

// Photos live in the public Supabase bucket the product images use, until occasions
// come from the backend. Travel reuses festive.png until it has a photo of its own.
const occasionImageBase =
  "https://zrjwxlrjnnohojbassya.supabase.co/storage/v1/object/public/image_data/occasions";

const occasions = [
  { name: "Workday", src: `${occasionImageBase}/workwear.png` },
  { name: "Night Out", src: `${occasionImageBase}/nightout.png` },
  { name: "Weekend", src: `${occasionImageBase}/casual.png` },
  { name: "Travel", src: `${occasionImageBase}/festive.png` },
];

type Weather = (typeof weathers)[number];

type Vibe = (typeof vibes)[number];

type SpecificsAnswer = "yes" | "no";

const specificsOptions: { label: string; value: SpecificsAnswer }[] = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

type RecommendationResponse = {
  outfits: {
    top: { id: string };
    bottom: { id: string };
    accessory: { id: string };
    shoe: { id: string };
  }[];
};

function CreateOutfit() {
  const [step, setStep] = useState<Step>("occasion");
  // Set by Review's Edit buttons, so Next on the edited step goes back to Review.
  const [returnToReview, setReturnToReview] = useState(false);
  const [cardOccasion, setCardOccasion] = useState<string | null>(null);
  const [customOccasion, setCustomOccasion] = useState("");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  // Held only to drive the screen: picking B&C items to style is out of scope, so it is never sent.
  const [specificsAnswer, setSpecificsAnswer] = useState<SpecificsAnswer | null>(null);
  const [customDetails, setCustomDetails] = useState("");

  const chosenOccasion = cardOccasion ?? customOccasion.trim();
  const otherDetails = customDetails.trim();
  const canContinue = chosenOccasion !== "";

  function selectCard(occasion: string, pressed: boolean) {
    setCardOccasion(pressed ? occasion : null);
  }

  function switchToCustomOccasion(text: string) {
    setCustomOccasion(text);
    setCardOccasion(null);
  }

  function advanceTo(next: Step) {
    if (returnToReview) {
      setReturnToReview(false);
      setStep("review");

      return;
    }

    setStep(next);
  }

  function editFromReview(target: Step) {
    setReturnToReview(true);
    setStep(target);
  }

  function continueFromOccasion() {
    if (!canContinue) {
      return;
    }

    advanceTo("weather");
  }

  if (step === "weather") {
    return (
      <StepScreen
        step="weather"
        canContinue={weather !== null}
        onBack={() => setStep("occasion")}
        onNext={() => advanceTo("vibe")}
      >
        <Box className="capitalize">
          <OptionCardGroup
            label="Weather"
            options={weathers.map((option) => ({ label: option, value: option }))}
            value={weather}
            onValueChange={setWeather}
          />
        </Box>
      </StepScreen>
    );
  }

  if (step === "vibe") {
    return (
      <StepScreen
        step="vibe"
        canContinue={vibe !== null}
        onBack={() => setStep("weather")}
        onNext={() => advanceTo("specifics")}
      >
        <Box className="capitalize">
          <OptionCardGroup
            label="Vibe"
            options={vibes.map((option) => ({ label: option, value: option }))}
            value={vibe}
            onValueChange={setVibe}
            className="grid grid-cols-2 gap-md md:grid-cols-5"
          />
        </Box>
      </StepScreen>
    );
  }

  if (step === "specifics") {
    return (
      <StepScreen
        step="specifics"
        canContinue={specificsAnswer !== null}
        onBack={() => setStep("vibe")}
        onNext={() => advanceTo("custom")}
      >
        <Box className="flex flex-col gap-lg">
          <OptionCardGroup
            label="Are there any Birdie & Claire items you would like to style?"
            options={specificsOptions}
            value={specificsAnswer}
            onValueChange={setSpecificsAnswer}
            className="grid grid-cols-1 gap-md"
          />
          {specificsAnswer === "yes" && (
            <Empty
              title="Coming soon"
              description="Styling your Birdie & Claire pieces is on its way. Tap Next to keep going."
            />
          )}
        </Box>
      </StepScreen>
    );
  }

  if (step === "custom") {
    return (
      <StepScreen
        step="custom"
        canContinue
        onBack={() => setStep("specifics")}
        onNext={() => advanceTo("review")}
      >
        <TextField
          multiline
          label="Enter any other details you would like considered."
          placeholder="i.e. Outfit for a chill night out with long sleeves and rainy weather"
          // The endpoint caps custom at 200 characters.
          maxLength={200}
          rows={4}
          value={customDetails}
          onValueChange={setCustomDetails}
        />
      </StepScreen>
    );
  }

  if (step === "review") {
    // Next on weather and vibe stays disabled until each is picked, so Review always has both.
    if (weather === null || vibe === null) {
      throw new Error("Reached Review before weather and vibe were picked");
    }

    return (
      <Review
        occasion={chosenOccasion}
        weather={weather}
        vibe={vibe}
        otherDetails={otherDetails}
        onEdit={editFromReview}
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
          />
        ))}
      </Box>
      <Text variant="caption">OR</Text>
      <SearchField
        label="Describe your own occasion"
        placeholder="Describe your own…"
        value={customOccasion}
        onValueChange={switchToCustomOccasion}
        onSubmit={continueFromOccasion}
        onClick={() => setCardOccasion(null)}
        // The endpoint caps occasion at 100 characters.
        maxLength={100}
        inactive={cardOccasion !== null}
        className="max-w-content-md"
      />
      <Button label="Continue" disabled={!canContinue} onClick={continueFromOccasion} />
    </Box>
  );
}

type StepScreenProps = {
  step: BarStep;
  canContinue: boolean;
  onBack: () => void;
  onNext: () => void;
  children: ReactNode;
};

function StepScreen({ step, canContinue, onBack, onNext, children }: StepScreenProps) {
  return (
    <Box className="flex min-h-screen flex-col items-center gap-lg p-xl">
      <Text variant="heading">Describe the occasion</Text>
      <StepBar current={step} />
      <Box className="w-full max-w-content-lg">{children}</Box>
      <Box className="mt-auto flex w-full max-w-content-lg justify-between">
        <Button label="Back" variant="secondary" onClick={onBack} />
        <Button label="Next" disabled={!canContinue} onClick={onNext} />
      </Box>
    </Box>
  );
}

type StepBarProps = {
  current: BarStep;
};

/** Shows where the shopper is in the flow. Display only: Back and Next are the way to move. */
function StepBar({ current }: StepBarProps) {
  return (
    <ol aria-label="Steps" className="flex rounded-full border">
      {barSteps.map((barStep) => (
        <li
          key={barStep}
          aria-current={barStep === current ? "step" : undefined}
          className={
            barStep === current
              ? "rounded-full bg-primary px-md py-xxs text-caption uppercase text-inverse"
              : "px-md py-xxs text-caption uppercase"
          }
        >
          {barStep}
        </li>
      ))}
    </ol>
  );
}

type ReviewProps = {
  occasion: string;
  weather: Weather;
  vibe: Vibe;
  // Empty when the shopper skipped Custom.
  otherDetails: string;
  onEdit: (step: Step) => void;
};

function Review({ occasion, weather, vibe, otherDetails, onEdit }: ReviewProps) {
  const toast = useToast();
  const navigate = useNavigate();
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

  async function createOutfit() {
    const { signal } = abortController.current;
    setCreating(true);

    try {
      const outfitId = await requestOutfit(occasion, weather, vibe, otherDetails, signal);

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
            onClick: () => onEdit("occasion"),
            disabled: creating,
          }}
        />
        {/* Only the weather and vibe values are lowercase list values; the occasion is the
            shopper's own text, so it is not capitalized. */}
        <Box className="capitalize">
          <ListCard
            title="Weather"
            value={weather}
            action={{
              label: "Edit",
              accessibleLabel: "Edit Weather",
              onClick: () => onEdit("weather"),
              disabled: creating,
            }}
          />
        </Box>
        <Box className="capitalize">
          <ListCard
            title="Vibe"
            value={vibe}
            action={{
              label: "Edit",
              accessibleLabel: "Edit Vibe",
              onClick: () => onEdit("vibe"),
              disabled: creating,
            }}
          />
        </Box>
        <ListCard
          title="Other details"
          value={otherDetails === "" ? "None" : otherDetails}
          action={{
            label: "Edit",
            accessibleLabel: "Edit Other details",
            onClick: () => onEdit("custom"),
            disabled: creating,
          }}
        />
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

/** Recommends outfits for the answers and saves the first one.
 * Returns the new outfit's ID, or null when no outfit could be built. */
async function requestOutfit(
  occasion: string,
  weather: Weather,
  vibe: Vibe,
  otherDetails: string,
  signal: AbortSignal,
): Promise<string | null> {
  const details: { key: string; value: string }[] = [
    { key: "weather", value: weather },
    { key: "vibe", value: vibe },
  ];

  // The endpoint rejects a blank custom value, and an empty field means the shopper skipped it.
  if (otherDetails !== "") {
    details.push({ key: "custom", value: otherDetails });
  }

  const recommendRes = await apiFetch("/api/v1/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ occasion, details }),
    signal,
  });

  if (!recommendRes.ok) {
    throw new Error(`Recommend failed: ${recommendRes.status} ${recommendRes.statusText}`);
  }

  // SAFETY: a 2xx from POST /api/v1/recommend is the RecommendationResponse schema in openapi.yaml.
  const recommendation = (await recommendRes.json()) as RecommendationResponse;

  // Empty when some slot had no matching product.
  const firstOutfit = recommendation.outfits.at(0);

  if (firstOutfit === undefined) {
    return null;
  }

  const outfitRes = await apiFetch("/api/v1/outfits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // The endpoint caps name at 100 characters.
    body: JSON.stringify({
      name: `${occasion} outfit`.slice(0, 100),
      product_ids: [
        firstOutfit.top.id,
        firstOutfit.bottom.id,
        firstOutfit.accessory.id,
        firstOutfit.shoe.id,
      ],
    }),
    signal,
  });

  if (!outfitRes.ok) {
    throw new Error(`Saving the outfit failed: ${outfitRes.status} ${outfitRes.statusText}`);
  }

  // SAFETY: a 2xx from POST /api/v1/outfits is the Outfit schema in openapi.yaml.
  const outfit = (await outfitRes.json()) as { id: string };

  return outfit.id;
}
