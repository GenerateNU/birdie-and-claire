import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  Box,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Skeleton,
  Spinner,
  Text,
} from "@/design-system";
import {
  collectionQueryOptions,
  isCollectionNotFound,
} from "@/features/collections/collection-query";
import { EditCollection } from "@/features/collections/edit-collection";
import { useCollectionOutfits } from "@/features/collections/use-collection-outfits";
import { OutfitList } from "@/features/outfits/outfit-list";
import { isEmptyList } from "@/features/outfits/saved-outfits";

export const Route = createFileRoute(
  "/_signedIn/_onboarded/_nav/profile/collections/$collectionId",
)({
  component: CollectionDetailPage,
});

function CollectionDetailPage() {
  const { collectionId } = Route.useParams();
  const navigate = useNavigate();
  const collectionQuery = useQuery(collectionQueryOptions(collectionId));
  const [editing, setEditing] = useState(false);

  function backToCollections() {
    void navigate({ to: "/profile/collections" });
  }

  if (collectionQuery.isPending) {
    return <Spinner />;
  }

  if (isCollectionNotFound(collectionQuery.error)) {
    return (
      <EmptyState
        title="Collection not found"
        action={{ label: "Back to collections", onClick: backToCollections }}
      />
    );
  }

  // Checked rather than isError, so a failed background refetch keeps the collection on screen.
  if (collectionQuery.data === undefined) {
    return (
      <ErrorState
        message="Couldn't load this collection."
        onRetry={() => void collectionQuery.refetch()}
      />
    );
  }

  const collection = collectionQuery.data;

  return (
    <>
      <Box className="mb-lg flex items-start gap-md">
        <IconButton
          icon={ArrowLeftIcon}
          label="Back to collections"
          variant="ghost"
          onClick={backToCollections}
        />
        <Box className="flex min-w-0 flex-1 flex-col gap-xxs">
          <Text variant="heading">{collection.name}</Text>
          {collection.description && <Text variant="body">{collection.description}</Text>}
        </Box>
        <Button label="Edit" variant="secondary" size="sm" onClick={() => setEditing(true)} />
      </Box>
      <CollectionOutfits collectionId={collection.id} />
      {editing && (
        <EditCollection
          collection={collection}
          startWith="edit"
          onClose={() => setEditing(false)}
          onDeleted={backToCollections}
        />
      )}
    </>
  );
}

function CollectionOutfits({ collectionId }: { collectionId: string }) {
  const navigate = useNavigate();
  const outfits = useCollectionOutfits(collectionId);

  if (outfits.status === "loading") {
    return (
      <Box
        role="status"
        aria-label="Loading this collection's outfits"
        className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3"
      >
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="aspect-[3/1]" />
        ))}
      </Box>
    );
  }

  if (outfits.status === "error") {
    return (
      <ErrorState message="Couldn't load this collection's outfits." onRetry={outfits.retry} />
    );
  }

  return (
    <>
      {isEmptyList(outfits.outfits.length, outfits.hasMore) ? (
        <EmptyState title="No outfits in this collection yet" />
      ) : (
        <OutfitList
          outfits={outfits.outfits}
          hasMore={outfits.hasMore}
          onLoadMore={outfits.loadMore}
          onOpen={(outfitId) => void navigate({ to: "/outfits/$outfitId", params: { outfitId } })}
          addTile={false}
        />
      )}
      {outfits.loadMoreFailed && (
        <ErrorState
          message="Couldn't load more outfits."
          onRetry={outfits.retryLoadMore}
          retryLabel="Retry"
        />
      )}
    </>
  );
}
