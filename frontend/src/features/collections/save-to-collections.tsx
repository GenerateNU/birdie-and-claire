import { useForm } from "@tanstack/react-form";
import { type MutationFunctionContext, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { z } from "zod";

import {
  addCollectionOutfitMutation,
  listCollectionOutfitsInfiniteQueryKey,
  listCollectionsInfiniteOptions,
  listCollectionsQueryKey,
  listOutfitsInfiniteQueryKey,
  removeCollectionOutfitMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import {
  CheckboxList,
  ErrorState,
  Form,
  LoadMoreSentinel,
  Modal,
  Spinner,
  Text,
  TextField,
} from "@/design-system";
import { collectionNameSchema } from "@/features/collections/collection-form-dialog";
import { useCreateCollection } from "@/features/collections/use-create-collection";
import { canFetchNextPage } from "@/features/outfits/saved-outfits";
import { usePagination } from "@/lib/use-pagination";

type CollectionChange = { collectionId: string; checked: boolean };

type SaveToCollectionsProps = {
  outfitId: string;
  onClose: () => void;
};

/**
 * The "Save outfit to" picker. Checking and unchecking only marks the boxes; Done sends one add or
 * remove per changed box. Mount it only while it is showing, so each opening starts from what's saved.
 */
export function SaveToCollections({ outfitId, onClose }: SaveToCollectionsProps) {
  const queryClient = useQueryClient();

  const collectionsQuery = usePagination(
    listCollectionsInfiniteOptions({ query: { outfit_id: outfitId } }),
  );

  const { fetchNextPage, isFetchingNextPage, isFetchNextPageError } = collectionsQuery;

  // How the user left each box they touched, by collection ID, so the rest keep following what's
  // saved. A box ticked and unticked again is here too, matching what's saved.
  const [userChecks, setUserChecks] = useState<Record<string, boolean>>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const addOptions = addCollectionOutfitMutation();
  const removeOptions = removeCollectionOutfitMutation();

  const saveMutation = useMutation({
    mutationFn: async (changes: CollectionChange[], context: MutationFunctionContext) => {
      const results = await Promise.allSettled(
        changes.map(({ collectionId, checked }) => {
          const variables = { path: { id: collectionId, outfit_id: outfitId } };

          return checked
            ? addOptions.mutationFn?.(variables, context)
            : removeOptions.mutationFn?.(variables, context);
        }),
      );

      if (results.some((result) => result.status === "rejected")) {
        throw new Error("Some collection changes failed");
      }
    },
    onSettled: (_data, _error, changes) => {
      for (const { collectionId } of changes) {
        void queryClient.invalidateQueries({
          queryKey: listCollectionOutfitsInfiniteQueryKey({ path: { id: collectionId } }),
        });
        void queryClient.invalidateQueries({
          queryKey: listOutfitsInfiniteQueryKey({ query: { collection_id: collectionId } }),
        });
      }

      // Returned, so the save stays pending until the picker's boxes show what really saved.
      return queryClient.invalidateQueries({ queryKey: listCollectionsQueryKey() });
    },
  });

  const loadMore = useCallback(() => {
    if (canFetchNextPage({ isFetchingNextPage, isFetchNextPageError })) {
      void fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage, isFetchNextPageError]);

  if (createDialogOpen) {
    return (
      <CreateCollectionDialog
        onBack={() => setCreateDialogOpen(false)}
        onCreated={(collectionId) => {
          setUserChecks((current) => ({ ...current, [collectionId]: true }));
          setCreateDialogOpen(false);
        }}
      />
    );
  }

  const collections = collectionsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const savedCollectionIds = new Set(
    collections
      .filter((collection) => collection.contains_outfit === true)
      .map((collection) => collection.id),
  );

  // From the boxes touched rather than the list, so one made with Create New still saves when the
  // list failed to refresh after it and doesn't show it.
  const unsavedChanges = Object.entries(userChecks)
    .filter(([collectionId, checked]) => checked !== savedCollectionIds.has(collectionId))
    .map(([collectionId, checked]) => ({ collectionId, checked }));

  function save() {
    if (unsavedChanges.length === 0) {
      onClose();

      return;
    }

    saveMutation.mutate(unsavedChanges, {
      onSuccess: onClose,
      onError: () => setUserChecks({}),
    });
  }

  function close() {
    if (!saveMutation.isPending) {
      onClose();
    }
  }

  function renderCollections() {
    if (collectionsQuery.isPending) {
      return <Spinner />;
    }

    // Checked rather than isError, so a failed background refetch keeps the boxes on screen.
    if (collectionsQuery.data === undefined) {
      return (
        <ErrorState
          message="Couldn't load your collections."
          onRetry={() => void collectionsQuery.refetch()}
        />
      );
    }

    if (collections.length === 0) {
      return <Text variant="body">No collections yet</Text>;
    }

    return (
      <>
        <CheckboxList
          label="Collections"
          items={collections.map((collection) => ({
            value: collection.id,
            label: `${collection.name} (${collection.outfit_count})`,
            checked: userChecks[collection.id] ?? collection.contains_outfit === true,
          }))}
          onCheckedChange={(collectionId, checked) =>
            setUserChecks((current) => ({ ...current, [collectionId]: checked }))
          }
          // A box changed now would be left out of the save that's running.
          disabled={saveMutation.isPending}
        />
        {collectionsQuery.hasNextPage && <LoadMoreSentinel as="div" onVisible={loadMore} />}
        {isFetchNextPageError && (
          <ErrorState
            message="Couldn't load more collections."
            onRetry={() => void fetchNextPage()}
            retryLabel="Retry"
          />
        )}
      </>
    );
  }

  return (
    <Modal
      open
      onClose={close}
      title="Save outfit to"
      subtitle="Add this look to a collection, or start a new one"
      dismissible
      leadingAction={{
        label: "Create New",
        variant: "secondary",
        onClick: () => setCreateDialogOpen(true),
        disabled: saveMutation.isPending,
      }}
      actions={[
        {
          label: "Done",
          variant: "primary",
          onClick: save,
          loading: saveMutation.isPending,
          disabled: collectionsQuery.data === undefined,
        },
      ]}
    >
      {saveMutation.isError && (
        <ErrorState message="Couldn't save all your changes. Check the boxes and press Done again." />
      )}
      {renderCollections()}
    </Modal>
  );
}

// The body's description is optional, and this dialog only asks for the name.
const createCollectionSchema = z.object({ name: collectionNameSchema });

type CreateCollectionDialogProps = {
  onBack: () => void;
  onCreated: (collectionId: string) => void;
};

/**
 * The picker's own create box, title only as Figma draws it. The Collections page creates with
 * CollectionFormDialog, which also asks for a description; both share the name rule and the request.
 */
function CreateCollectionDialog({ onBack, onCreated }: CreateCollectionDialogProps) {
  const createMutation = useCreateCollection();

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onSubmit: createCollectionSchema },
    onSubmit: ({ value }) =>
      createMutation.mutate(
        { body: { name: value.name.trim() } },
        { onSuccess: (collection) => onCreated(collection.id) },
      ),
  });

  function back() {
    if (!createMutation.isPending) {
      onBack();
    }
  }

  return (
    <Modal
      open
      onClose={back}
      title="Create New Collection"
      subtitle="Give your collection a name"
      dismissible
      actions={[
        {
          label: "Done",
          variant: "primary",
          onClick: () => void form.handleSubmit(),
          loading: createMutation.isPending,
        },
      ]}
    >
      <Form form={form}>
        <form.Field name="name">
          {(field) => (
            <TextField
              label="Title"
              placeholder="Casual weekend"
              // Also stops Enter from submitting a second create.
              disabled={createMutation.isPending}
              value={field.state.value}
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.at(0)?.message}
            />
          )}
        </form.Field>
      </Form>
    </Modal>
  );
}
