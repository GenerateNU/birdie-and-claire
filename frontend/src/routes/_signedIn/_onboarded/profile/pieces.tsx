import { createFileRoute } from "@tanstack/react-router";

import { Empty, Text } from "@/design-system";

export const Route = createFileRoute("/_signedIn/_onboarded/profile/pieces")({
  component: PiecesPage,
});

function PiecesPage() {
  return (
    <>
      <Text variant="heading" className="mb-lg">
        Pieces I Own
      </Text>
      <Empty title="Coming soon" />
    </>
  );
}
