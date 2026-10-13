import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";

import { Button } from "../buttons/button";

type DialogAction = {
  label: string;
  onClick: () => void;
  variant: "primary" | "secondary";
};

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  actions: DialogAction[];
  dismissible?: boolean;
};

export function Dialog({
  open,
  onClose,
  title,
  message,
  actions,
  dismissible = false,
}: DialogProps) {
  const Parts = dismissible ? BaseDialog : AlertDialog;

  return (
    <Parts.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <Parts.Portal>
        <Parts.Backdrop className="fixed inset-0 bg-overlay" />
        <Parts.Popup className="fixed left-1/2 top-1/2 flex w-96 max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-md rounded-lg bg-background p-lg text-primary">
          <div className="flex items-start justify-between gap-md">
            <Parts.Title className="text-subheading">{title}</Parts.Title>
            {dismissible && (
              <BaseDialog.Close
                aria-label="Close"
                className="rounded-xs px-xxs text-subheading leading-none text-secondary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                ×
              </BaseDialog.Close>
            )}
          </div>
          {message && (
            <Parts.Description className="text-body text-secondary">{message}</Parts.Description>
          )}
          <div className="flex justify-end gap-xs">
            {actions.map((action) => (
              <Button
                key={action.label}
                label={action.label}
                variant={action.variant}
                onClick={action.onClick}
              />
            ))}
          </div>
        </Parts.Popup>
      </Parts.Portal>
    </Parts.Root>
  );
}
