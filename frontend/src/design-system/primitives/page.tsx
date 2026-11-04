import type { HTMLAttributes } from "react";

import { joinClasses } from "../utils/join-classes";

export function Page({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <main className={joinClasses("min-h-screen p-xl", className)} {...props} />;
}
