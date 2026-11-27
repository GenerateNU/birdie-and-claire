import { CoatHangerIcon, PlusIcon } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Box, EmptyState, ErrorState, Skeleton } from "@/design-system";
import { CollectionFilter } from "@/features/collections/collection-filter";
import { SavedOutfitsLayout } from "@/features/collections/saved-outfits-layout";
import { OutfitList } from "@/features/outfits/outfit-list";
import { isEmptyList } from "@/features/outfits/saved-outfits";
import { useSavedOutfits } from "@/features/outfits/use-saved-outfits";

export const Route = createFileRoute("/_signedIn/_onboarded/_nav/profile/outfits")({
  // Coerced, because the router reads ?collection=123 as a number. Whatever the value, it goes to the
  // API, which rejects anything that isn't a collection ID, and the page shows "Collection not found".
  validateSearch: z.object({ collection: z.coerce.string().optional() }),
  component: OutfitsPage,
});

function OutfitsPage() {
  const { collection: collectionId } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <SavedOutfitsLayout
      active="all"
      actions={
        <CollectionFilter
          collectionId={collectionId}
          onCollectionIdChange={(nextCollectionId) =>
            void navigate({
              to: "/profile/outfits",
              search: nextCollectionId === undefined ? {} : { collection: nextCollectionId },
            })
          }
        />
      }
    >
      <AllOutfits collectionId={collectionId} />
    </SavedOutfitsLayout>
  );
}

function AllOutfits({ collectionId }: { collectionId: string | undefined }) {
  const saved = useSavedOutfits(collectionId);
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

  if (saved.status === "error" && saved.collectionNotFound) {
    return (
      <EmptyState
        title="Collection not found"
        action={{
          label: "Show all outfits",
          onClick: () => void navigate({ to: "/profile/outfits" }),
        }}
      />
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
          // A new outfit wouldn't land in the collection being shown.
          addTile={collectionId === undefined}
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
