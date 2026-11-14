import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

const appearanceClasses = {
  segmented: {
    root: "flex w-full flex-col items-center gap-md",
    panel: "w-full",
    list: "flex rounded-full border border-primary",
    tab: "px-lg py-xs text-caption text-primary border-r border-primary last:border-r-0 first:rounded-l-full last:rounded-r-full data-[active]:bg-primary data-[active]:text-inverse focus-ring",
  },
  // Fills its container's height and scrolls the panel, so a long grid stays under the tabs.
  underline: {
    root: "flex min-h-0 w-full flex-1 flex-col gap-md",
    panel: "min-h-0 w-full flex-1 overflow-y-auto",
    list: "flex w-full gap-lg border-b",
    tab: "flex items-center justify-center gap-xxs border-b-thick border-transparent px-xxs py-sm text-label-l text-secondary hover:text-primary data-[active]:border-primary data-[active]:text-label-l-strong data-[active]:text-primary data-[disabled]:text-disabled focus-ring",
  },
};

const underlineIconSize = 20;

type TabOption<T extends string> = {
  label: string;
  value: T;
  icon?: Icon;
};

type TabsProps<T extends string> = {
  tabs: TabOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  disabled: boolean;
  /** segmented is a pill row. underline underlines the active tab. */
  appearance?: keyof typeof appearanceClasses;
  children: ReactNode;
};

/** A row of tabs above one panel. `children` is the active tab's content. */
export function Tabs<T extends string>({
  tabs,
  value,
  onValueChange,
  disabled,
  appearance = "segmented",
  children,
}: TabsProps<T>) {
  const classes = appearanceClasses[appearance];
  const underlined = appearance === "underline";

  return (
    <BaseTabs.Root
      value={value}
      // SAFETY: every Tab below is given a value from `tabs`, so a change is always a T.
      onValueChange={(next) => onValueChange(next as T)}
      className={classes.root}
    >
      <BaseTabs.List className={classes.list}>
        {tabs.map(({ label, value: tabValue, icon: TabIcon }) => (
          <BaseTabs.Tab
            key={tabValue}
            value={tabValue}
            disabled={disabled}
            className={underlined && TabIcon ? `${classes.tab} flex-col` : classes.tab}
          >
            {underlined && TabIcon && <TabIcon size={underlineIconSize} aria-hidden="true" />}
            {label}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
      <BaseTabs.Panel value={value} className={classes.panel}>
        {children}
      </BaseTabs.Panel>
    </BaseTabs.Root>
  );
}
