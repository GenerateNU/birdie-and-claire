import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import { useId, useState, type ReactNode } from "react";

import {
  ModalPanel,
  type ModalAction,
  type ModalSize,
} from "@/design-system/components/modal/modal-panel";
import { Scrim } from "@/design-system/components/modal/scrim";
import { ModalOverlayContext } from "@/design-system/components/modal/side-panel";
import { Box } from "@/design-system/primitives/box";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  message?: string;
  actions: ModalAction[];
  /** Lets a click outside, Esc, and a close button dismiss it. Without it, only an action closes. */
  dismissible?: boolean;
  size?: ModalSize;
  /** Makes it a split modal. See ModalPanel. */
  image?: string | null;
  children?: ReactNode;
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  message,
  actions,
  dismissible = false,
  size,
  image,
  children,
}: ModalProps) {
  const titleId = useId();
  const messageId = useId();
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);
  // AlertDialog ignores outside clicks and Esc, which is what a non-dismissible modal needs.
  const ModalParts = dismissible ? Dialog : AlertDialog;

  return (
    <ModalParts.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <ModalParts.Portal>
        <ModalParts.Backdrop
          render={
            <Scrim className="fixed inset-0 motion-safe:transition-opacity motion-safe:data-[starting-style]:opacity-0 motion-safe:data-[ending-style]:opacity-0" />
          }
        />
        <ModalParts.Popup
          aria-labelledby={titleId}
          aria-describedby={message ? messageId : undefined}
          // Keeps a modal larger than the screen inside it, scrolling instead of cutting off the actions.
          className="fixed left-1/2 top-1/2 max-h-[calc(100vh-theme(spacing.md)*2)] max-w-[calc(100vw-theme(spacing.md)*2)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto motion-safe:transition-opacity motion-safe:data-[starting-style]:opacity-0 motion-safe:data-[ending-style]:opacity-0"
        >
          <ModalPanel
            title={title}
            subtitle={subtitle}
            message={message}
            actions={actions}
            size={size}
            image={image}
            onClose={dismissible ? onClose : undefined}
            titleId={titleId}
            messageId={messageId}
          >
            <ModalOverlayContext.Provider value={overlay}>{children}</ModalOverlayContext.Provider>
          </ModalPanel>
          {/* Lays out nothing itself, so what a SidePanel portals in is positioned against the
              popup and covers the whole modal. */}
          <Box ref={setOverlay} className="contents" />
        </ModalParts.Popup>
      </ModalParts.Portal>
    </ModalParts.Root>
  );
}
