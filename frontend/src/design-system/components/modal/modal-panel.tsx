import { XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Button } from "@/design-system/components/buttons/button";
import { IconButton } from "@/design-system/components/buttons/icon-button";
import type { ButtonVariant } from "@/design-system/components/buttons/variant";
import { CardImage } from "@/design-system/components/cards/card-image";
import { Box } from "@/design-system/primitives/box";

export type ModalAction = {
  label: string;
  onClick: () => void;
  variant: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
};

export type ModalSize = "sm" | "md" | "lg";

const modalWidthClasses = {
  sm: "w-modal-sm",
  md: "w-modal-md",
  lg: "w-modal-lg",
} as const;

function ModalImage({ image }: { image: string | null }) {
  if (image === null) {
    return <Box className="w-modal-image shrink-0 bg-surface" />;
  }

  return <CardImage src={image} className="w-modal-image shrink-0" />;
}

type ModalPanelProps = {
  title: string;
  message?: string;
  /** Content between the message and the actions, for a modal that shows more than text. */
  children?: ReactNode;
  actions: ModalAction[];
  size?: ModalSize;
  /** Shows the close button. */
  onClose?: () => void;
  /** Makes it a split modal: a photo beside the content, or the surface color for `null`. A split
   * modal is always the large width. */
  image?: string | null;
  titleId?: string;
  messageId?: string;
};

/** The modal itself, without the scrim or the portal, so it can also sit in the page. */
export function ModalPanel({
  title,
  message,
  children,
  actions,
  size = "sm",
  onClose,
  image,
  titleId,
  messageId,
}: ModalPanelProps) {
  const widthClasses = modalWidthClasses[image === undefined ? size : "lg"];

  return (
    <Box className={`${widthClasses} flex max-w-full bg-card text-primary shadow-modal`}>
      {image !== undefined && <ModalImage image={image} />}
      <Box className="flex min-w-0 flex-1 flex-col">
        <Box className="flex items-center gap-md border-b px-xl py-lg">
          <h2 id={titleId} className="flex-1 break-words font-serif text-heading-m">
            {title}
          </h2>
          {onClose && (
            <IconButton icon={XIcon} label="Close" variant="ghost" size="sm" onClick={onClose} />
          )}
        </Box>
        <Box className="flex flex-col gap-lg px-xl py-lg">
          {message && (
            <p id={messageId} className="text-body-m text-secondary">
              {message}
            </p>
          )}
          {children}
        </Box>
        {actions.length > 0 && (
          <Box className="flex items-center justify-end gap-sm px-xl pb-lg">
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
        )}
      </Box>
    </Box>
  );
}
