import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ApiError } from "@/api/client";
import { createCurrentUserMutation } from "@/api/generated/@tanstack/react-query.gen";
import type { ErrorModel } from "@/api/generated/types.gen";
import { zCreateUserInputBody } from "@/api/generated/zod.gen";
import { Button, Form, Page, Text, TextField } from "@/design-system";
import { AccountError, requireAccountStatus } from "@/features/account/account";

export const Route = createFileRoute("/_signedIn/create-account")({
  beforeLoad: ({ context }) => requireAccountStatus(context, ["none"]),
  errorComponent: AccountError,
  component: CreateAccount,
});

// Has to stay a full page load. The cached "none" status never expires, so a router navigation
// would send the user straight back here.
function goHome() {
  window.location.assign("/");
}

// 409: the account already exists, which is where this page was headed anyway.
function alreadyCreated(error: ErrorModel | null) {
  return error instanceof ApiError && error.status === 409;
}

function CreateAccount() {
  const createMutation = useMutation({
    ...createCurrentUserMutation(),
    onSuccess: goHome,
    onError: (error) => {
      if (alreadyCreated(error)) {
        goHome();
      }
    },
  });

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onSubmit: zCreateUserInputBody },
    onSubmit: ({ value }) => createMutation.mutate({ body: value }),
  });

  const headingHome = createMutation.isSuccess || alreadyCreated(createMutation.error);
  // Stays on while the reload starts.
  const busy = createMutation.isPending || headingHome;

  return (
    <Page>
      <Text variant="heading" className="mb-xs">
        Create your account
      </Text>
      <Text variant="body" className="mb-xl text-secondary">
        Placeholder form: it only sends a name to create your account.
      </Text>

      <Form form={form} className="flex max-w-content-sm flex-col gap-md">
        <form.Field name="name">
          {(field) => (
            <TextField
              label="Name"
              required
              value={field.state.value}
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.at(0)?.message}
            />
          )}
        </form.Field>
        <Button label="Create account" type="submit" loading={busy} loadingLabel="Creating…" />
        {createMutation.isError && !headingHome && (
          <Text variant="body" className="text-error">
            Couldn't create your account. Try again.
          </Text>
        )}
      </Form>
    </Page>
  );
}
