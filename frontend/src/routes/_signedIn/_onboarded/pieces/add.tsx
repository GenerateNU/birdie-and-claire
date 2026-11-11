import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Page } from "@/design-system";
import { PiecePicker } from "@/features/pieces/piece-picker";

// Outside the profile layout, so the picker gets the full page the design shows.
export const Route = createFileRoute("/_signedIn/_onboarded/pieces/add")({
  component: AddPiecesPage,
});

function AddPiecesPage() {
  const navigate = useNavigate();

  function backToPieces() {
    void navigate({ to: "/profile/pieces" });
  }

  return (
    <Page>
      <PiecePicker onBack={backToPieces} onAdded={backToPieces} />
    </Page>
  );
}
