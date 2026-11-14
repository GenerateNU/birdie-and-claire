import { ArrowRightIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
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
  ImageOptionCard,
  Modal,
  OptionTileGroup,
  Page,
  SearchField,
  SegmentedControl,
  Text,
  TextArea,
} from "@/design-system";
import {
  occasions,
  specificsOptions,
  tileToApiWeather,
  vibeCards,
  weatherConditions,
  weatherTiles,
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
  const [custom, setCustom] = useState("");

  const chosenOccasion = cardOccasion ?? customOccasion.trim();
  const weather = weatherTile === null ? null : tileToApiWeather[weatherTile];
  // Outdoors is preselected, so the setting counts as answered only once a weather tile is picked.
  const answeredSetting = weatherTile === null ? null : setting;

  const answeredConditions =
    weatherTile === null || conditions.length === 0 ? null : conditions.join(",");

  const weatherSummary =
    weatherTile === null
      ? "None"
      : [
          weatherTiles.find((tile) => tile.value === weatherTile)?.label,
          ...weatherConditions
            .filter(({ value }) => conditions.includes(value))
            .map(({ label }) => label.toLowerCase()),
        ].join(", ");

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

  function skipCustom() {
    if (!returnToReview) {
      setCustom("");
    }

    advanceTo("review");
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
        description={null}
        next={{ onClick: () => advanceTo("vibe"), disabled: weatherTile === null }}
        onBack={() => goBackTo("questions-intro")}
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
          <Text variant="body">Anything else?</Text>
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
        title="What vibe describes you best?"
        description={null}
        next={{ onClick: () => advanceTo("specifics"), disabled: vibe === null }}
        onBack={() => goBackTo("weather")}
      >
        <Box className="flex flex-wrap justify-center gap-lg">
          {vibeCards.map((card) => (
            <ImageOptionCard
              key={card.vibe}
              label={card.label.toUpperCase()}
              src={card.src}
              size="lg"
              pressed={vibe === card.vibe}
              onPressedChange={(pressed) => setVibe(pressed ? card.vibe : null)}
            />
          ))}
        </Box>
      </StepScreen>
    );
  }

  if (step === "specifics") {
    return (
      <StepScreen
        step="specifics"
        title="Are there any specific Birdie & Claire items you would like to include?"
        description={null}
        next={null}
        onBack={() => goBackTo("vibe")}
      >
        <Box className="mx-auto max-w-content-sm">
          {/* Yes and No both continue, and the answer isn't sent, until the catalog screen exists. */}
          <ChoiceGroup
            options={specificsOptions}
            value={null}
            onValueChange={() => advanceTo("custom")}
          />
        </Box>
      </StepScreen>
    );
  }

  if (step === "custom") {
    return (
      <StepScreen
        step="custom"
        title="Anything else you’d like to tell us?"
        description={
          "Fine tune your outfit with more specific instructions and descriptions you’d want included.\nTotally optional, just a way for us to get your taste."
        }
        next={null}
        onBack={() => goBackTo("specifics")}
      >
        <Box className="flex flex-col items-center gap-xxl pt-md">
          <SearchField
            label="Anything else you’d like to tell us"
            placeholder="Describe anything here (i.e. add gold ring, make vibe playful...)"
            leadingIcon={MagnifyingGlassIcon}
            size="sm"
            // The endpoint caps custom at 200 characters.
            maxLength={200}
            value={custom}
            onValueChange={setCustom}
            onSubmit={() => advanceTo("review")}
            className="w-full max-w-content-md"
          />
          <Box className="flex flex-col items-center gap-md">
            <Button
              label="Let’s go"
              trailingIcon={ArrowRightIcon}
              onClick={() => advanceTo("review")}
            />
            <Button label="Skip" variant="ghost" size="sm" onClick={skipCustom} />
          </Box>
        </Box>
      </StepScreen>
    );
  }

  if (step === "review") {
    return (
      <Review
        occasion={chosenOccasion}
        weather={weather}
        weatherSummary={weatherSummary}
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
        <Text variant="display-hifi">What’s the occasion?</Text>
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
