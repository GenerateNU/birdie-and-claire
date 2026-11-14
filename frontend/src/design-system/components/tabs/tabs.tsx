import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

const tabClasses =
  "flex items-center justify-center gap-xxs border-b-thick border-transparent px-xxs py-sm text-label-l text-secondary hover:text-primary data-[active]:border-primary data-[active]:text-label-l-strong data-[active]:text-primary data-[disabled]:text-disabled focus-ring";

const iconSize = 20;

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
  children: ReactNode;
};

/** A row of tabs above one panel. `children` is the active tab's content. */
export function Tabs<T extends string>({
  tabs,
  value,
  onValueChange,
  disabled,
  children,
}: TabsProps<T>) {
  return (
    <BaseTabs.Root
      value={value}
      // SAFETY: every Tab below is given a value from `tabs`, so a change is always a T.
      onValueChange={(next) => onValueChange(next as T)}
      // Fills its container's height and scrolls the panel, so a long grid stays under the tabs.
      className="flex min-h-0 w-full flex-1 flex-col gap-md"
    >
      <BaseTabs.List className="flex w-full gap-lg border-b">
        {tabs.map(({ label, value: tabValue, icon: TabIcon }) => (
          <BaseTabs.Tab
            key={tabValue}
            value={tabValue}
            disabled={disabled}
            className={TabIcon ? `${tabClasses} flex-col` : tabClasses}
          >
            {TabIcon && <TabIcon size={iconSize} aria-hidden="true" />}
            {label}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
      <BaseTabs.Panel value={value} className="min-h-0 w-full flex-1 overflow-y-auto">
        {children}
      </BaseTabs.Panel>
    </BaseTabs.Root>
  );
}
