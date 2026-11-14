import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

const appearanceClasses = {
  segmented: {
    root: "flex w-full flex-col items-center gap-md",
    panel: "w-full",
    list: "flex rounded-full border border-primary",
    tab: "px-lg py-xs text-caption text-primary border-r border-primary last:border-r-0 first:rounded-l-full last:rounded-r-full motion-safe:transition-colors data-[active]:bg-primary data-[active]:text-inverse focus-ring",
  },
  // Fills its container's height and scrolls the panel, so a long grid stays under the tabs.
  underline: {
    root: "flex min-h-0 w-full flex-1 flex-col gap-md",
    panel: "min-h-0 w-full flex-1 overflow-y-auto",
    list: "flex w-full border-b",
    tab: "group flex flex-1 flex-col items-center gap-xxs pt-xs text-caption text-primary focus-ring",
  },
};

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
  /** segmented is a pill row. underline is a full-width row that underlines the active tab. */
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
          <BaseTabs.Tab key={tabValue} value={tabValue} disabled={disabled} className={classes.tab}>
            {underlined && TabIcon && <TabIcon aria-hidden="true" weight="fill" />}
            {label}
            {/* Invisible rather than absent, so the row doesn't shift when the active tab moves. */}
            {underlined && (
              <span className="h-xxs w-xl rounded-full bg-primary opacity-0 motion-safe:transition-opacity group-data-[active]:opacity-100" />
            )}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
      <BaseTabs.Panel value={value} className={classes.panel}>
        {children}
      </BaseTabs.Panel>
    </BaseTabs.Root>
  );
}
