import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";

import { Button } from "@/design-system/components/buttons/button";
import { CloseButton } from "@/design-system/components/buttons/close-button";
import type { ButtonVariant } from "@/design-system/components/buttons/variant";
import { Box } from "@/design-system/primitives/box";

type DialogAction = {
  label: string;
  onClick: () => void;
  variant: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
};

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  /** Goes between the message and the actions, such as a form field. */
  children?: ReactNode;
  actions: DialogAction[];
  dismissible?: boolean;
};

export function Dialog({
  open,
  onClose,
  title,
  message,
  children,
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
        <DialogParts.Popup className="fixed left-1/2 top-1/2 flex w-popup max-w-[calc(100vw-theme(spacing.md)*2)] -translate-x-1/2 -translate-y-1/2 flex-col gap-md rounded-lg bg-background p-lg text-primary">
          <Box className="flex items-start justify-between gap-md">
            <DialogParts.Title className="text-subheading">{title}</DialogParts.Title>
            {dismissible && <DialogParts.Close render={<CloseButton />} />}
          </Box>
          {message && (
            <DialogParts.Description className="text-body text-secondary">
              {message}
            </DialogParts.Description>
          )}
          {children}
          <Box className="flex justify-end gap-xs">
            {actions.map((action) => (
              <Button
                key={action.label}
                label={action.label}
                variant={action.variant}
                onClick={action.onClick}
                disabled={action.disabled}
                loading={action.loading}
              />
            ))}
          </Box>
        </DialogParts.Popup>
      </DialogParts.Portal>
    </DialogParts.Root>
  );
}
