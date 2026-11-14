import { ArrowLeftIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Box, Button, Page, ProgressStepper, Text } from "@/design-system";
import { barSteps, type BarStep } from "@/features/outfits/create-outfit/create-outfit-options";

type StepScreenProps = {
  step: BarStep;
  title: string;
  next: { onClick: () => void; disabled: boolean } | null;
  onBack: () => void;
  children: ReactNode;
};

export function StepScreen({ step, title, next, onBack, children }: StepScreenProps) {
  return (
    <Page className="flex flex-col items-center gap-xxxl">
      <Box className="w-full max-w-content-lg">
        <ProgressStepper
          steps={barSteps.map((barStep) => barStep.label)}
          currentStep={barSteps.findIndex((barStep) => barStep.step === step)}
        />
      </Box>
      <Box className="flex w-full max-w-content-2xl flex-1 flex-col items-center justify-center gap-lg">
        <Text variant="display-hifi" className="max-w-content-xl text-center">
          {title}
        </Text>
        <Box className="w-full">{children}</Box>
        {next && <Button label="Next" disabled={next.disabled} onClick={next.onClick} />}
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
