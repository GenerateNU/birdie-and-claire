import { Toast as BaseToast, type ToastObject } from "@base-ui/react/toast";

import { Button } from "../buttons/button";
import { CloseButton } from "../buttons/close-button";

export type ToastVariant = "neutral" | "success";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastData = {
  action?: ToastAction;
};

const rootClasses =
  "flex items-start gap-md rounded-md border bg-background p-md text-primary data-[type=success]:border-success data-[limited]:hidden";

type ToastProps = {
  toast: ToastObject<ToastData>;
};

export function Toast({ toast }: ToastProps) {
  const toastManager = BaseToast.useToastManager();
  const action = toast.data?.action;

  return (
    <BaseToast.Root toast={toast} className={rootClasses}>
      <div className="flex flex-1 flex-col gap-xxs">
        <BaseToast.Title className="text-body" />
        <BaseToast.Description className="text-caption text-secondary" />
      </div>
      {action && (
        <Button
          label={action.label}
          variant="secondary"
          size="sm"
          onClick={() => {
            action.onClick();
            toastManager.close(toast.id);
          }}
        />
      )}
      <BaseToast.Close render={<CloseButton />} />
    </BaseToast.Root>
  );
}
