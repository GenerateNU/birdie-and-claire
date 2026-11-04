import { X } from "@phosphor-icons/react";
import type { ButtonHTMLAttributes } from "react";

export function CloseButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Close"
      className="rounded-xs px-xxs text-subheading leading-none text-secondary hover:text-primary focus-ring"
      {...props}
    >
      <X aria-hidden="true" />
    </button>
  );
}
