import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <Box
      aria-hidden="true"
      className={joinClasses("rounded-xs bg-placeholder motion-safe:animate-pulse", className)}
    />
  );
}
