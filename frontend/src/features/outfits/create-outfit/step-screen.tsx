import { ArrowLeftIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Box, Button, Page, ProgressStepper, Text } from "@/design-system";
import { barSteps, type BarStep } from "@/features/outfits/create-outfit/create-outfit-options";

type StepScreenProps = {
  step: BarStep;
  title: string;
  canContinue: boolean;
  onBack: () => void;
  onNext: () => void;
  children: ReactNode;
};

export function StepScreen({
  step,
  title,
  canContinue,
  onBack,
  onNext,
  children,
}: StepScreenProps) {
  return (
    <Page className="flex flex-col items-center gap-xxxl">
      <Box className="w-full max-w-content-lg">
        <ProgressStepper
          steps={barSteps.map((barStep) => barStep.label)}
          currentStep={barSteps.findIndex((barStep) => barStep.step === step)}
        />
      </Box>
      <Box className="flex w-full max-w-content-xl flex-1 flex-col items-center justify-center gap-lg">
        <Text variant="display-hifi" className="text-center">
          {title}
        </Text>
        <Box className="w-full">{children}</Box>
        <Button label="Next" disabled={!canContinue} onClick={onNext} />
        <Button
          label="Back"
          variant="ghost"
          size="sm"
          leadingIcon={ArrowLeftIcon}
          onClick={onBack}
        />
      </Box>
    </Page>
  );
}
