import { BookmarkSimpleIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";

import { Box, EmptyState, ErrorState, PageHeader, Skeleton, Text } from "@/design-system";
import { ExitFlowButton } from "@/features/navigation/exit-flow-button";
import { OutfitList } from "@/features/outfits/outfit-list";
import { isEmptyList } from "@/features/outfits/saved-outfits";
import { useSavedOutfits } from "@/features/outfits/use-saved-outfits";

/** Picks a saved outfit to start a new one from. The saved outfit itself is never changed. */
export function BasePicker() {
  const navigate = useNavigate();

  return (
    <Box className="flex min-h-screen flex-col">
      <PageHeader
        title="Create new outfit"
        logoTo="/profile/outfits"
        actions={<ExitFlowButton onExit={() => void navigate({ to: "/profile/outfits" })} />}
      />
      <main className="flex flex-col gap-lg p-xxxl">
        <Box className="flex flex-col gap-xs">
          <Text variant="heading-l">Pick a base</Text>
          <Text variant="body-l" className="text-secondary">
            Start from one of your saved outfits. It stays as it is.
          </Text>
        </Box>
        <SavedOutfitBases />
      </main>
    </Box>
  );
}

function SavedOutfitBases() {
  const saved = useSavedOutfits();
  const navigate = useNavigate();

  if (saved.status === "loading") {
    return (
      <Box
        role="status"
        aria-label="Loading your outfits"
        className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3"
      >
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="aspect-[3/1]" />
        ))}
      </Box>
    );
  }

  if (saved.status === "error") {
    return <ErrorState message={saved.message} onRetry={saved.retry} />;
  }

  if (isEmptyList(saved.outfits.length, saved.hasMore)) {
    return (
      <EmptyState
        icon={BookmarkSimpleIcon}
        title="No saved outfits yet"
        description="Save an outfit to use it as a base"
        action={{
          label: "Start from scratch",
          onClick: () => void navigate({ to: "/create-outfit/build" }),
        }}
      />
    );
  }

  return (
    <>
      <OutfitList
        outfits={saved.outfits}
        hasMore={saved.hasMore}
        onLoadMore={saved.loadMore}
        onOpen={(outfitId) =>
          void navigate({ to: "/create-outfit/build", search: { base: outfitId } })
        }
        addTile={false}
      />
      {saved.loadMoreError && (
        <ErrorState
          message={saved.loadMoreError}
          onRetry={saved.retryLoadMore}
          retryLabel="Retry"
        />
      )}
    </>
  );
}
