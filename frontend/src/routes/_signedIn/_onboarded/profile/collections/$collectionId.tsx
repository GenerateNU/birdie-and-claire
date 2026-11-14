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
  OutfitCard,
  Spinner,
  Text,
} from "@/design-system";
import {
  collectionQueryOptions,
  isCollectionNotFound,
} from "@/features/collections/collection-query";
import { EditCollection } from "@/features/collections/edit-collection";

export const Route = createFileRoute("/_signedIn/_onboarded/profile/collections/$collectionId")({
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
      {collection.outfits.length === 0 ? (
        <EmptyState title="No outfits in this collection yet" />
      ) : (
        <ul className="flex flex-wrap gap-lg">
          {collection.outfits.map((outfit) => (
            <li key={outfit.id}>
              <OutfitCard
                mode="browse"
                title={outfit.name}
                // Products come head to toe, so the first is the outfit's top piece.
                src={outfit.products.at(0)?.image_url ?? null}
                image={null}
                onOpen={() =>
                  void navigate({ to: "/outfits/$outfitId", params: { outfitId: outfit.id } })
                }
              />
            </li>
          ))}
        </ul>
      )}
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
