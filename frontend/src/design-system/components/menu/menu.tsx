import { Menu as BaseMenu } from "@base-ui/react/menu";
import { DotsThreeIcon, type Icon } from "@phosphor-icons/react";
import { Fragment } from "react";

import { IconButton } from "@/design-system/components/buttons/icon-button";
import { MenuItem } from "@/design-system/components/menu/menu-item";
import { MenuPanel } from "@/design-system/components/menu/menu-panel";
import { Box } from "@/design-system/primitives/box";
import { Divider } from "@/design-system/primitives/divider";

type MenuAction = {
  label: string;
  onSelect: () => void;
  icon?: Icon;
  destructive?: boolean;
  disabled?: boolean;
};

export type MenuProps = {
  /** The ⋯ button's accessible name, like "Item actions". */
  label: string;
  /** A divider goes before the first destructive action, so put those last. */
  actions: MenuAction[];
};

// Figma: the menu opens 4px below the ⋯ button.
const MENU_OFFSET_PX = 4;

/** A ⋯ button that opens a list of actions below it, right-aligned. */
export function Menu({ label, actions }: MenuProps) {
  return (
    <BaseMenu.Root modal={false}>
      <BaseMenu.Trigger
        render={<IconButton icon={DotsThreeIcon} label={label} variant="ghost" size="sm" />}
      />
      <BaseMenu.Portal>
        <BaseMenu.Positioner side="bottom" align="end" sideOffset={MENU_OFFSET_PX} className="z-50">
          <BaseMenu.Popup render={<MenuPanel />}>
            {actions.map((action, index) => (
              <Fragment key={`${index}-${action.label}`}>
                {action.destructive && index > 0 && !actions[index - 1].destructive && (
                  <Box className="py-xxs">
                    <Divider />
                  </Box>
                )}
                <BaseMenu.Item
                  nativeButton
                  disabled={action.disabled}
                  onClick={action.onSelect}
                  render={
                    <MenuItem
                      label={action.label}
                      icon={action.icon}
                      destructive={action.destructive}
                      disabled={action.disabled}
                    />
                  }
                />
              </Fragment>
            ))}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
