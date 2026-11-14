import { ArrowRightIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";

import { getCurrentUserOptions } from "@/api/generated/@tanstack/react-query.gen";
import { Box, Button, ErrorState, Page, Spinner, Text } from "@/design-system";
import { firstName } from "@/features/account/first-name";

type IntroProps = {
  onStart: () => void;
};

export function Intro({ onStart }: IntroProps) {
  const firstNameQuery = useQuery({ ...getCurrentUserOptions(), select: firstName });

  if (firstNameQuery.isPending) {
    return <Spinner />;
  }

  if (firstNameQuery.data === undefined) {
    return (
      <ErrorState
        message="Couldn't load your account."
        onRetry={() => void firstNameQuery.refetch()}
      />
    );
  }

  return (
    <Page className="flex flex-col">
      <Box className="flex flex-1 flex-col items-center justify-center gap-xl text-center">
        <Box className="flex flex-col gap-xs">
          <Text variant="display">Hi there, {firstNameQuery.data}!</Text>
          <Text variant="body-l">Let’s figure out what occasion you need styling for</Text>
        </Box>
        <Button label="Let’s go" trailingIcon={ArrowRightIcon} onClick={onStart} />
      </Box>
    </Page>
  );
}
