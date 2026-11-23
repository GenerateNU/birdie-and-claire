import { Menu as BaseMenu } from "@base-ui/react/menu";
import { CaretDownIcon } from "@phosphor-icons/react";
import { Fragment } from "react";

import { buttonClasses, buttonIconSize } from "@/design-system/components/buttons/variant";
import { Divider } from "@/design-system/primitives/divider";

type FilterMenuOption = {
  value: string;
  label: string;
};

type FilterMenuProps = {
  label: string;
  options: FilterMenuOption[];
  /** The selected option's value, or null when the filter is off. Not undefined: Base UI reads an
   * undefined value as uncontrolled, and the menu would keep showing the last pick as selected. */
  value: string | null;
  /** Gets null when the selected option is picked again, which is how Figma turns the filter off. */
  onValueChange: (value: string | null) => void;
  disabled?: boolean;
};

// Figma: the dropdown opens 4px below the button.
const MENU_OFFSET_PX = 4;

/** A primary button that opens a dark list of options below it, right-aligned. One can be picked at a time. */
export function FilterMenu({
  label,
  options,
  value,
  onValueChange,
  disabled = false,
}: FilterMenuProps) {
  return (
    <BaseMenu.Root modal={false}>
      <BaseMenu.Trigger disabled={disabled} className={buttonClasses("primary", "md")}>
        {label}
        <CaretDownIcon size={buttonIconSize.md} aria-hidden="true" />
      </BaseMenu.Trigger>
      <BaseMenu.Portal>
        <BaseMenu.Positioner side="bottom" align="end" sideOffset={MENU_OFFSET_PX} className="z-50">
          {/* Figma's Filter Dropdown is 238px wide with 10px padding and gaps; no tokens match. */}
          <BaseMenu.Popup className="flex w-[238px] flex-col gap-[10px] bg-primary p-[10px] focus:outline-none">
            <BaseMenu.RadioGroup value={value} className="contents">
              {options.map((option, index) => (
                <Fragment key={option.value}>
                  {index > 0 && <Divider />}
                  <BaseMenu.RadioItem
                    value={option.value}
                    // Not onValueChange: a radio group doesn't report a click on the selected item.
                    onClick={() => onValueChange(option.value === value ? null : option.value)}
                    closeOnClick
                    className="cursor-pointer break-words text-body-s text-inverse data-[checked]:font-bold data-[highlighted]:underline focus:outline-none"
                  >
                    {option.label}
                  </BaseMenu.RadioItem>
                </Fragment>
              ))}
            </BaseMenu.RadioGroup>
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
