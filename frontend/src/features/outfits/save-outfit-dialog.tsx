import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { zUpdateOutfitInputBody } from "@/api/generated/zod.gen";
import { Dialog, Form, TextField } from "@/design-system";

// The body's name is optional because a PATCH can leave it out; the field here always sends one.
const nameSchema = z.object({
  name: z.string().trim().pipe(zUpdateOutfitInputBody.shape.name.unwrap()),
});

type SaveOutfitDialogProps = {
  open: boolean;
  name: string;
  onCancel: () => void;
  /** Called with the trimmed name once it passes validation. */
  onSave: (name: string) => void;
};

export function SaveOutfitDialog({ open, name, onCancel, onSave }: SaveOutfitDialogProps) {
  const form = useForm({
    defaultValues: { name },
    validators: { onSubmit: nameSchema },
    onSubmit: ({ value }) => onSave(value.name.trim()),
  });

  function cancel() {
    form.reset({ name });
    onCancel();
  }

  return (
    <Dialog
      open={open}
      onClose={cancel}
      title="Rename outfit"
      actions={[
        {
          label: "Rename",
          variant: "primary",
          onClick: () => void form.handleSubmit(),
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
              value={field.state.value}
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.at(0)?.message}
            />
          )}
        </form.Field>
      </Form>
    </Dialog>
  );
}
