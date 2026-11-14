import { useState } from "react";

import {
  RecommendationSetting,
  type RecommendationCondition,
  type RecommendationVibe,
} from "@/api/generated/types.gen";
import {
  AddTile,
  Box,
  Button,
  Chip,
  ChoiceGroup,
  EmptyState,
  ImageOptionCard,
  Modal,
  OptionTileGroup,
  Page,
  SegmentedControl,
  Text,
  TextArea,
} from "@/design-system";
import {
  occasions,
  specificsOptions,
  tileToApiWeather,
  vibes,
  weatherConditions,
  weatherTiles,
  type SpecificsAnswer,
  type Step,
  type WeatherTile,
} from "@/features/outfits/create-outfit/create-outfit-options";
import { Intro } from "@/features/outfits/create-outfit/intro";
import { QuestionsIntro } from "@/features/outfits/create-outfit/questions-intro";
import { Review } from "@/features/outfits/create-outfit/review";
import { StepScreen } from "@/features/outfits/create-outfit/step-screen";

export function CreateOutfitFlow() {
  const [step, setStep] = useState<Step>("intro");
  // Set by Review's Edit buttons, so Next or Back on the edited step goes back to Review.
  const [returnToReview, setReturnToReview] = useState(false);
  const [cardOccasion, setCardOccasion] = useState<string | null>(null);
  const [customOccasion, setCustomOccasion] = useState("");
  const [customOccasionOpen, setCustomOccasionOpen] = useState(false);
  const [customOccasionDraft, setCustomOccasionDraft] = useState("");
  const [weatherTile, setWeatherTile] = useState<WeatherTile | null>(null);
  const [setting, setSetting] = useState<RecommendationSetting>(RecommendationSetting.OUTDOORS);
  // A detail's value is one string, so the chips go out as one comma-separated conditions detail.
  const [conditions, setConditions] = useState<RecommendationCondition[]>([]);
  const [vibe, setVibe] = useState<RecommendationVibe | null>(null);
  // Held only to drive the screen: picking B&C items to style is out of scope, so it is never sent.
  const [specificsAnswer, setSpecificsAnswer] = useState<SpecificsAnswer | null>(null);
  const [custom, setCustom] = useState("");

  const chosenOccasion = cardOccasion ?? customOccasion.trim();
  const weather = weatherTile === null ? null : tileToApiWeather[weatherTile];
  // Outdoors is preselected, so the setting counts as answered only once a weather tile is picked.
  const answeredSetting = weatherTile === null ? null : setting;

  const answeredConditions =
    weatherTile === null || conditions.length === 0 ? null : conditions.join(",");

  const weatherLabel = weatherTiles.find((tile) => tile.value === weatherTile)?.label ?? "None";
  const canContinue = chosenOccasion !== "";

  function selectCard(occasion: string, pressed: boolean) {
    setCardOccasion(pressed ? occasion : null);

    if (pressed) {
      setCustomOccasion("");
    }
  }

  function openCustomOccasion() {
    setCustomOccasionDraft(customOccasion);
    setCustomOccasionOpen(true);
  }

  function confirmCustomOccasion() {
    setCustomOccasion(customOccasionDraft.trim());
    setCardOccasion(null);
    setCustomOccasionOpen(false);
    advanceTo("questions-intro");
  }

  function advanceTo(next: Step) {
    if (returnToReview) {
      setReturnToReview(false);
      setStep("review");

      return;
    }

    setStep(next);
  }

  function goBackTo(previous: Step) {
    setReturnToReview(false);
    setStep(returnToReview ? "review" : previous);
  }

  function editFromReview(target: Step) {
    setReturnToReview(true);
    setStep(target);
  }

  function continueFromOccasion() {
    if (!canContinue) {
      return;
    }

    advanceTo("questions-intro");
  }

  if (step === "intro") {
    return <Intro onStart={() => setStep("occasion")} />;
  }

  if (step === "questions-intro") {
    return (
      <QuestionsIntro
        onStart={() => setStep("weather")}
        onSkip={() => setStep("review")}
        onBack={() => goBackTo("occasion")}
      />
    );
  }

  if (step === "weather") {
    return (
      <StepScreen
        step="weather"
        title="What’s the weather looking like?"
        canContinue={weatherTile !== null}
        onBack={() => goBackTo("questions-intro")}
        onNext={() => advanceTo("vibe")}
      >
        <Box className="flex flex-col items-center gap-lg">
          <SegmentedControl
            label="Setting"
            options={[
              { label: "Outdoors", value: RecommendationSetting.OUTDOORS },
              { label: "Indoors", value: RecommendationSetting.INDOORS },
            ]}
            value={setting}
            onValueChange={setSetting}
          />
          <OptionTileGroup
            options={weatherTiles}
            value={weatherTile}
            onValueChange={setWeatherTile}
          />
          <Text variant="body-l">Anything else?</Text>
          <Box className="flex flex-wrap justify-center gap-xs">
            {weatherConditions.map(({ label, value }) => (
              <Chip
                key={value}
                label={label}
                selected={conditions.includes(value)}
                onSelectedChange={(selected) =>
                  setConditions(
                    selected
                      ? [...conditions, value]
                      : conditions.filter((picked) => picked !== value),
                  )
                }
              />
            ))}
          </Box>
        </Box>
      </StepScreen>
    );
  }

  if (step === "vibe") {
    return (
      <StepScreen
        step="vibe"
        title="Describe the occasion"
        canContinue={vibe !== null}
        onBack={() => goBackTo("weather")}
        onNext={() => advanceTo("specifics")}
      >
        <Box className="capitalize">
          <OptionTileGroup
            label="Vibe"
            options={vibes.map((option) => ({ label: option, value: option }))}
            value={vibe}
            onValueChange={setVibe}
          />
        </Box>
      </StepScreen>
    );
  }

  if (step === "specifics") {
    return (
      <StepScreen
        step="specifics"
        title="Describe the occasion"
        canContinue={specificsAnswer !== null}
        onBack={() => goBackTo("vibe")}
        onNext={() => advanceTo("custom")}
      >
        <Box className="flex flex-col gap-lg">
          <ChoiceGroup
            label="Are there any Birdie & Claire items you would like to style?"
            options={specificsOptions}
            value={specificsAnswer}
            onValueChange={setSpecificsAnswer}
          />
          {specificsAnswer === "yes" && (
            <EmptyState
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
        title="Describe the occasion"
        canContinue
        onBack={() => goBackTo("specifics")}
        onNext={() => advanceTo("review")}
      >
        <TextArea
          label="Enter any other details you would like considered."
          placeholder="i.e. Outfit for a chill night out with long sleeves and rainy weather"
          // The endpoint caps custom at 200 characters.
          maxLength={200}
          value={custom}
          onValueChange={setCustom}
        />
      </StepScreen>
    );
  }

  if (step === "review") {
    return (
      <Review
        occasion={chosenOccasion}
        weather={weather}
        weatherLabel={weatherLabel}
        setting={answeredSetting}
        conditions={answeredConditions}
        vibe={vibe}
        custom={custom.trim()}
        onEdit={editFromReview}
      />
    );
  }

  if (step === "occasion") {
    return (
      <Page className="flex flex-col items-center justify-center gap-xl">
        <Text variant="display">What’s the occasion?</Text>
        <Box className="flex flex-wrap items-start justify-center gap-lg">
          {occasions.map(({ name, src }) => (
            <ImageOptionCard
              key={name}
              // A wrapping `uppercase` doesn't reach the label: Tailwind's preflight resets
              // text-transform on buttons, and the card is one.
              label={name.toUpperCase()}
              src={src}
              size="lg"
              pressed={cardOccasion === name}
              onPressedChange={(pressed) => selectCard(name, pressed)}
            />
          ))}
          <AddTile title="Something else?" label="Add your own" onClick={openCustomOccasion} />
        </Box>
        <Button label="Next" disabled={!canContinue} onClick={continueFromOccasion} />
        <Modal
          open={customOccasionOpen}
          onClose={() => setCustomOccasionOpen(false)}
          title="Describe your own occasion"
          dismissible
          actions={[
            { label: "Cancel", variant: "ghost", onClick: () => setCustomOccasionOpen(false) },
            {
              label: "Confirm",
              variant: "primary",
              disabled: customOccasionDraft.trim() === "",
              onClick: confirmCustomOccasion,
            },
          ]}
        >
          <TextArea
            label="Describe the occasion"
            placeholder="Type here…"
            // The endpoint caps occasion at 100 characters.
            maxLength={100}
            value={customOccasionDraft}
            onValueChange={setCustomOccasionDraft}
          />
        </Modal>
      </Page>
    );
  }

  return step satisfies never;
}
