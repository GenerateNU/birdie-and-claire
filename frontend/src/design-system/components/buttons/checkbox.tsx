import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react";
import { joinClasses } from "@/design-system/utils/join-classes";

const iconSize = 14;

// The label carries `group`, so hovering the text lights up the box too. A disabled box leaves
// group-hover out, because group-hover would win over a data-[disabled] class.
const boxClasses = {
  empty: {
    enabled: "border-primary bg-card group-hover:bg-hover",
    disabled: "border-disabled bg-disabled",
  },
  filled: {
    enabled: "border-transparent bg-primary text-inverse group-hover:bg-primary-hover",
    disabled: "border-transparent bg-placeholder text-disabled",
  },
};

type CheckboxBoxProps = {
  checked: boolean;
  /** Shows a dash instead of a check, for a parent whose children are only partly checked. */
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** The box alone, for a design-system part that lays out its own `group` label around it. */
export function CheckboxBox({
  checked,
  indeterminate = false,
  onCheckedChange,
  disabled = false,
}: CheckboxBoxProps) {
  const boxState =
    boxClasses[checked || indeterminate ? "filled" : "empty"][disabled ? "disabled" : "enabled"];

  const StateIcon = indeterminate ? MinusIcon : CheckIcon;

  return (
    <BaseCheckbox.Root
      checked={checked}
      indeterminate={indeterminate}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={`flex size-control shrink-0 items-center justify-center border focus-ring ${boxState}`}
    >
      <BaseCheckbox.Indicator aria-hidden="true" className="flex">
        <StateIcon size={iconSize} />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}

type CheckboxProps = CheckboxBoxProps & {
  label: string;
  className?: string;
};

export function Checkbox({ label, className, ...boxProps }: CheckboxProps) {
  const labelClasses = boxProps.disabled
    ? "group inline-flex items-center gap-xs text-body-m text-disabled"
    : "group inline-flex items-center gap-xs text-body-m text-primary";

  return (
    <label className={joinClasses(labelClasses, className)}>
      <CheckboxBox {...boxProps} />
      {label}
    </label>
  );
}
