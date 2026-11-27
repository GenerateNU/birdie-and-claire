import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { zCreateCollectionInputBody } from "@/api/generated/zod.gen";
import { Form, Modal, TextArea, TextField } from "@/design-system";

/** A collection's name as a form field: required once trimmed, within the API's limits. */
export const collectionNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name")
  .pipe(zCreateCollectionInputBody.shape.name);

// The body's description is optional because a request can leave it out; the form always sends one.
const collectionSchema = z.object({
  name: collectionNameSchema,
  description: z.string().trim().pipe(zCreateCollectionInputBody.shape.description.unwrap()),
});

export type CollectionFormValues = z.infer<typeof collectionSchema>;

const DESCRIPTION_MAX_LENGTH = 250;

type CollectionFormDialogProps = {
  title: string;
  savedName?: string;
  savedDescription?: string;
  saving: boolean;
  onCancel: () => void;
  /** MUST be called with the trimmed values, once they have passed validation. */
  onSave: (values: CollectionFormValues) => void;
  /** Adds a Delete Collection button at the bottom left. */
  onDelete?: () => void;
};

/** Mount it only while it is showing, so each opening starts from the saved values. */
export function CollectionFormDialog({
  title,
  savedName = "",
  savedDescription = "",
  saving,
  onCancel,
  onSave,
  onDelete,
}: CollectionFormDialogProps) {
  const form = useForm({
    defaultValues: { name: savedName, description: savedDescription },
    validators: { onSubmit: collectionSchema },
    onSubmit: ({ value }) =>
      onSave({ name: value.name.trim(), description: value.description.trim() }),
  });

  function cancel() {
    if (!saving) {
      onCancel();
    }
  }

  return (
    <Modal
      open
      onClose={cancel}
      title={title}
      dismissible
      leadingAction={
        onDelete && {
          label: "Delete Collection",
          variant: "destructive",
          onClick: onDelete,
          disabled: saving,
        }
      }
      actions={[
        { label: "Cancel", variant: "secondary", onClick: cancel, disabled: saving },
        {
          label: "Done",
          variant: "primary",
          onClick: () => void form.handleSubmit(),
          loading: saving,
        },
      ]}
    >
      <Form form={form} className="flex flex-col gap-lg">
        <form.Field name="name">
          {(field) => (
            <TextField
              label="Title"
              // Also stops Enter from submitting a second save.
              disabled={saving}
              value={field.state.value}
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.at(0)?.message}
            />
          )}
        </form.Field>
        <form.Field name="description">
          {(field) => (
            <TextArea
              label="Description"
              maxLength={DESCRIPTION_MAX_LENGTH}
              disabled={saving}
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
