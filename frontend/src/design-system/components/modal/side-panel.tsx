import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import { createContext, useContext, type ReactNode } from "react";

import { IconButton } from "@/design-system/components/buttons/icon-button";
import { Scrim } from "@/design-system/components/modal/scrim";
import { Box } from "@/design-system/primitives/box";

/** The element inside an open Modal that a SidePanel draws into, so it covers the modal rather
 * than the page. */
export const ModalOverlayContext = createContext<HTMLElement | null>(null);

type SidePanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Stays under the content while the content scrolls. */
  footer: ReactNode;
};

/** A panel down the right edge with its own scrim. Inside a Modal it covers the modal, elsewhere
 * the page. Esc, a click on the scrim, and the close button all close it. */
export function SidePanel({ open, onClose, title, children, footer }: SidePanelProps) {
  const modalOverlay = useContext(ModalOverlayContext);
  const position = modalOverlay ? "absolute" : "fixed";

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      {/* Undefined, not null: Base UI waits for a null container instead of using the page. */}
      <Dialog.Portal container={modalOverlay ?? undefined}>
        {/* Base UI leaves out a nested dialog's backdrop, and this one dims the modal. */}
        <Dialog.Backdrop forceRender render={<Scrim className={`${position} inset-0`} />} />
        <Dialog.Popup
          className={`${position} inset-y-0 right-0 flex w-side-panel max-w-full flex-col gap-lg border bg-card p-md text-primary`}
        >
          <IconButton
            icon={XIcon}
            label="Close"
            variant="ghost"
            className="absolute left-0 top-sm"
            onClick={onClose}
          />
          <Dialog.Title className="p-xxxs text-center font-serif text-heading-m-italic italic">
            {title}
          </Dialog.Title>
          {/* Padded so a card's ring and hover outline aren't clipped by the scroll box, with the
              negative margin keeping the content on Figma's 16px inset. */}
          <Box className="scrollbar-thin -m-sm min-h-0 flex-1 overflow-y-auto p-sm">{children}</Box>
          <Box className="flex flex-col items-center gap-xs">{footer}</Box>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
