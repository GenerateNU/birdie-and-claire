import { Input as BaseInput } from "@base-ui/react/input";
import type { KeyboardEvent } from "react";
import { joinClasses } from "../../utils/join-classes";

const inputClasses = "w-full rounded-sm border bg-background px-sm py-xs text-body focus-ring";

type SearchFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onClick?: () => void;
  inactive?: boolean;
  className?: string;
};

export function SearchField({
  label,
  placeholder,
  value,
  onValueChange,
  onSubmit,
  onClick,
  inactive = false,
  className,
}: SearchFieldProps) {
  const stateClasses = inactive ? `${inputClasses} text-secondary` : inputClasses;

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Enter while an IME is composing confirms the character, not the field.
    if (e.key !== "Enter" || e.nativeEvent.isComposing) {
      return;
    }

    onSubmit();
  }

  return (
    <BaseInput
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onValueChange={onValueChange}
      onKeyDown={handleKeyDown}
      onClick={onClick}
      enterKeyHint="go"
      className={joinClasses(stateClasses, className)}
    />
  );
}
