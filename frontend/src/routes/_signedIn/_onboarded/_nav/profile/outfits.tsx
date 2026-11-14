import { CoatHangerIcon, PlusIcon } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Box, EmptyState, ErrorState, Skeleton, Text } from "@/design-system";
import { OutfitList } from "@/features/outfits/outfit-list";
import { isEmptyList } from "@/features/outfits/saved-outfits";
import { useSavedOutfits } from "@/features/outfits/use-saved-outfits";

export const Route = createFileRoute("/_signedIn/_onboarded/_nav/profile/outfits")({
  component: OutfitsPage,
});

function OutfitsPage() {
  return (
    <>
      <Text variant="heading" className="mb-xs">
        Saved Outfits
      </Text>
      {/* No count: GET /outfits doesn't return a total. */}
      <Text variant="subheading" className="mb-lg">
        All
      </Text>
      <AllOutfits />
    </>
  );
}

function AllOutfits() {
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

  return (
    <>
      {isEmptyList(saved.outfits.length, saved.hasMore) ? (
        <EmptyState
          icon={CoatHangerIcon}
          title="No outfit yet"
          description="Your saved outfits live here"
          action={{
            label: "Add outfit",
            icon: PlusIcon,
            onClick: () => void navigate({ to: "/create-outfit" }),
          }}
        />
      ) : (
        <OutfitList
          outfits={saved.outfits}
          hasMore={saved.hasMore}
          onLoadMore={saved.loadMore}
          onOpen={(outfitId) => void navigate({ to: "/outfits/$outfitId", params: { outfitId } })}
          showAddTile
        />
      )}
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
