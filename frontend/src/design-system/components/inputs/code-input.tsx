import { Input as BaseInput } from "@base-ui/react/input";
import { useState, type Ref } from "react";

import { Box } from "@/design-system/primitives/box";

// Boxes shrink to share the row, so a long code still fits a phone, and stop growing at 48px.
const boxBaseClasses =
  "flex aspect-square min-w-0 max-w-xxl flex-1 items-center justify-center rounded-xs border bg-background text-body text-primary";

type CodeInputProps = {
  ref?: Ref<HTMLInputElement>;
  label: string;
  length: number;
  value: string;
  onValueChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
};

/** A one-time code drawn as one box per digit. A single real input sits over the boxes,
 * so paste, autofill, and backspace work as they do in any text field. */
export function CodeInput({
  ref,
  label,
  length,
  value,
  onValueChange,
  invalid = false,
  disabled = false,
}: CodeInputProps) {
  const [focused, setFocused] = useState(false);
  // The box the next digit goes in, or the last box once every box is filled.
  const activeIndex = Math.min(value.length, length - 1);

  function boxClasses(index: number) {
    if (invalid) {
      return `${boxBaseClasses} border-error`;
    }

    if (focused && index === activeIndex) {
      return `${boxBaseClasses} border-primary`;
    }

    return boxBaseClasses;
  }

  return (
    <Box
      className={
        disabled
          ? "relative flex w-full justify-center gap-xs opacity-disabled"
          : "relative flex w-full justify-center gap-xs"
      }
    >
      {Array.from({ length }, (_, index) => (
        <Box key={index} aria-hidden="true" className={boxClasses(index)}>
          {value[index] ?? ""}
        </Box>
      ))}
      <BaseInput
        ref={ref}
        aria-label={label}
        aria-invalid={invalid}
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        // Paste and autofill can bring spaces or dashes, and the boxes show digits only. No maxLength:
        // the browser would cut a pasted "123 456" before the spaces are dropped.
        onValueChange={(next: string) => onValueChange(next.replace(/\D/g, "").slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        // Transparent rather than hidden, so the browser still offers autofill and a tap focuses it.
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none"
      />
    </Box>
  );
}
