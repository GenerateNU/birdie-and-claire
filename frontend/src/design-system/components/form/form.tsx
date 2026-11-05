import { Form as BaseForm } from "@base-ui/react/form";
import type { ReactNode } from "react";

type FormProps = {
  /** A TanStack Form instance. Submitting runs its validators, then its onSubmit. */
  form: { handleSubmit: () => Promise<void> };
  className?: string;
  children: ReactNode;
};

export function Form({ form, className, children }: FormProps) {
  return (
    // onFormSubmit makes Base UI prevent the page reload.
    <BaseForm className={className} onFormSubmit={() => void form.handleSubmit()}>
      {children}
    </BaseForm>
  );
}
