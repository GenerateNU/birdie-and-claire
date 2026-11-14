import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import type { OutfitResponse } from "@/api/generated/types.gen";
import { OutfitCard } from "@/design-system";

type OutfitListProps = {
  outfits: OutfitResponse[];
  nextCursor: string | null;
  onLoadMore: (cursor: string) => void;
};

export function OutfitList({ outfits, nextCursor, onLoadMore }: OutfitListProps) {
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (nextCursor === null || !sentinel) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onLoadMore(nextCursor);
      }
    });

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [nextCursor, onLoadMore]);

  return (
    <ul className="flex flex-wrap gap-lg">
      {outfits.map((outfit) => (
        <li key={outfit.id}>
          {/* Outfits have no image yet. */}
          <OutfitCard
            mode="browse"
            title={outfit.name}
            src={null}
            onOpen={() =>
              void navigate({ to: "/outfits/$outfitId", params: { outfitId: outfit.id } })
            }
          />
        </li>
      ))}
      {/* A full row of its own, so it only comes into view after the last card. */}
      {nextCursor !== null && <li ref={sentinelRef} aria-hidden="true" className="h-px w-full" />}
    </ul>
  );
}
