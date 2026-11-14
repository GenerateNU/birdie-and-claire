import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import type { OutfitResponse } from "@/api/generated/types.gen";
import { AddTile, OutfitCard } from "@/design-system";
import { OutfitCanvas } from "@/features/outfits/outfit-canvas";
import { piecesLine } from "@/features/outfits/saved-outfits";

// Asks for the next page when the sentinel is within a quarter of the viewport's height of the
// bottom edge, so the cards are there by the time the reader arrives. The margin is on the bottom
// only, and rootMargin takes px or %, not rem.
const LOAD_AHEAD = "0px 0px 25% 0px";

type OutfitListProps = {
  outfits: OutfitResponse[];
  hasMore: boolean;
  onLoadMore: () => void;
  /** Whether the list ends with the tile that opens the outfit builder. */
  addTile: boolean;
};

export function OutfitList({ outfits, hasMore, onLoadMore, addTile }: OutfitListProps) {
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!hasMore || !sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: LOAD_AHEAD },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    // Columns are as many outfit-card widths (`width.outfit`) as fit, spread across the row. The
    // padding is the hover outline's width, so the outline stays inside the list, and the negative
    // margin keeps the cards on the page's edge.
    <ul className="grid grid-cols-[repeat(auto-fill,theme(width.outfit))] justify-between gap-x-md gap-y-outfit-row p-card-hover -m-card-hover">
      {outfits.map((outfit) => (
        <li key={outfit.id}>
          <OutfitCard
            mode="browse"
            title={outfit.name}
            pieces={piecesLine(outfit.products)}
            src={null}
            image={<OutfitCanvas products={outfit.products} variant="card" />}
            onOpen={() =>
              void navigate({ to: "/outfits/$outfitId", params: { outfitId: outfit.id } })
            }
          />
        </li>
      ))}
      {/* Spans the grid, so it only comes into view after the last card. */}
      {hasMore && <li ref={sentinelRef} aria-hidden="true" className="col-span-full h-px" />}
      {/* Ends the list, so it waits for the last page rather than moving as pages load. */}
      {!hasMore && addTile && (
        <li className="flex">
          <AddTile
            size="outfit"
            title="Something else?"
            label="Add your own"
            onClick={() => void navigate({ to: "/create-outfit" })}
          />
        </li>
      )}
    </ul>
  );
}
