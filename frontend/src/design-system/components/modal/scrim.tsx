import type { HTMLAttributes } from "react";

import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

/** Dims the page behind a modal. The caller positions it, usually `fixed inset-0`. */
export function Scrim({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Box className={joinClasses("bg-overlay", className)} {...props} />;
}
