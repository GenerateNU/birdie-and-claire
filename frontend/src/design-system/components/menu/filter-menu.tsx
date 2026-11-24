import { Menu as BaseMenu } from "@base-ui/react/menu";
import { CaretDownIcon } from "@phosphor-icons/react";
import { Fragment } from "react";

import { buttonClasses, buttonIconSize } from "@/design-system/components/buttons/variant";
import { LoadMoreSentinel } from "@/design-system/components/status/load-more-sentinel";
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
  /** Called when the last option scrolls into view. Leave it out once every option is loaded. */
  onLoadMore?: () => void;
  /** Set when loading more options failed. The list then ends with a row that calls it. */
  onRetryLoadMore?: () => void;
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
  onLoadMore,
  onRetryLoadMore,
}: FilterMenuProps) {
  return (
    <BaseMenu.Root modal={false}>
      <BaseMenu.Trigger disabled={disabled} className={buttonClasses("primary", "md")}>
        {label}
        <CaretDownIcon size={buttonIconSize.md} aria-hidden="true" />
      </BaseMenu.Trigger>
      <BaseMenu.Portal>
        <BaseMenu.Positioner side="bottom" align="end" sideOffset={MENU_OFFSET_PX} className="z-50">
          {/* Figma's Filter Dropdown is 238px wide with 10px padding and gaps; no tokens match. Base
              UI sets --available-height to the room below the button, so a long list scrolls. */}
          <BaseMenu.Popup className="scrollbar-thin flex max-h-[var(--available-height)] w-[238px] flex-col gap-[10px] overflow-y-auto bg-primary p-[10px] focus:outline-none">
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
            {onLoadMore && <LoadMoreSentinel as="div" onVisible={onLoadMore} />}
            {onRetryLoadMore && (
              <BaseMenu.Item
                onClick={onRetryLoadMore}
                closeOnClick={false}
                className="cursor-pointer text-body-s text-inverse data-[highlighted]:underline focus:outline-none"
              >
                Couldn't load more. Try again
              </BaseMenu.Item>
            )}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
