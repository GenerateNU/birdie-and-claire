import { Switch } from "@base-ui/react/switch";

const trackClasses =
  "flex h-md w-xl shrink-0 items-center rounded-full bg-gray-300 p-[2px] data-[checked]:bg-brand-500 focus-ring";

const thumbClasses =
  "size-sm rounded-full bg-background transition-transform data-[checked]:translate-x-md";

type ToggleProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/** An on/off switch. Built on Base UI's Switch, not its Toggle (a pressed button). */
export function Toggle({
  label,
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: ToggleProps) {
  const labelClasses = disabled
    ? "inline-flex items-center gap-xs opacity-50"
    : "inline-flex items-center gap-xs";

  return (
    <label className={className ? `${labelClasses} ${className}` : labelClasses}>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={trackClasses}
      >
        <Switch.Thumb className={thumbClasses} />
      </Switch.Root>
      {label}
    </label>
  );
}
