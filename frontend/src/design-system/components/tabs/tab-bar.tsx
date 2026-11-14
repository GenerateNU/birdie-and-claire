import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";

import { Box } from "@/design-system/primitives/box";

const tabClasses =
  "flex items-center justify-center border-b-thick border-transparent px-xxs py-sm text-label-l text-secondary hover:text-primary data-[active]:border-primary data-[active]:text-label-l-strong data-[active]:text-primary data-[disabled]:text-disabled focus-ring motion-safe:transition-colors";

type TabBarOption<T extends string> = {
  label: string;
  value: T;
};

type TabBarProps<T extends string> = {
  tabs: TabBarOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  disabled: boolean;
  /** Fills the rest of the tab row and shares its underline, such as a search field. */
  trailing: ReactNode;
  children: ReactNode;
};

/** Figma's Tab Bar: tabs and a trailing control in one underlined row, above the active tab's
 * content. Unlike Tabs, the panel doesn't scroll, so the caller decides how its content does. */
export function TabBar<T extends string>({
  tabs,
  value,
  onValueChange,
  disabled,
  trailing,
  children,
}: TabBarProps<T>) {
  return (
    <BaseTabs.Root
      value={value}
      // SAFETY: every Tab below is given a value from `tabs`, so a change is always a T.
      onValueChange={(next) => onValueChange(next as T)}
      className="flex flex-col gap-lg"
    >
      <Box className="flex items-center gap-lg border-b">
        <BaseTabs.List className="flex gap-lg">
          {tabs.map(({ label, value: tabValue }) => (
            <BaseTabs.Tab
              key={tabValue}
              value={tabValue}
              disabled={disabled}
              className={tabClasses}
            >
              {label}
            </BaseTabs.Tab>
          ))}
        </BaseTabs.List>
        <Box className="flex min-w-0 flex-1 items-center">{trailing}</Box>
      </Box>
      <BaseTabs.Panel value={value}>{children}</BaseTabs.Panel>
    </BaseTabs.Root>
  );
}
