import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";

const listClasses = "flex rounded-full border border-primary";

const tabClasses =
  "px-lg py-xs text-caption text-primary border-r border-primary last:border-r-0 first:rounded-l-full last:rounded-r-full data-[active]:bg-primary data-[active]:text-inverse focus-ring";

type TabOption<T extends string> = {
  label: string;
  value: T;
};

type TabsProps<T extends string> = {
  tabs: TabOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  children: ReactNode;
};

/** A segmented row of tabs above one panel. `children` is the active tab's content. */
export function Tabs<T extends string>({ tabs, value, onValueChange, children }: TabsProps<T>) {
  return (
    <BaseTabs.Root
      value={value}
      // SAFETY: every Tab below is given a value from `tabs`, so a change is always a T.
      onValueChange={(next) => onValueChange(next as T)}
      className="flex w-full flex-col items-center gap-md"
    >
      <BaseTabs.List className={listClasses}>
        {tabs.map((tab) => (
          <BaseTabs.Tab key={tab.value} value={tab.value} className={tabClasses}>
            {tab.label}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
      <BaseTabs.Panel value={value} className="w-full">
        {children}
      </BaseTabs.Panel>
    </BaseTabs.Root>
  );
}
