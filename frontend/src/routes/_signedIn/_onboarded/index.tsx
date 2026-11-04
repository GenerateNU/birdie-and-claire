import { CaretRight } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { Box, Link, Page, Text } from "@/design-system";

export const Route = createFileRoute("/_signedIn/_onboarded/")({
  component: Home,
});

// A placeholder until the home page is designed.
function Home() {
  return (
    <Page>
      <Text variant="heading" className="mb-md">
        Home
      </Text>
      <Box className="flex flex-col items-start gap-xxs">
        <Link variant="text" to="/profile" trailingIcon={CaretRight}>
          Profile
        </Link>
        <Link variant="text" to="/create-outfit" trailingIcon={CaretRight}>
          Create an outfit
        </Link>
      </Box>
    </Page>
  );
}
