import { CaretLeft } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Box, Link, Page } from "@/design-system";
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
        <Link to="/profile/pieces" variant="text" leadingIcon={CaretLeft}>
          Back
        </Link>
      </Box>
      <PiecePicker onAdded={() => void navigate({ to: "/profile/pieces" })} />
    </Page>
  );
}
