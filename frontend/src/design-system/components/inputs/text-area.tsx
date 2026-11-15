import { Field } from "@base-ui/react/field";
import { Input as BaseInput } from "@base-ui/react/input";
import { useId, type ComponentProps } from "react";
import {
  fieldBoxClasses,
  fieldHelperClasses,
  fieldLabelClasses,
  fieldTextClasses,
} from "@/design-system/components/inputs/field-classes";
import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

type SharedProps = {
  label: string;
  value: string;
  onValueChange?: (value: string) => void;
  /** Shown under the field in place of `helper`, which is then marked invalid. */
  error?: string;
  helper?: string;
  className?: string;
};

type TextAreaProps = SharedProps & Omit<ComponentProps<"textarea">, keyof SharedProps | "onChange">;

/** A multi-line field in a fixed box. With `maxLength`, a count like 12/250 shows under it. */
export function TextArea({
  label,
  value,
  onValueChange,
  error,
  helper,
  className,
  disabled = false,
  maxLength,
  ...textareaProps
}: TextAreaProps) {
  const messageId = useId();
  const message = error ?? helper;
  const state = { disabled, invalid: Boolean(error) };

  // Added to the caller's aria-describedby, not in place of it.
  let describedBy = textareaProps["aria-describedby"];

  if (message) {
    describedBy = describedBy ? `${describedBy} ${messageId}` : messageId;
  }

  return (
    <Field.Root disabled={disabled} className={joinClasses("flex flex-col gap-xs", className)}>
      <Field.Label className={fieldLabelClasses}>{label}</Field.Label>
      {/* Base UI's Input types its props for an <input>, so the textarea's own attributes go on
          the rendered element. Its props win over Input's when both set one, which is why
          aria-describedby, the combined one, is set there. */}
      <BaseInput
        render={
          <textarea
            {...textareaProps}
            maxLength={maxLength}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
          />
        }
        value={value}
        onValueChange={onValueChange}
        className={`h-textarea resize-none p-sm ${fieldBoxClasses(state)} ${fieldTextClasses}`}
      />
      {(message || maxLength !== undefined) && (
        <Box className={`flex justify-between gap-xs ${fieldHelperClasses(state)}`}>
          {message && <Box id={messageId}>{message}</Box>}
          {maxLength !== undefined && (
            <Box className="ml-auto">
              {value.length}/{maxLength}
            </Box>
          )}
        </Box>
      )}
    </Field.Root>
  );
}
