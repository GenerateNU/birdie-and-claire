import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { Text } from "@/design-system";

export type Outfit = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type OutfitListProps = {
  outfits: Outfit[];
  nextCursor: string | null;
  onLoadMore: (cursor: string) => void;
};

export default function OutfitList({ outfits, nextCursor, onLoadMore }: OutfitListProps) {
  const sentinelRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (nextCursor === null || !sentinel) {
      return;
    }

    // No root, so the observer watches the viewport and loads more as the page scrolls.
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onLoadMore(nextCursor);
      }
    });

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [nextCursor, onLoadMore]);

  return (
    <ul className="grid grid-cols-3 gap-lg">
      {outfits.map((outfit) => (
        <li key={outfit.id}>
          <Link
            className="block border p-xs"
            to="/outfits/$outfitId"
            params={{ outfitId: outfit.id }}
          >
            {/* Outfits have no image yet. */}
            <div aria-hidden="true" className="aspect-[3/1] bg-placeholder" />
            <Text variant="body" className="mt-xs font-semibold">
              {outfit.name}
            </Text>
            <Text variant="caption" className="text-secondary">
              {new Date(outfit.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </Text>
          </Link>
        </li>
      ))}
      {nextCursor !== null && (
        <li ref={sentinelRef} aria-hidden="true" className="col-span-3 h-px" />
      )}
    </ul>
  );
}
