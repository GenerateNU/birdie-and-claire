import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  deleteCollectionMutation,
  getCollectionQueryKey,
  listCollectionsQueryKey,
  updateCollectionMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { Collection } from "@/api/generated/types.gen";
import { Modal, useToast } from "@/design-system";
import { CollectionFormDialog } from "@/features/collections/collection-form-dialog";

type EditCollectionProps = {
  collection: Pick<Collection, "id" | "name" | "description">;
  /** `delete` goes straight to the confirmation, and No then closes instead of showing the form. */
  startWith: "edit" | "delete";
  onClose: () => void;
  onDeleted: () => void;
};

/** The edit form and the delete confirmation that opens over it. Mount it only while it is showing. */
export function EditCollection({ collection, startWith, onClose, onDeleted }: EditCollectionProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(startWith === "delete");

  const updateMutation = useMutation({
    ...updateCollectionMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listCollectionsQueryKey() });
      void queryClient.invalidateQueries({
        queryKey: getCollectionQueryKey({ path: { id: collection.id } }),
      });
      toast.show({ message: "Collection updated" });
      onClose();
    },
    onError: () =>
      toast.show({ message: "Couldn't save the collection. Try again.", variant: "error" }),
  });

  const deleteMutation = useMutation({
    ...deleteCollectionMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listCollectionsQueryKey() });
      // Invalidating would refetch a collection that no longer exists.
      queryClient.removeQueries({
        queryKey: getCollectionQueryKey({ path: { id: collection.id } }),
      });
      toast.show({ message: "Collection deleted" });
      onDeleted();
    },
    onError: () =>
      toast.show({ message: "Couldn't delete the collection. Try again.", variant: "error" }),
  });

  function declineDelete() {
    setConfirmingDelete(false);

    if (startWith === "delete") {
      onClose();
    }
  }

  return (
    <>
      {startWith === "edit" && (
        <CollectionFormDialog
          title="Edit collection"
          savedName={collection.name}
          savedDescription={collection.description}
          saving={updateMutation.isPending}
          onCancel={onClose}
          onSave={(values) => updateMutation.mutate({ path: { id: collection.id }, body: values })}
          onDelete={() => setConfirmingDelete(true)}
        />
      )}
      <Modal
        open={confirmingDelete}
        onClose={declineDelete}
        title="Are you sure?"
        message="Are you sure you want to delete this collection?"
        actions={[
          {
            label: "No",
            variant: "secondary",
            onClick: declineDelete,
            disabled: deleteMutation.isPending,
          },
          {
            label: "Yes",
            variant: "destructive",
            onClick: () => deleteMutation.mutate({ path: { id: collection.id } }),
            loading: deleteMutation.isPending,
          },
        ]}
      />
    </>
  );
}
