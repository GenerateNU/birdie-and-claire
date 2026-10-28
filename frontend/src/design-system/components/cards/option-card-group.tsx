import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { useId } from "react";

import { cardFrameClasses } from "./card-classes";

const defaultGridClasses = "grid grid-cols-2 gap-md md:grid-cols-4";

const optionCardClasses = `${cardFrameClasses} flex cursor-pointer items-center justify-center p-lg text-body focus-ring data-[checked]:border-primary`;

type OptionCardOption<T extends string> = {
  label: string;
  value: T;
};

type OptionCardGroupProps<T extends string> = {
  label?: string;
  options: OptionCardOption<T>[];
  value: T | null;
  onValueChange: (value: T) => void;
  className?: string;
};

/** A single choice drawn as a grid of cards. `className` replaces the grid's layout classes
 * rather than adding to them, since two grid-cols classes would both apply. */
export function OptionCardGroup<T extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
}: OptionCardGroupProps<T>) {
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
      className="flex flex-col gap-xs"
    >
      {label && <span id={labelId}>{label}</span>}
      <div className={className ?? defaultGridClasses}>
        {options.map((option) => (
          <Radio.Root key={option.value} value={option.value} className={optionCardClasses}>
            {option.label}
          </Radio.Root>
        ))}
      </div>
    </BaseRadioGroup>
  );
}
