import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { warmEmbedderMutation } from "@/api/generated/@tanstack/react-query.gen";
import { createOutfit, recommendProducts } from "@/api/generated/sdk.gen";
import {
  RecommendationVibe,
  RecommendationWeather,
  type RecommendationDetail,
} from "@/api/generated/types.gen";
import {
  Box,
  Button,
  Empty,
  ImageCard,
  ListCard,
  OptionCardGroup,
  Page,
  SearchField,
  Text,
  TextField,
  useToast,
} from "@/design-system";

export const Route = createFileRoute("/_signedIn/_onboarded/create-outfit")({
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

const weathers = Object.values(RecommendationWeather);

const vibes = Object.values(RecommendationVibe);

type SpecificsAnswer = "yes" | "no";

const specificsOptions: { label: string; value: SpecificsAnswer }[] = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

function CreateOutfit() {
  const [step, setStep] = useState<Step>("occasion");
  // Set by Review's Edit buttons, so Next on the edited step goes back to Review.
  const [returnToReview, setReturnToReview] = useState(false);
  const [cardOccasion, setCardOccasion] = useState<string | null>(null);
  const [customOccasion, setCustomOccasion] = useState("");
  const [weather, setWeather] = useState<RecommendationWeather | null>(null);
  const [vibe, setVibe] = useState<RecommendationVibe | null>(null);
  // Held only to drive the screen: picking B&C items to style is out of scope, so it is never sent.
  const [specificsAnswer, setSpecificsAnswer] = useState<SpecificsAnswer | null>(null);
  const [custom, setCustom] = useState("");

  const chosenOccasion = cardOccasion ?? customOccasion.trim();
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
          value={custom}
          onValueChange={setCustom}
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
        custom={custom.trim()}
        onEdit={editFromReview}
      />
    );
  }

  return (
    <Page className="flex flex-col items-center gap-lg">
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
    </Page>
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
    <Page className="flex flex-col items-center gap-lg">
      <Text variant="heading">Describe the occasion</Text>
      <StepBar current={step} />
      <Box className="w-full max-w-content-lg">{children}</Box>
      <Box className="mt-auto flex w-full max-w-content-lg justify-between">
        <Button label="Back" variant="secondary" onClick={onBack} />
        <Button label="Next" disabled={!canContinue} onClick={onNext} />
      </Box>
    </Page>
  );
}

type StepBarProps = {
  current: BarStep;
};

/** Display only: Back and Next are the way to move between steps. */
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
  weather: RecommendationWeather;
  vibe: RecommendationVibe;
  // Empty when the shopper skipped Custom.
  custom: string;
  onEdit: (step: Step) => void;
};

function Review({ occasion, weather, vibe, custom, onEdit }: ReviewProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const abortController = useRef(new AbortController());
  const { mutate: warmEmbedder } = useMutation(warmEmbedderMutation());

  const createMutation = useMutation({
    mutationFn: () =>
      requestOutfit(occasion, weather, vibe, custom, abortController.current.signal),
    onSuccess: async (outfitId) => {
      if (outfitId === null) {
        toast.show({
          message:
            "Couldn't build a full outfit for that, try changing the weather, vibe or custom details",
        });

        return;
      }

      await navigate({ to: "/outfits/$outfitId", params: { outfitId } });
    },
    onError: () => {
      if (abortController.current.signal.aborted) {
        return;
      }

      toast.show({ message: "Couldn't create the outfit", subtitle: "Try again in a moment." });
    },
  });

  // Stays on through the navigation to the new outfit.
  const creating =
    createMutation.isPending || (createMutation.isSuccess && createMutation.data !== null);

  useEffect(() => {
    // StrictMode mounts twice, and the first unmount aborts the controller, so make a fresh one.
    abortController.current = new AbortController();
    // Best effort: a cold embedder takes tens of seconds, so start it while the user reviews.
    warmEmbedder({});

    // Leaving the page cancels a pending create, so it can't navigate back to the new outfit.
    return () => abortController.current.abort();
  }, [warmEmbedder]);

  return (
    <Page className="flex flex-col items-center gap-lg">
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
          title="Custom"
          value={custom === "" ? "None" : custom}
          action={{
            label: "Edit",
            accessibleLabel: "Edit Custom",
            onClick: () => onEdit("custom"),
            disabled: creating,
          }}
        />
      </Box>
      <Button
        label="Create my outfit"
        loading={creating}
        loadingLabel="Styling your outfit…"
        onClick={() => createMutation.mutate()}
      />
    </Page>
  );
}

/** Recommends outfits for the answers and saves the first one.
 * Returns the new outfit's ID, or null when no outfit could be built. */
async function requestOutfit(
  occasion: string,
  weather: RecommendationWeather,
  vibe: RecommendationVibe,
  custom: string,
  signal: AbortSignal,
): Promise<string | null> {
  const details: RecommendationDetail[] = [
    { key: "weather", value: weather },
    { key: "vibe", value: vibe },
  ];

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
