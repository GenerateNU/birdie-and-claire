import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Box, Button, ImageCard, ListCard, SearchField, Text, useToast } from "@/design-system";

export const Route = createFileRoute("/_signedIn/_hasAccount/create-outfit")({
  component: CreateOutfit,
});

type Step = "occasion" | "review";

const occasions = ["Work", "Night out", "Casual", "Festive"];

function CreateOutfit() {
  const [step, setStep] = useState<Step>("occasion");
  const [cardOccasion, setCardOccasion] = useState<string | null>(null);
  const [customOccasion, setCustomOccasion] = useState("");

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
    return <Review occasion={chosenOccasion} onEdit={() => setStep("occasion")} />;
  }

  return (
    <Box className="flex min-h-screen flex-col items-center gap-lg p-xl">
      <Text variant="heading">What's the occasion?</Text>
      <Box className="grid w-full max-w-content-xl grid-cols-2 gap-md md:grid-cols-4">
        {occasions.map((occasion) => (
          <ImageCard
            key={occasion}
            label={occasion}
            src={null}
            pressed={cardOccasion === occasion}
            onPressedChange={(pressed) => selectCard(occasion, pressed)}
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
  onEdit: () => void;
};

function Review({ occasion, onEdit }: ReviewProps) {
  const toast = useToast();

  return (
    <Box className="flex min-h-screen flex-col items-center gap-lg p-xl">
      <Text variant="heading">Let's review</Text>
      <Box className="flex w-full max-w-content-md flex-col gap-xs">
        <ListCard
          title="Occasion"
          value={occasion}
          action={{ label: "Edit", accessibleLabel: "Edit Occasion", onClick: onEdit }}
        />
        {/* Hardcoded stand-ins, with no Edit, until the steps between the two screens exist. */}
        <ListCard title="Weather" value="Sunny" />
        <ListCard title="Vibe" value="Professional" />
        <ListCard title="Items to include" value="2" />
      </Box>
      <Button
        label="Create my outfit"
        onClick={() => toast.show({ message: "Outfit requested" })}
      />
    </Box>
  );
}
