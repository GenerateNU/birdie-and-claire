import type { HTMLAttributes } from "react";

export function Box(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
