import type { HTMLAttributes } from "react";

import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

/** The menu's box, without the trigger or the popup behavior, so it can also sit in the page. */
export function MenuPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <Box
      role="menu"
      className={joinClasses(
        "flex w-menu flex-col border bg-card py-xxs shadow-menu focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
