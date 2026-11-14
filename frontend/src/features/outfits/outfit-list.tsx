import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import type { OutfitResponse } from "@/api/generated/types.gen";
import { AddTile, Modal, OutfitCard } from "@/design-system";
import { OutfitCanvas } from "@/features/outfits/outfit-canvas";
import { nextFocusAfterDelete, piecesLine } from "@/features/outfits/saved-outfits";
import { useDeleteOutfit } from "@/features/outfits/use-delete-outfit";

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
  const listRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const deletion = useDeleteOutfit();
  const [outfitToDelete, setOutfitToDelete] = useState<OutfitResponse | null>(null);
  // Where focus goes after the modal has closed. It is set when a delete finishes, because the
  // open modal keeps focus until then.
  const focusAfterClose = useRef<{ outfitId: string | null } | null>(null);

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

  // Moves focus to where the deleted card was. Its menu button had focus and left with it.
  useEffect(() => {
    if (outfitToDelete !== null || focusAfterClose.current === null) {
      return;
    }

    const { outfitId } = focusAfterClose.current;
    focusAfterClose.current = null;

    // The first button in a card is the one that covers it and opens it. No id means the deleted
    // card was the last, so the list takes focus.
    const openButton =
      outfitId === null
        ? null
        : listRef.current?.querySelector<HTMLElement>(`[data-outfit-id="${outfitId}"] button`);

    (openButton ?? listRef.current)?.focus();
  }, [outfitToDelete]);

  // The Delete button is disabled while it loads, and the browser drops focus from a disabled
  // button. Focus on the error keeps it inside the modal, with Delete, the retry, a Tab away.
  useEffect(() => {
    if (deletion.errorMessage) {
      errorRef.current?.focus();
    }
  }, [deletion.errorMessage]);

  function cancelDelete() {
    // A delete that is on its way can't be called back, so Esc and a click outside wait for it.
    if (deletion.isPending) {
      return;
    }

    setOutfitToDelete(null);
    deletion.reset();
  }

  function confirmDelete(outfit: OutfitResponse) {
    const nextId = nextFocusAfterDelete(
      outfits.map((item) => item.id),
      outfit.id,
    );

    deletion.deleteOutfit(outfit.id, () => {
      focusAfterClose.current = { outfitId: nextId };
      setOutfitToDelete(null);
    });
  }

  return (
    <>
      {/* Columns are as many outfit-card widths (`width.outfit`) as fit, spread across the row. The
          padding is the hover outline's width, so the outline stays inside the list, and the
          negative margin keeps the cards on the page's edge. */}
      <ul
        ref={listRef}
        tabIndex={-1}
        aria-label="Saved outfits"
        className="grid grid-cols-[repeat(auto-fill,theme(width.outfit))] justify-between gap-x-md gap-y-outfit-row p-card-hover -m-card-hover focus-ring"
      >
        {outfits.map((outfit) => (
          <li key={outfit.id} data-outfit-id={outfit.id}>
            <OutfitCard
              mode="browse"
              title={outfit.name}
              pieces={piecesLine(outfit.products)}
              src={null}
              image={<OutfitCanvas products={outfit.products} variant="card" />}
              onOpen={() =>
                void navigate({ to: "/outfits/$outfitId", params: { outfitId: outfit.id } })
              }
              menu={{
                label: `Actions for ${outfit.name}`,
                actions: [
                  {
                    label: "Edit",
                    onSelect: () =>
                      void navigate({
                        to: "/outfits/$outfitId/edit",
                        params: { outfitId: outfit.id },
                      }),
                  },
                  { label: "Delete", destructive: true, onSelect: () => setOutfitToDelete(outfit) },
                ],
              }}
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
      <Modal
        open={outfitToDelete !== null}
        onClose={cancelDelete}
        dismissible
        title="Delete this outfit?"
        message="This can't be undone."
        actions={[
          {
            label: "Cancel",
            variant: "secondary",
            onClick: cancelDelete,
            disabled: deletion.isPending,
          },
          {
            label: "Delete outfit",
            variant: "destructive",
            onClick: () => {
              // The modal is on screen a moment after it closes, and this does nothing then.
              if (outfitToDelete) {
                confirmDelete(outfitToDelete);
              }
            },
            loading: deletion.isPending,
          },
        ]}
      >
        {/* A plain p: Text takes no ref, and this needs one to take focus. */}
        {deletion.errorMessage && (
          <p
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            className="text-caption text-error focus-ring"
          >
            {deletion.errorMessage}
          </p>
        )}
      </Modal>
    </>
  );
}
