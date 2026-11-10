import { Button as BaseButton } from "@base-ui/react/button";

// Matches Link's text variant, for an action that isn't a navigation.
const textButtonClasses = "text-body text-secondary underline hover:text-primary focus-ring";

type TextButtonProps = {
  label: string;
  /** Replaces the visible label as the accessible name, when the label alone is ambiguous. */
  accessibleLabel?: string;
  onClick: () => void;
};

export function TextButton({ label, accessibleLabel, onClick }: TextButtonProps) {
  return (
    <BaseButton
      type="button"
      onClick={onClick}
      aria-label={accessibleLabel}
      className={textButtonClasses}
    >
      {label}
    </BaseButton>
  );
}
