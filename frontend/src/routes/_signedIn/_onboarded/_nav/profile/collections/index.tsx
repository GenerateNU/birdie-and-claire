import { PlusIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  createCollectionMutation,
  listCollectionsOptions,
  listCollectionsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import type { CollectionSummaryResponse } from "@/api/generated/types.gen";
import { Button, CollectionCard, EmptyState, ErrorState, Spinner, useToast } from "@/design-system";
import { CollectionFormDialog } from "@/features/collections/collection-form-dialog";
import { EditCollection } from "@/features/collections/edit-collection";
import { SavedOutfitsLayout } from "@/features/collections/saved-outfits-layout";

export const Route = createFileRoute("/_signedIn/_onboarded/_nav/profile/collections/")({
  component: CollectionsPage,
});

// The card has three image slots, and the API sends up to four thumbnails.
const CARD_IMAGE_COUNT = 3;

type Editing = { collection: CollectionSummaryResponse; startWith: "edit" | "delete" };

function CollectionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const collectionsQuery = useQuery(listCollectionsOptions());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);

  const createMutation = useMutation({
    ...createCollectionMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listCollectionsQueryKey() });
      toast.show({ message: "Collection created" });
      setCreating(false);
    },
    onError: () =>
      toast.show({ message: "Couldn't create the collection. Try again.", variant: "error" }),
  });

  function renderCollections() {
    if (collectionsQuery.isPending) {
      return <Spinner />;
    }

    // Checked rather than isError, so a failed background refetch keeps the collections on screen.
    if (collectionsQuery.data === undefined) {
      return (
        <ErrorState
          message="Couldn't load your collections."
          onRetry={() => void collectionsQuery.refetch()}
        />
      );
    }

    const collections = collectionsQuery.data.items;

    if (collections.length === 0) {
      return <EmptyState title="No collections yet" />;
    }

    return (
      <ul className="flex flex-wrap gap-lg">
        {collections.map((collection) => (
          <li key={collection.id}>
            <CollectionCard
              type="collection"
              title={collection.name}
              count={`${collection.outfit_count} ${collection.outfit_count === 1 ? "outfit" : "outfits"}`}
              description={collection.description}
              images={collection.thumbnail_urls.slice(0, CARD_IMAGE_COUNT)}
              onOpen={() =>
                void navigate({
                  to: "/profile/collections/$collectionId",
                  params: { collectionId: collection.id },
                })
              }
              menu={{
                label: `Actions for ${collection.name}`,
                actions: [
                  { label: "Edit", onSelect: () => setEditing({ collection, startWith: "edit" }) },
                  {
                    label: "Delete",
                    onSelect: () => setEditing({ collection, startWith: "delete" }),
                    destructive: true,
                  },
                ],
              }}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <SavedOutfitsLayout
      active="collections"
      actions={
        <Button
          label="New Collection"
          leadingIcon={PlusIcon}
          size="sm"
          onClick={() => setCreating(true)}
        />
      }
    >
      {renderCollections()}
      {creating && (
        <CollectionFormDialog
          title="New collection"
          saving={createMutation.isPending}
          onCancel={() => setCreating(false)}
          onSave={(values) => createMutation.mutate({ body: values })}
        />
      )}
      {editing && (
        <EditCollection
          collection={editing.collection}
          startWith={editing.startWith}
          onClose={() => setEditing(null)}
          onDeleted={() => setEditing(null)}
        />
      )}
    </SavedOutfitsLayout>
  );
}
