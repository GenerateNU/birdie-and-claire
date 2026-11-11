import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Box, Button, Empty, ErrorState, Link, Logo, Spinner, Text } from "@/design-system";
import { OutfitCanvas } from "@/features/outfits/outfit-canvas";
import { OutfitDetails } from "@/features/outfits/outfit-details";
import { isOutfitNotFound, outfitQueryOptions } from "@/features/outfits/outfit-query";

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

  if (isOutfitNotFound(outfitQuery.error)) {
    return (
      <EditorFrame>
        <Empty title="Outfit not found" className="p-lg" />
      </EditorFrame>
    );
  }

  // Checked rather than isError, so a failed background refetch keeps the outfit on screen.
  if (outfitQuery.data === undefined) {
    return (
      <EditorFrame>
        <ErrorState
          message="Couldn't load this outfit."
          onRetry={() => void outfitQuery.refetch()}
          className="p-lg"
        />
      </EditorFrame>
    );
  }

  const { name, products } = outfitQuery.data;

  return (
    <EditorFrame>
      {/* Side by side from lg up. Narrower than that, the 576px details panel would squeeze the
          canvas to nothing, so the panels stack. */}
      <main className="flex min-h-0 flex-1 flex-col gap-xs p-xs pt-md lg:flex-row">
        <Box className="min-h-0 min-w-0 flex-1">
          <OutfitCanvas products={products}>
            <Button label="Help" variant="secondary" disabled className="absolute left-sm top-md" />
          </OutfitCanvas>
        </Box>
        <Box className="h-2/5 lg:h-auto lg:w-content-md lg:shrink-0">
          <OutfitDetails outfitName={name} products={products} />
        </Box>
      </main>
    </EditorFrame>
  );
}

/** Fills the window, so the panels under the header take the height that's left. */
function EditorFrame({ children }: EditorFrameProps) {
  return (
    <Box className="flex h-screen flex-col">
      <EditorHeader />
      {children}
    </Box>
  );
}

function EditorHeader() {
  return (
    <header className="grid h-[144px] grid-cols-[1fr_auto_1fr] items-end border-y px-md">
      <Text variant="heading" className="pb-md">
        Outfit Editor
      </Text>
      <Link to="/profile/outfits" className="pb-xxxs">
        {/* object-bottom repeats the Figma's crop of the image's empty top edge. */}
        <Logo className="h-[118px] w-[373px] object-cover object-bottom" />
      </Link>
      {/* Disabled until outfit editing is built. */}
      <Box className="flex items-center gap-xxs justify-self-end pb-sm">
        <Button label="Undo" variant="secondary" disabled />
        <Button label="Redo" variant="secondary" disabled />
        <Button label="Save" disabled className="ml-sm" />
      </Box>
    </header>
  );
}
