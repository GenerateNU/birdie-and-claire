import { useForm, useStore } from "@tanstack/react-form";
import { z } from "zod";

import { zUpdateOutfitInputBody } from "@/api/generated/zod.gen";
import { Form, Modal, TextArea, TextField } from "@/design-system";
import { sameTags, TagsField, tagsSchema } from "@/features/outfits/tags-field";

// The body's name and description are optional because a PATCH can leave them out; the fields here always send one.
const saveSchema = z.object({
  name: z.string().trim().pipe(zUpdateOutfitInputBody.shape.name.unwrap()),
  description: z.string().trim().pipe(zUpdateOutfitInputBody.shape.description.unwrap()),
  tags: tagsSchema,
});

export type SaveOutfitValues = z.infer<typeof saveSchema>;

type SaveOutfitDialogProps = {
  open: boolean;
  savedName: string;
  savedDescription: string;
  savedTags: string[];
  productsChanged: boolean;
  saving: boolean;
  onCancel: () => void;
  /** MUST be called with the trimmed values, once they have passed validation. */
  onSave: (values: SaveOutfitValues) => void;
};

export function SaveOutfitDialog({
  open,
  savedName,
  savedDescription,
  savedTags,
  productsChanged,
  saving,
  onCancel,
  onSave,
}: SaveOutfitDialogProps) {
  const form = useForm({
    defaultValues: { name: savedName, description: savedDescription, tags: savedTags },
    validators: { onSubmit: saveSchema },
    onSubmit: ({ value }) => {
      const values = {
        name: value.name.trim(),
        description: value.description.trim(),
        tags: value.tags,
      };

      // Enter in a field submits the form even while the Save button is disabled.
      if (!hasChanges(values)) {
        return;
      }

      onSave(values);
    },
  });

  function hasChanges(values: SaveOutfitValues) {
    return (
      productsChanged ||
      values.name !== savedName ||
      values.description !== savedDescription ||
      !sameTags(values.tags, savedTags)
    );
  }

  const typed = useStore(form.store, (state) => state.values);

  const nothingChanged = !hasChanges({
    name: typed.name.trim(),
    description: typed.description.trim(),
    tags: typed.tags,
  });

  function cancel() {
    if (saving) {
      return;
    }

    form.reset();
    onCancel();
  }

  return (
    <Modal
      open={open}
      onClose={cancel}
      title="Save Outfit"
      actions={[
        { label: "Cancel", variant: "ghost", onClick: cancel },
        {
          label: "Confirm",
          variant: "primary",
          onClick: () => void form.handleSubmit(),
          disabled: nothingChanged,
          loading: saving,
        },
      ]}
      dismissible
    >
      <Form form={form}>
        <form.Field name="name">
          {(field) => (
            <TextField
              label="Outfit name"
              required
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
              label="Description (optional)"
              placeholder="What is it for?"
              maxLength={250}
              disabled={saving}
              value={field.state.value}
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.at(0)?.message}
            />
          )}
        </form.Field>
        <form.Field name="tags">
          {(field) => (
            <TagsField
              tags={field.state.value}
              onTagsChange={field.handleChange}
              disabled={saving}
            />
          )}
        </form.Field>
      </Form>
    </Modal>
  );
}
