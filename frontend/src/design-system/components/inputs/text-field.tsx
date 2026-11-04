import { Input as BaseInput } from "@base-ui/react/input";
import { useId, type ComponentProps } from "react";
import { joinClasses } from "@/design-system/utils/join-classes";

const inputClasses =
  "rounded-sm border bg-background px-sm py-xs text-body text-primary focus-ring data-[disabled]:opacity-disabled disabled:opacity-disabled";

type SharedProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
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

  const errorProps = {
    "aria-invalid": props.error ? true : undefined,
    "aria-describedby": props.error ? errorId : undefined,
  };

  const errorText = props.error && (
    <span id={errorId} className="text-caption text-error">
      {props.error}
    </span>
  );

  if (props.multiline) {
    const {
      label,
      onValueChange,
      multiline: _multiline,
      className: _className,
      error: _error,
      ...textareaProps
    } = props;

    return (
      <label className={classes}>
        {label}
        <textarea
          {...textareaProps}
          {...errorProps}
          onChange={(event) => onValueChange(event.target.value)}
          className={inputClasses}
        />
        {errorText}
      </label>
    );
  }

  const {
    label,
    multiline: _multiline,
    className: _className,
    error: _error,
    ...inputProps
  } = props;

  return (
    <label className={classes}>
      {label}
      <BaseInput {...inputProps} {...errorProps} className={inputClasses} />
      {errorText}
    </label>
  );
}
