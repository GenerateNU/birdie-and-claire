import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { joinClasses } from "@/design-system/utils/join-classes";

// A disabled segment sets data-disabled, which comes after hover in Tailwind's variant order.
const segmentClasses =
  "flex h-xl cursor-pointer items-center justify-center bg-card px-md text-body-s text-primary hover:bg-hover data-[checked]:bg-primary data-[checked]:text-inverse data-[checked]:hover:bg-primary data-[disabled]:cursor-default data-[disabled]:bg-disabled data-[disabled]:text-disabled data-[disabled]:data-[checked]:bg-placeholder data-[disabled]:data-[checked]:text-disabled focus-ring";

type SegmentOption<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  /** Names the group for screen readers. It is not drawn. */
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
};

/** One choice from a short row of options, drawn as joined segments. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onValueChange,
  disabled = false,
  className,
}: SegmentedControlProps<T>) {
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
      aria-label={label}
      className={joinClasses("inline-flex border border-primary bg-card", className)}
    >
      {options.map((option) => (
        <Radio.Root key={option.value} value={option.value} className={segmentClasses}>
          {option.label}
        </Radio.Root>
      ))}
    </BaseRadioGroup>
  );
}
