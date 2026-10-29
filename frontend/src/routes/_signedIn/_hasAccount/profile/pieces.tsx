import { createFileRoute } from "@tanstack/react-router";

import { Empty } from "@/design-system";

export const Route = createFileRoute("/_signedIn/_hasAccount/profile/pieces")({
  component: PiecesPage,
});

function PiecesPage() {
  return (
    <>
      {/* Text's heading variant renders an h2, and the page needs an h1. */}
      <h1 className="mb-lg text-heading">Pieces I Own</h1>
      <Empty title="Coming soon" />
    </>
  );
}
