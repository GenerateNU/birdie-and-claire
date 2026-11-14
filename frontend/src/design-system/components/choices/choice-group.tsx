import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { useId } from "react";
import {
  dotStateClasses,
  radioStateClasses,
} from "@/design-system/components/buttons/radio-classes";
import { Box } from "@/design-system/primitives/box";

// The row carries `group`, so its radio follows the row's hover and checked state. A disabled row
// leaves hover out: no class resets the border color to its default, and group-hover would win
// over a data-[disabled] class.
const rowClasses =
  "group flex min-h-choice-row w-full items-center gap-sm border px-md py-sm text-left data-[checked]:border-medium data-[checked]:border-primary data-[checked]:bg-surface focus-ring";

const rowStateClasses = {
  enabled: "cursor-pointer bg-card text-primary hover:border-primary",
  disabled: "bg-disabled text-disabled",
};

const radioClasses =
  "flex size-control shrink-0 items-center justify-center rounded-full border group-data-[checked]:border-medium";

type ChoiceOption<T extends string> = {
  label: string;
  subtitle?: string;
  value: T;
  disabled?: boolean;
};

type ChoiceGroupProps<T extends string> = {
  label?: string;
  options: ChoiceOption<T>[];
  value: T | null;
  onValueChange: (value: T) => void;
};

/** A single choice drawn as stacked full-width rows, for short questions like Yes or No. */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onValueChange,
}: ChoiceGroupProps<T>) {
  const labelId = useId();

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
      aria-labelledby={label ? labelId : undefined}
      className="flex flex-col gap-sm"
    >
      {label && (
        <Box id={labelId} className="text-label-l text-primary">
          {label}
        </Box>
      )}
      {options.map((option) => {
        const state = option.disabled ? "disabled" : "enabled";

        return (
          <Radio.Root
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={`${rowClasses} ${rowStateClasses[state]}`}
          >
            <Box className="flex min-w-0 flex-1 flex-col gap-xxs">
              <Box className="text-label-m uppercase">{option.label}</Box>
              {option.subtitle && (
                <Box className="text-body-s text-secondary group-data-[disabled]:text-disabled">
                  {option.subtitle}
                </Box>
              )}
            </Box>
            <Box aria-hidden="true" className={`${radioClasses} ${radioStateClasses[state]}`}>
              <Radio.Indicator className={`size-xs rounded-full ${dotStateClasses[state]}`} />
            </Box>
          </Radio.Root>
        );
      })}
    </BaseRadioGroup>
  );
}
