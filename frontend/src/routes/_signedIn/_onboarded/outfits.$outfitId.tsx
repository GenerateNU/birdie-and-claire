import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ApiError } from "@/api/client";
import { getOutfitOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { ErrorModel } from "@/api/generated/types.gen";
import { Box, Button, Empty, ErrorState, Link, Logo, Spinner, Text } from "@/design-system";
import { OutfitCanvas } from "@/features/outfits/outfit-canvas";
import { OutfitDetails } from "@/features/outfits/outfit-details";

export const Route = createFileRoute("/_signedIn/_onboarded/outfits/$outfitId")({
  component: OutfitPage,
});

type EditorFrameProps = {
  children: ReactNode;
};

// huma answers 422 for an ID that isn't a UUID, which can't name an outfit either.
function isNotFound(error: ErrorModel | null) {
  return error instanceof ApiError && (error.status === 404 || error.status === 422);
}

const MAX_RETRIES = 3;

function OutfitPage() {
  const { outfitId } = Route.useParams();

  const outfitQuery = useQuery({
    ...getOutfitOptions({ path: { id: outfitId } }),
    // Asking again won't make a missing outfit appear.
    retry: (failureCount, error) => !isNotFound(error) && failureCount < MAX_RETRIES,
  });

  if (outfitQuery.isPending) {
    return (
      <EditorFrame>
        <Spinner className="m-lg" />
      </EditorFrame>
    );
  }

  if (isNotFound(outfitQuery.error)) {
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
          <OutfitCanvas products={products} />
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
