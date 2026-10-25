import { Switch } from "@base-ui/react/switch";
import { joinClasses } from "../../utils/join-classes";

const trackClasses =
  "flex h-md w-xl shrink-0 items-center rounded-full bg-control-off p-xxxs data-[checked]:bg-primary focus-ring";

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
    ? "inline-flex items-center gap-xs opacity-disabled"
    : "inline-flex items-center gap-xs";

  return (
    <label className={joinClasses(labelClasses, className)}>
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
