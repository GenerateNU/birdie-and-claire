import { Box, ProgressStepper } from "@/design-system";

export type OnboardingStage = "owns-pieces" | "add-pieces" | "style" | "fit";

// Figma labels the steps only by number, so each stage's name goes to screen readers instead.
const stages: { stage: OnboardingStage; name: string }[] = [
  { stage: "owns-pieces", name: "Birdie & Claire clothes" },
  { stage: "add-pieces", name: "Add your pieces" },
  { stage: "style", name: "Style" },
  { stage: "fit", name: "Fit preferences" },
];

const stepLabels = stages.map((_, index) => `Step ${index + 1}`);

type OnboardingStepperProps = {
  stage: OnboardingStage;
};

export function OnboardingStepper({ stage }: OnboardingStepperProps) {
  const currentStep = stages.findIndex((entry) => entry.stage === stage);

  return (
    // 591px is the Progress Stepper instance in Figma's Own Any B&C Items.
    <Box
      role="group"
      aria-label={`Step ${currentStep + 1} of ${stages.length}: ${stages[currentStep].name}`}
      className="mx-auto w-[591px]"
    >
      <ProgressStepper steps={stepLabels} currentStep={currentStep} />
    </Box>
  );
}
