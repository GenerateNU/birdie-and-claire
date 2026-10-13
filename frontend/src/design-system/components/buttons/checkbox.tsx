import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";

const boxClasses =
  "flex size-md items-center justify-center rounded-xs border bg-background text-caption text-inverse data-[checked]:border-brand-500 data-[checked]:bg-brand-500 focus-ring";

type CheckboxProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function Checkbox({
  label,
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: CheckboxProps) {
  const labelClasses = disabled
    ? "inline-flex items-center gap-xs opacity-50"
    : "inline-flex items-center gap-xs";

  return (
    <label className={className ? `${labelClasses} ${className}` : labelClasses}>
      <BaseCheckbox.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={boxClasses}
      >
        <BaseCheckbox.Indicator aria-hidden="true">✓</BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      {label}
    </label>
  );
}
