import { ArrowLeftIcon } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Box, Link, Page, Text } from "@/design-system";
import { PiecePicker } from "@/features/pieces/piece-picker";

// Outside the profile layout, so the picker gets the full page the design shows.
export const Route = createFileRoute("/_signedIn/_onboarded/pieces/add")({
  component: AddOwnedPiecesPage,
});

function AddOwnedPiecesPage() {
  const navigate = useNavigate();

  return (
    <Page>
      <Box className="mb-md">
        <Link to="/profile/pieces" variant="ghost" size="sm" leadingIcon={ArrowLeftIcon}>
          Back
        </Link>
      </Box>
      <Text variant="heading" className="mb-lg">
        Add B&C Clothes You Own
      </Text>
      <PiecePicker onSaved={() => void navigate({ to: "/profile/pieces" })} />
    </Page>
  );
}
