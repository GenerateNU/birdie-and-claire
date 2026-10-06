import { useEffect, useRef } from "react";

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
  const listRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (nextCursor === null || !sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore(nextCursor);
        }
      },
      { root: listRef.current },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [nextCursor, onLoadMore]);

  return (
    <ul ref={listRef} className="max-h-96 overflow-y-auto">
      {outfits.map((outfit) => (
        <li key={outfit.id}>{outfit.name}</li>
      ))}
      {nextCursor !== null && <li ref={sentinelRef} aria-hidden="true" className="h-px" />}
    </ul>
  );
}
