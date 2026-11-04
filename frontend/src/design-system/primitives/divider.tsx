import { Separator } from "@base-ui/react/separator";

import { joinClasses } from "../utils/join-classes";

type DividerProps = {
  className?: string;
};

export function Divider({ className }: DividerProps) {
  return <Separator className={joinClasses("border-t", className)} />;
}
