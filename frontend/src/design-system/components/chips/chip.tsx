import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import type { Icon } from "@phosphor-icons/react";
import { joinClasses } from "@/design-system/utils/join-classes";

// A disabled chip sets data-disabled, which comes after hover in Tailwind's variant order.
const chipClasses =
  "inline-flex items-center gap-xxs bg-placeholder text-body-s text-primary hover:bg-pressed data-[pressed]:bg-primary data-[pressed]:text-inverse data-[pressed]:hover:bg-primary data-[disabled]:bg-disabled data-[disabled]:text-disabled focus-ring";

const sizes = {
  md: { classes: "h-xl px-sm", iconSize: 14 },
  sm: { classes: "h-lg px-xs", iconSize: 12 },
} as const;

type ChipProps = {
  label: string;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  size?: keyof typeof sizes;
  leadingIcon?: Icon;
  /** Decorative, such as the × on a removable chip. The chip itself is the one button. */
  trailingIcon?: Icon;
  disabled?: boolean;
  className?: string;
};

/** A square toggle for filters, tags, and quick choices. */
export function Chip({
  label,
  selected,
  onSelectedChange,
  size = "md",
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  disabled = false,
  className,
}: ChipProps) {
  const { classes, iconSize } = sizes[size];

  return (
    <BaseToggle
      pressed={selected}
      onPressedChange={onSelectedChange}
      disabled={disabled}
      className={joinClasses(`${chipClasses} ${classes}`, className)}
    >
      {LeadingIcon && <LeadingIcon size={iconSize} aria-hidden="true" />}
      {label}
      {TrailingIcon && <TrailingIcon size={iconSize} aria-hidden="true" />}
    </BaseToggle>
  );
}
