import { Input as BaseInput } from "@base-ui/react/input";
import { useId, type ComponentProps } from "react";
import { Text } from "@/design-system/primitives/text";
import { joinClasses } from "@/design-system/utils/join-classes";

const inputClasses =
  "rounded-sm border bg-background px-sm py-xs text-body text-primary focus-ring data-[disabled]:opacity-disabled disabled:opacity-disabled";

type SharedProps = {
  label: string;
  // Keeps the label for screen readers only, for fields whose placeholder already says what they hold.
  hideLabel?: boolean;
  value: string;
  onValueChange?: (value: string) => void;
  /** Shown under the field, which is then marked invalid. */
  error?: string;
  className?: string;
};

type SingleLineProps = SharedProps &
  Omit<ComponentProps<"input">, keyof SharedProps | "onChange"> & { multiline?: false };

type MultilineProps = SharedProps &
  Omit<ComponentProps<"textarea">, keyof SharedProps | "onChange"> & { multiline: true };

type TextFieldProps = SingleLineProps | MultilineProps;

export function TextField(props: TextFieldProps) {
  const errorId = useId();
  const labelClasses = "flex flex-col gap-xxs text-body";
  const classes = joinClasses(labelClasses, props.className);

  const labelText = props.hideLabel ? (
    <Text variant="caption" className="sr-only">
      {props.label}
    </Text>
  ) : (
    props.label
  );

  // Added to the caller's aria-describedby, not in place of it.
  let describedBy = props["aria-describedby"];

  if (props.error) {
    describedBy = describedBy ? `${describedBy} ${errorId}` : errorId;
  }

  const errorProps = {
    "aria-invalid": props.error ? true : undefined,
    "aria-describedby": describedBy,
  };

  const errorText = props.error && (
    <Text variant="caption" id={errorId} className="text-error">
      {props.error}
    </Text>
  );

  if (props.multiline) {
    const {
      label: _label,
      hideLabel: _hideLabel,
      value,
      onValueChange,
      multiline: _multiline,
      className: _className,
      error: _error,
      ...textareaProps
    } = props;

    return (
      <label className={classes}>
        {labelText}
        {/* Base UI's Input types its props for an <input>, so the textarea's own attributes, like
            rows, go on the rendered element. Its props win over Input's when both set one, which
            is why errorProps, with the combined aria-describedby, comes last there. */}
        <BaseInput
          render={<textarea {...textareaProps} {...errorProps} />}
          value={value}
          onValueChange={onValueChange}
          className={inputClasses}
        />
        {errorText}
      </label>
    );
  }

  const {
    label: _label,
    hideLabel: _hideLabel,
    multiline: _multiline,
    className: _className,
    error: _error,
    ...inputProps
  } = props;

  return (
    <label className={classes}>
      {labelText}
      <BaseInput {...inputProps} {...errorProps} className={inputClasses} />
      {errorText}
    </label>
  );
}
