import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { useId } from "react";

const radioClasses =
  "flex size-md items-center justify-center rounded-full border bg-background data-[checked]:border-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const dotClasses = "size-xs rounded-full bg-brand-500";

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
  // Dims every option and the group label together.
  const groupClasses = disabled ? "flex flex-col gap-xs opacity-50" : "flex flex-col gap-xs";

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
      className={className ? `${groupClasses} ${className}` : groupClasses}
    >
      {label && <span id={labelId}>{label}</span>}
      {options.map((option) => (
        <label key={option.value} className="inline-flex items-center gap-xs">
          <Radio.Root value={option.value} className={radioClasses}>
            <Radio.Indicator className={dotClasses} />
          </Radio.Root>
          {option.label}
        </label>
      ))}
    </BaseRadioGroup>
  );
}
