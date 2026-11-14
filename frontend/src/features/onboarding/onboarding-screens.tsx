import { ArrowLeftIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import hero from "@/design-system/assets/landing/hero.jpg";
import { Box, Button, CardImage, Logo, Page, Text } from "@/design-system";
import { OnboardingStepper, type OnboardingStage } from "@/features/onboarding/onboarding-stepper";

// Every screen reuses the landing hero until design exports the onboarding photos.

type WelcomeProps = {
  onStart: () => void;
};

export function Welcome({ onStart }: WelcomeProps) {
  return (
    <Page className="relative flex items-center justify-center">
      <CardImage src={hero} className="absolute inset-0 size-full" />
      <Box className="relative flex flex-col items-center gap-xl">
        <Box className="bg-card px-lg py-md">
          <Logo className="w-logo-header" />
        </Box>
        {/* 591px is the Card frame in Figma's Welcome to GTKY. */}
        <Box className="flex w-[591px] flex-col items-center gap-lg bg-card p-xxl text-center">
          <Text variant="title">Let's Get To Know You!</Text>
          <Text variant="body" className="text-secondary">
            Tell us about your preferences and style so we can personalize your recommendations!
          </Text>
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
      <Box className="ml-[400px] flex flex-1 flex-col items-center gap-xxxl">
        <Box className="relative w-full">
          {onBack && (
            <Button
              label="Back"
              leadingIcon={ArrowLeftIcon}
              variant="ghost"
              size="sm"
              className="absolute left-0 top-0"
              onClick={onBack}
            />
          )}
          <OnboardingStepper stage={stage} />
        </Box>
        <Box className="flex flex-1 flex-col items-center justify-center">{children}</Box>
      </Box>
    </Page>
  );
}

type ChoiceQuestionProps<T extends string> = {
  question: string;
  subtitle?: string;
  options: { value: T; label: string }[];
  onSelect: (value: T) => void;
};

// Buttons, not ChoiceGroup: picking an answer moves on at once, and a radio group would also pick
// one as the arrow keys move focus through it.
export function ChoiceQuestion<T extends string>({
  question,
  subtitle,
  options,
  onSelect,
}: ChoiceQuestionProps<T>) {
  return (
    <Box className="flex flex-col items-center gap-lg">
      <Box className="flex flex-col items-center gap-xs text-center">
        <Text variant="title">{question}</Text>
        {subtitle && <Text variant="subtitle">{subtitle}</Text>}
      </Box>
      {/* 564px is the answer rows' width in Figma's Own Any B&C Items 1. */}
      <Box className="flex w-[564px] flex-col gap-sm">
        {options.map((option) => (
          <Button
            key={option.value}
            label={option.label}
            variant="secondary"
            // Important, because Button's own justify-center otherwise wins. The hi-fi rows are
            // left-aligned.
            className="w-full !justify-start"
            onClick={() => onSelect(option.value)}
          />
        ))}
      </Box>
    </Box>
  );
}

/** Stands in for connecting a Shopify account, which doesn't exist yet. */
export function ShopLoginPlaceholder() {
  return (
    // 493px is the card in Figma's Shop Login Placeholder.
    <Box className="flex w-[493px] items-center justify-center bg-surface p-xxxl">
      <Text variant="subtitle">Log in with Shop</Text>
    </Box>
  );
}
