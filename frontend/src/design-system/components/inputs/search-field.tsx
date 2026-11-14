import { Input as BaseInput } from "@base-ui/react/input";
import { XIcon, type Icon } from "@phosphor-icons/react";
import type { KeyboardEvent } from "react";

import { IconButton } from "@/design-system/components/buttons/icon-button";
import { fieldBoxClasses, fieldTextClasses } from "@/design-system/components/inputs/field-classes";
import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

const iconSizes = { md: 16, sm: 12 } as const;

type SearchFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onClick?: () => void;
  maxLength?: number;
  inactive?: boolean;
  disabled?: boolean;
  leadingIcon?: Icon;
  size?: keyof typeof iconSizes;
  /** Bare drops the box, for a search field that sits in a row such as a tab bar. */
  variant?: "boxed" | "bare";
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
  disabled = false,
  leadingIcon: LeadingIcon,
  size = "md",
  variant = "boxed",
  className,
}: SearchFieldProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Enter while an IME is composing confirms the character, not the field.
    if (e.key !== "Enter" || e.nativeEvent.isComposing) {
      return;
    }

    onSubmit();
  }

  const boxClasses = variant === "bare" ? "" : fieldBoxClasses({ disabled, invalid: false });
  const sizedTextClasses = size === "sm" ? `${fieldTextClasses} text-body-s` : fieldTextClasses;
  const textClasses = inactive ? `${sizedTextClasses} text-secondary` : sizedTextClasses;

  return (
    <Box className={joinClasses(`flex h-xxl items-center gap-xs px-sm ${boxClasses}`, className)}>
      {LeadingIcon && (
        <LeadingIcon
          size={iconSizes[size]}
          aria-hidden="true"
          className="shrink-0 text-secondary"
        />
      )}
      <BaseInput
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onValueChange={onValueChange}
        onKeyDown={handleKeyDown}
        onClick={onClick}
        maxLength={maxLength}
        disabled={disabled}
        enterKeyHint="go"
        className={`min-w-0 flex-1 bg-transparent ${textClasses}`}
      />
      {value !== "" && !disabled && !inactive && (
        <IconButton
          icon={XIcon}
          label={`Clear ${label}`}
          variant="ghost"
          size="sm"
          onClick={() => onValueChange("")}
          // Pulls the 32px button into the padding so the x sits where Figma's 16px icon does.
          className="-mr-xs"
        />
      )}
    </Box>
  );
}
