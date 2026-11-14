import { ArrowLeftIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Box, Button, Page, ProgressStepper, Text } from "@/design-system";
import { barSteps, type BarStep } from "@/features/outfits/create-outfit/create-outfit-options";

type StepScreenProps = {
  step: BarStep;
  title: string;
  /** Sits right under the title. A newline in it starts a new line. */
  description: string | null;
  next: { onClick: () => void; disabled: boolean } | null;
  onBack: () => void;
  children: ReactNode;
};

export function StepScreen({ step, title, description, next, onBack, children }: StepScreenProps) {
  return (
    <Page className="flex flex-col items-center gap-xxxl">
      <Box className="w-full max-w-content-lg">
        <ProgressStepper
          steps={barSteps.map((barStep) => barStep.label)}
          currentStep={barSteps.findIndex((barStep) => barStep.step === step)}
        />
      </Box>
      <Box className="flex w-full max-w-content-2xl flex-1 flex-col items-center justify-center gap-lg">
        <Box className="flex flex-col items-center gap-xs text-center">
          <Text variant="display-hifi" className="max-w-content-xl">
            {title}
          </Text>
          {description !== null && (
            <Text variant="body-m" className="whitespace-pre-line">
              {description}
            </Text>
          )}
        </Box>
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
