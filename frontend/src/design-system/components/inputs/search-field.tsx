import { Input as BaseInput } from "@base-ui/react/input";
import type { Icon } from "@phosphor-icons/react";
import type { KeyboardEvent } from "react";

import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

const inputClasses = "w-full rounded-sm border bg-background px-sm py-xs focus-ring";

// sm is the Figma field with 13px text and a 12px leading icon.
const sizeClasses = {
  md: { text: "text-body", iconPadding: "pl-xxxl", icon: "size-lg" },
  sm: { text: "text-body-s", iconPadding: "pl-xxl", icon: "size-sm" },
} as const;

type SearchFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onClick?: () => void;
  maxLength?: number;
  inactive?: boolean;
  leadingIcon?: Icon;
  size?: keyof typeof sizeClasses;
  className?: string;
};

export function SearchField({
  label,
  placeholder,
  value,
  onValueChange,
  onSubmit,
  onClick,
  maxLength,
  inactive = false,
  leadingIcon: LeadingIcon,
  size = "md",
  className,
}: SearchFieldProps) {
  const { text, iconPadding, icon } = sizeClasses[size];
  const sizedClasses = `${inputClasses} ${text}`;
  const stateClasses = inactive ? `${sizedClasses} text-secondary` : sizedClasses;

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Enter while an IME is composing confirms the character, not the field.
    if (e.key !== "Enter" || e.nativeEvent.isComposing) {
      return;
    }

    onSubmit();
  }

  const input = (
    <BaseInput
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onValueChange={onValueChange}
      onKeyDown={handleKeyDown}
      onClick={onClick}
      maxLength={maxLength}
      enterKeyHint="go"
      className={
        LeadingIcon ? `${stateClasses} ${iconPadding}` : joinClasses(stateClasses, className)
      }
    />
  );

  if (!LeadingIcon) {
    return input;
  }

  return (
    <Box className={joinClasses("relative", className)}>
      <LeadingIcon
        aria-hidden="true"
        className={`pointer-events-none absolute left-sm top-1/2 ${icon} -translate-y-1/2 text-secondary`}
      />
      {input}
    </Box>
  );
}
