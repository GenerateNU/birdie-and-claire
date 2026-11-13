import { useEffect, useRef } from "react";

type LoadMoreSentinelProps = {
  onVisible: () => void;
};

/** An empty grid row that calls onVisible when it scrolls into view. Render it after the last card. */
export function LoadMoreSentinel({ onVisible }: LoadMoreSentinelProps) {
  const sentinelRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;

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
  }, [onVisible]);

  return <li ref={sentinelRef} aria-hidden="true" className="col-span-full h-px" />;
}
