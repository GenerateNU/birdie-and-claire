import type { ComponentProps } from "react";

export function Box(props: ComponentProps<"div">) {
  return <div {...props} />;
}
