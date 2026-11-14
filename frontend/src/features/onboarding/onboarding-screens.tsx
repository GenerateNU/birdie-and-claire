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
          {/* 332px is the Logo frame in Figma's Welcome to GTKY. */}
          <Logo className="w-[332px]" />
        </Box>
        {/* 591px is the Card frame in Figma's Welcome to GTKY. */}
        <Box className="flex w-[591px] flex-col items-center gap-md bg-card p-xxl text-center">
          <Box className="flex flex-col items-center gap-xs">
            <Text variant="largeTitle">Let's Get To Know You!</Text>
            <Text variant="body">
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
  /** Null on the first question, which the design gives no Back. */
  onBack: (() => void) | null;
  stage: OnboardingStage;
  children: ReactNode;
};

export function OwnedPiecesLayout({ onBack, stage, children }: OwnedPiecesLayoutProps) {
  return (
    <Page className="flex">
      {/* 400px is the Image frame in Figma's Own Any B&C Items. The hero's subject stands right of
          center, so 73% keeps her in the middle of the strip. Fixed so it sits outside the page's
          padding. */}
      <CardImage src={hero} className="fixed left-0 top-0 h-screen w-[400px] object-[73%_50%]" />
      {/* Figma puts the stepper 80px from the top and Back 16px in from the photo's corner. */}
      <Box className="relative ml-[400px] flex flex-1 flex-col items-center pt-xxxl">
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
      {/* 565px is the Choice Group in Figma's Own Any B&C Items. */}
      <Box className="w-[565px]">
        <ChoiceGroup options={options} value={null} onValueChange={onSelect} showRadio={false} />
      </Box>
    </Box>
  );
}
