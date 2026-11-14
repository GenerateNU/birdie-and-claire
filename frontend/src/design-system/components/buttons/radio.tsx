import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { useId } from "react";
import {
  dotStateClasses,
  radioStateClasses,
} from "@/design-system/components/buttons/radio-classes";
import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

// The label carries `group`, so hovering the text lights up the radio too.
const radioClasses =
  "flex size-control shrink-0 items-center justify-center rounded-full border data-[checked]:border-medium focus-ring";

type RadioOption<T extends string> = {
  label: string;
  value: T;
};

type RadioGroupProps<T extends string> = {
  label?: string;
  options: RadioOption<T>[];
  value: T | null;
  onValueChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
};

export function RadioGroup<T extends string>({
  label,
  options,
  value,
  onValueChange,
  disabled = false,
  className,
}: RadioGroupProps<T>) {
  const labelId = useId();

  const state = disabled ? "disabled" : "enabled";

  const optionClasses = disabled
    ? "group inline-flex items-center gap-xs text-body-m text-disabled"
    : "group inline-flex items-center gap-xs text-body-m text-primary";

  return (
    <BaseRadioGroup<T | null>
      value={value}
      onValueChange={(next) => {
        // Base UI types the value as T | null to match `value`, but choosing an
        // option always yields one of the options.
        if (next !== null) {
          onValueChange(next);
        }
      }}
      disabled={disabled}
      aria-labelledby={label ? labelId : undefined}
      className={joinClasses("flex flex-col gap-xs", className)}
    >
      {label && (
        <Box
          id={labelId}
          className={disabled ? "text-label-l text-disabled" : "text-label-l text-primary"}
        >
          {label}
        </Box>
      )}
      {options.map((option) => (
        <label key={option.value} className={optionClasses}>
          <Radio.Root
            value={option.value}
            className={`${radioClasses} ${radioStateClasses[state]}`}
          >
            <Radio.Indicator className={`size-xs rounded-full ${dotStateClasses[state]}`} />
          </Radio.Root>
          {option.label}
        </label>
      ))}
    </BaseRadioGroup>
  );
}
