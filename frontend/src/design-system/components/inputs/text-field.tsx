import { Field } from "@base-ui/react/field";
import { Input as BaseInput } from "@base-ui/react/input";
import type { Icon } from "@phosphor-icons/react";
import { useId, type ComponentProps } from "react";
import {
  fieldBoxClasses,
  fieldHelperClasses,
  fieldLabelClasses,
  fieldTextClasses,
} from "@/design-system/components/inputs/field-classes";
import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

const iconSize = 16;

type SharedProps = {
  label: string;
  // Keeps the label for screen readers only, for fields whose placeholder already says what they hold.
  hideLabel?: boolean;
  value: string;
  onValueChange?: (value: string) => void;
  /** Shown under the field in place of `helper`, which is then marked invalid. */
  error?: string;
  helper?: string;
  leadingIcon?: Icon;
  trailingIcon?: Icon;
  className?: string;
};

type TextFieldProps = SharedProps & Omit<ComponentProps<"input">, keyof SharedProps | "onChange">;

export function TextField({
  label,
  hideLabel,
  error,
  helper,
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  className,
  disabled = false,
  ...inputProps
}: TextFieldProps) {
  const messageId = useId();
  const message = error ?? helper;
  const state = { disabled, invalid: Boolean(error) };

  // Added to the caller's aria-describedby, not in place of it.
  let describedBy = inputProps["aria-describedby"];

  if (message) {
    describedBy = describedBy ? `${describedBy} ${messageId}` : messageId;
  }

  return (
    <Field.Root disabled={disabled} className={joinClasses("flex flex-col gap-xs", className)}>
      <Field.Label className={hideLabel ? "sr-only" : fieldLabelClasses}>{label}</Field.Label>
      <Box className={`flex h-xxl items-center gap-xs px-sm ${fieldBoxClasses(state)}`}>
        {LeadingIcon && (
          <LeadingIcon size={iconSize} aria-hidden="true" className="shrink-0 text-secondary" />
        )}
        <BaseInput
          {...inputProps}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`min-w-0 flex-1 bg-transparent ${fieldTextClasses}`}
        />
        {TrailingIcon && (
          <TrailingIcon size={iconSize} aria-hidden="true" className="shrink-0 text-secondary" />
        )}
      </Box>
      {message && (
        <Box id={messageId} className={fieldHelperClasses(state)}>
          {message}
        </Box>
      )}
    </Field.Root>
  );
}
