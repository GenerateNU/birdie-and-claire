import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";

import { Button } from "../buttons/button";
import { CloseButton } from "../buttons/close-button";
import type { ButtonVariant } from "../buttons/variant";

type DialogAction = {
  label: string;
  onClick: () => void;
  variant: ButtonVariant;
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
  const DialogParts = dismissible ? BaseDialog : AlertDialog;

  return (
    <DialogParts.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogParts.Portal>
        <DialogParts.Backdrop className="fixed inset-0 bg-overlay" />
        <DialogParts.Popup className="fixed left-1/2 top-1/2 flex w-96 max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-md rounded-lg bg-background p-lg text-primary">
          <div className="flex items-start justify-between gap-md">
            <DialogParts.Title className="text-subheading">{title}</DialogParts.Title>
            {dismissible && <DialogParts.Close render={<CloseButton />} />}
          </div>
          {message && (
            <DialogParts.Description className="text-body text-secondary">
              {message}
            </DialogParts.Description>
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
        </DialogParts.Popup>
      </DialogParts.Portal>
    </DialogParts.Root>
  );
}
