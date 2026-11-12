import { Button as BaseButton } from "@base-ui/react/button";

import { textLinkClasses } from "@/design-system/components/links/text-link-classes";

type TextButtonProps = {
  label: string;
  accessibleLabel?: string;
  onClick: () => void;
};

export function TextButton({ label, accessibleLabel, onClick }: TextButtonProps) {
  return (
    <BaseButton
      type="button"
      onClick={onClick}
      aria-label={accessibleLabel}
      className={textLinkClasses}
    >
      {label}
    </BaseButton>
  );
}
