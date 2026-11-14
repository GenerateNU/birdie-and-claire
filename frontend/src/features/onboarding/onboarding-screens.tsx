import { ArrowLeftIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import hero from "@/design-system/assets/landing/hero.jpg";
import { Box, Button, CardImage, ChoiceGroup, Logo, Page, Text } from "@/design-system";
import { OnboardingStepper, type OnboardingStage } from "@/features/onboarding/onboarding-stepper";

// Every screen reuses the landing hero until design exports the onboarding photos.

type WelcomeProps = {
  onStart: () => void;
};

export function Welcome({ onStart }: WelcomeProps) {
  return (
    <Page className="relative flex items-center justify-center">
      <CardImage src={hero} className="absolute inset-0 size-full" />
      <Box className="relative flex flex-col items-center gap-xxl">
        <Box className="bg-card">
          <Logo className="w-logo-onboarding" />
        </Box>
        <Box className="flex w-onboarding-card flex-col items-center gap-md bg-card p-xxl text-center">
          <Box className="flex flex-col items-center gap-xs">
            <Text variant="display">Let's Get To Know You!</Text>
            <Text variant="body-l">
              Tell us about your preferences and style so we can personalize your recommendations!
            </Text>
          </Box>
          <Button label="Start" className="w-full" onClick={onStart} />
        </Box>
      </Box>
    </Page>
  );
}

type OwnedPiecesLayoutProps = {
  onBack: (() => void) | null;
  stage: OnboardingStage;
  children: ReactNode;
};

export function OwnedPiecesLayout({ onBack, stage, children }: OwnedPiecesLayoutProps) {
  return (
    <Page className="flex">
      {/* 73% keeps the stand-in hero's subject centered in the strip. */}
      <CardImage
        src={hero}
        className="fixed left-0 top-0 h-screen w-onboarding-photo object-[73%_50%]"
      />
      <Box className="relative ml-onboarding-photo flex flex-1 flex-col items-center pt-xxxl">
        {onBack && (
          <Button
            label="Back"
            leadingIcon={ArrowLeftIcon}
            variant="ghost"
            className="absolute -left-md -top-md"
            onClick={onBack}
          />
        )}
        <OnboardingStepper stage={stage} />
        <Box className="flex flex-1 flex-col items-center justify-center">{children}</Box>
      </Box>
    </Page>
  );
}

type ChoiceQuestionProps<T extends string> = {
  heading: ReactNode;
  options: { value: T; label: string; subtitle?: string }[];
  onSelect: (value: T) => void;
};

export function ChoiceQuestion<T extends string>({
  heading,
  options,
  onSelect,
}: ChoiceQuestionProps<T>) {
  return (
    <Box className="flex flex-col items-center gap-xl">
      <Box className="flex flex-col items-center gap-xs text-center">{heading}</Box>
      <Box className="w-onboarding-choices">
        <ChoiceGroup options={options} value={null} onValueChange={onSelect} hideRadio />
      </Box>
    </Box>
  );
}
