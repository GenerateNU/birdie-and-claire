import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import type { Icon } from "@phosphor-icons/react";
import { useId } from "react";
import { TileIconSize } from "@/design-system/tokens/layout";
import { Box } from "@/design-system/primitives/box";

// Hover is left off a disabled tile, since no class resets the border color to its default.
const tileClasses =
  "group flex h-tile w-tile flex-col items-center justify-center gap-xs border bg-card p-md text-center text-primary data-[checked]:border-thick data-[checked]:border-primary data-[disabled]:bg-disabled data-[disabled]:text-disabled focus-ring";

type OptionTileOption<T extends string> = {
  label: string;
  subtitle?: string;
  icon?: Icon;
  value: T;
  disabled?: boolean;
};

type OptionTileGroupProps<T extends string> = {
  label?: string;
  options: OptionTileOption<T>[];
  value: T | null;
  onValueChange: (value: T) => void;
};

/** A single choice drawn as a wrapping row of tiles, each with an optional icon and subtitle. */
export function OptionTileGroup<T extends string>({
  label,
  options,
  value,
  onValueChange,
}: OptionTileGroupProps<T>) {
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
      {label && (
        <Box id={labelId} className="text-label-l text-primary">
          {label}
        </Box>
      )}
      <Box className="flex flex-wrap gap-md">
        {options.map(({ icon: TileIcon, ...option }) => (
          <Radio.Root
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={`${tileClasses} ${option.disabled ? "" : "cursor-pointer hover:border-primary"}`}
          >
            {/* Figma puts 20px between the icon and the title: this 12 plus the 8px gap. */}
            {TileIcon && <TileIcon size={TileIconSize} aria-hidden="true" className="mb-sm" />}
            <Box className="text-label-m uppercase">{option.label}</Box>
            {option.subtitle && (
              <Box className="text-body-s text-secondary group-data-[disabled]:text-disabled">
                {option.subtitle}
              </Box>
            )}
          </Radio.Root>
        ))}
      </Box>
    </BaseRadioGroup>
  );
}
