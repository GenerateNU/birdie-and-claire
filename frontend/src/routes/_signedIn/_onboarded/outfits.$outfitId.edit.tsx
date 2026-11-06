import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import OutfitCanvas from "@/OutfitCanvas";
import OutfitDetails from "@/OutfitDetails";
import logo from "@/assets/logo.png";
import { Button, Empty, ErrorState, Spinner } from "@/design-system";
import { outfitQueryOptions } from "@/outfitQuery";

export const Route = createFileRoute("/_signedIn/_onboarded/outfits/$outfitId/edit")({
  component: OutfitEditorPage,
});

type EditorFrameProps = {
  children: ReactNode;
};

function OutfitEditorPage() {
  const { outfitId } = Route.useParams();

  const outfitQuery = useQuery(outfitQueryOptions(outfitId));

  if (outfitQuery.isPending) {
    return (
      <EditorFrame>
        <Spinner className="m-lg" />
      </EditorFrame>
    );
  }

  // Checked rather than isError, so a failed background refetch keeps the outfit on screen.
  if (outfitQuery.data === undefined) {
    return (
      <EditorFrame>
        <ErrorState
          message={`Failed to load the outfit: ${outfitQuery.error?.message}`}
          onRetry={() => void outfitQuery.refetch()}
          className="p-lg"
        />
      </EditorFrame>
    );
  }

  if (outfitQuery.data === null) {
    return (
      <EditorFrame>
        <Empty title="Outfit not found" className="p-lg" />
      </EditorFrame>
    );
  }

  const { name, products } = outfitQuery.data;

  return (
    <EditorFrame>
      {/* Side by side from lg up. Narrower than that, the 576px details panel would squeeze the
          canvas to nothing, so the panels stack. */}
      <main className="flex min-h-0 flex-1 flex-col gap-xs p-xs pt-md lg:flex-row">
        <div className="min-h-0 min-w-0 flex-1">
          <OutfitCanvas products={products}>
            <Button label="Help" variant="secondary" disabled className="absolute left-sm top-md" />
          </OutfitCanvas>
        </div>
        <div className="h-2/5 lg:h-auto lg:w-[576px] lg:shrink-0">
          <OutfitDetails outfitName={name} products={products} />
        </div>
      </main>
    </EditorFrame>
  );
}

/** Fills the window, so the panels under the header take the height that's left. */
function EditorFrame({ children }: EditorFrameProps) {
  return (
    <div className="flex h-screen flex-col bg-background font-sans text-primary">
      <EditorHeader />
      {children}
    </div>
  );
}

function EditorHeader() {
  return (
    <header className="grid h-[144px] grid-cols-[1fr_auto_1fr] items-end border-y px-md">
      {/* Text's heading variant renders an h2, and the page needs an h1. */}
      <h1 className="pb-md text-heading">Outfit Editor</h1>
      <Link to="/profile/outfits" className="pb-xxxs">
        {/* object-bottom repeats the Figma's crop of the image's empty top edge. */}
        <img
          src={logo}
          alt="Birdie & Claire"
          className="h-[118px] w-[373px] object-cover object-bottom"
        />
      </Link>
      {/* Disabled until outfit editing is built. */}
      <div className="flex items-center gap-xxs justify-self-end pb-sm">
        <Button label="Undo" variant="secondary" disabled />
        <Button label="Redo" variant="secondary" disabled />
        <Button label="Save" disabled className="ml-sm" />
      </div>
    </header>
  );
}
