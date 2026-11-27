import { useCallback } from "react";

import { Box } from "@/design-system/primitives/box";

type LoadMoreSentinelProps = {
  onVisible: () => void;
  /** "li" inside a list, "div" anywhere else. */
  as: "li" | "div";
};

/** An empty row that calls onVisible when it scrolls into view. Render it after the last item. */
export function LoadMoreSentinel({ onVisible, as }: LoadMoreSentinelProps) {
  // A new onVisible re-observes, and an observer fires at once for a row already in view, so a list
  // too short to scroll keeps loading.
  const observe = useCallback(
    (sentinel: Element | null) => {
      if (!sentinel) {
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          onVisible();
        }
      });

      observer.observe(sentinel);

      return () => observer.disconnect();
    },
    [onVisible],
  );

  // col-span-full gives it a row of its own in a grid.
  if (as === "li") {
    return <li ref={observe} aria-hidden="true" className="col-span-full h-px" />;
  }

  return <Box ref={observe} aria-hidden="true" className="col-span-full h-px" />;
}
