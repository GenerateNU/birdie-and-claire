import { useForm, useStore } from "@tanstack/react-form";
import { z } from "zod";

import { zUpdateOutfitInputBody } from "@/api/generated/zod.gen";
import { Form, Modal, TextField } from "@/design-system";

// The body's name is optional because a PATCH can leave it out; the field here always sends one.
const nameSchema = z.object({
  name: z.string().trim().pipe(zUpdateOutfitInputBody.shape.name.unwrap()),
});

type SaveOutfitDialogProps = {
  open: boolean;
  savedName: string;
  productsChanged: boolean;
  saving: boolean;
  onCancel: () => void;
  /** MUST be called with the trimmed name, once it has passed validation. */
  onSave: (name: string) => void;
};

export function SaveOutfitDialog({
  open,
  savedName,
  productsChanged,
  saving,
  onCancel,
  onSave,
}: SaveOutfitDialogProps) {
  const form = useForm({
    defaultValues: { name: savedName },
    validators: { onSubmit: nameSchema },
    onSubmit: ({ value }) => {
      const name = value.name.trim();

      // Enter in the field submits the form even while the Save button is disabled.
      if (!productsChanged && name === savedName) {
        return;
      }

      onSave(name);
    },
  });

  const typedName = useStore(form.store, (state) => state.values.name);
  const nothingChanged = !productsChanged && typedName.trim() === savedName;

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
      title="Save outfit"
      actions={[
        {
          label: "Save",
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
              label="Name outfit"
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
      </Form>
    </Modal>
  );
}
