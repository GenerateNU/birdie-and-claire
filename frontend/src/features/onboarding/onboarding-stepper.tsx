import { Box, ProgressStepper } from "@/design-system";

export type OnboardingStage = "owned-items" | "style" | "fit";

const stages: { stage: OnboardingStage; label: string }[] = [
  { stage: "owned-items", label: "Owned Items" },
  { stage: "style", label: "Style" },
  { stage: "fit", label: "Preferences" },
];

const stepLabels = stages.map((entry) => entry.label);

type OnboardingStepperProps = {
  stage: OnboardingStage;
};

export function OnboardingStepper({ stage }: OnboardingStepperProps) {
  return (
    <Box className="mx-auto w-onboarding-stepper">
      <ProgressStepper
        steps={stepLabels}
        currentStep={stages.findIndex((entry) => entry.stage === stage)}
      />
    </Box>
  );
}
