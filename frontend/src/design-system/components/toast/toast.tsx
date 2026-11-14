import { CheckIcon, XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

export type ToastVariant = "neutral" | "success" | "error";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

const variantClasses = {
  neutral: "bg-primary",
  success: "bg-primary",
  error: "bg-error",
} as const;

const variantIcons = {
  neutral: null,
  success: CheckIcon,
  error: XIcon,
} as const;

type ToastProps = {
  variant: ToastVariant;
  message: ReactNode;
  action?: ToastAction;
  /** Shows the close button. */
  onClose?: () => void;
  className?: string;
};

/** The toast itself, without the timer or the stack it sits in, so it can also sit in the page. */
export function Toast({ variant, message, action, onClose, className }: ToastProps) {
  const VariantIcon = variantIcons[variant];

  return (
    <Box
      className={joinClasses(
        `${variantClasses[variant]} flex min-h-xxxl max-w-content-md items-center gap-sm py-xs pl-md pr-sm text-inverse shadow-toast`,
        className,
      )}
    >
      {VariantIcon && <VariantIcon size={16} aria-hidden="true" />}
      <span className="text-label-l">{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="whitespace-nowrap text-label-m uppercase hover:underline focus-ring focus-visible:outline-focus-inverse"
        >
          {action.label}
        </button>
      )}
      {onClose && (
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="focus-ring focus-visible:outline-focus-inverse"
        >
          <XIcon size={16} aria-hidden="true" />
        </button>
      )}
    </Box>
  );
}
