import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentProps } from "react";
import { joinClasses } from "../../utils/join-classes";

const inputClasses =
  "rounded-sm border bg-background px-sm py-xs text-body text-primary focus-ring data-[disabled]:opacity-disabled disabled:opacity-disabled";

type SharedProps = {
  label: string;
  // Keeps the label for screen readers only, for fields whose placeholder already says what they hold.
  hideLabel?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

type SingleLineProps = SharedProps &
  Omit<ComponentProps<"input">, keyof SharedProps | "onChange"> & { multiline?: false };

type MultilineProps = SharedProps &
  Omit<ComponentProps<"textarea">, keyof SharedProps | "onChange"> & { multiline: true };

type TextFieldProps = SingleLineProps | MultilineProps;

export function TextField(props: TextFieldProps) {
  const labelClasses = "flex flex-col gap-xxs text-body";
  const classes = joinClasses(labelClasses, props.className);
  const labelText = props.hideLabel ? <span className="sr-only">{props.label}</span> : props.label;

  if (props.multiline) {
    const {
      label: _label,
      hideLabel: _hideLabel,
      onValueChange,
      multiline: _multiline,
      className: _className,
      ...textareaProps
    } = props;

    return (
      <label className={classes}>
        {labelText}
        <textarea
          {...textareaProps}
          onChange={(event) => onValueChange(event.target.value)}
          className={inputClasses}
        />
      </label>
    );
  }

  const {
    label: _label,
    hideLabel: _hideLabel,
    multiline: _multiline,
    className: _className,
    ...inputProps
  } = props;

  return (
    <label className={classes}>
      {labelText}
      <BaseInput {...inputProps} className={inputClasses} />
    </label>
  );
}
