import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";

import { Box, Button, Page, Text } from "@/design-system";

type QuestionsIntroProps = {
  onStart: () => void;
  onSkip: () => void;
  onBack: () => void;
};

export function QuestionsIntro({ onStart, onSkip, onBack }: QuestionsIntroProps) {
  return (
    <Page className="flex flex-col items-center justify-center gap-xl text-center">
      <Box className="flex max-w-content-md flex-col gap-lg">
        <Text variant="display">Sounds like a plan!</Text>
        <Text variant="body-l">
          To better style you to your personal and event preferences, answer a few additional
          questions about the occasion. This step is optional, but more information will help us
          style you better!
        </Text>
      </Box>
      <Button label="Let’s go" trailingIcon={ArrowRightIcon} onClick={onStart} />
      <Box className="flex flex-col items-center gap-xs">
        <Button label="Skip" variant="ghost" size="sm" onClick={onSkip} />
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
