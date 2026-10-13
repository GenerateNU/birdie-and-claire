import type { ButtonHTMLAttributes } from "react";

export function CloseButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    // Text × until there's an icon library.
    <button
      type="button"
      aria-label="Close"
      className="rounded-xs px-xxs text-subheading leading-none text-secondary hover:text-primary focus-ring"
      {...props}
    >
      ×
    </button>
  );
}
