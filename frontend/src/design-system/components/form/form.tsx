import { Form as BaseForm } from "@base-ui/react/form";
import type { ReactNode } from "react";

type FormProps = {
  /** A TanStack Form instance. Submitting runs its validators, then its onSubmit. */
  form: { handleSubmit: () => Promise<void> };
  className?: string;
  children: ReactNode;
};

/** Base UI checks the browser's own constraints before submitting and cancels the submit without a
 * message when one fails. Leave `required` and `type="email"` off the fields and let the zod
 * schema report them. */
export function Form({ form, className, children }: FormProps) {
  return (
    // onFormSubmit makes Base UI prevent the page reload.
    <BaseForm className={className} onFormSubmit={() => void form.handleSubmit()}>
      {children}
    </BaseForm>
  );
}
