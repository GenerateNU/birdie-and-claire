import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  listCurrentUserPiecesInfiniteQueryKey,
  removeCurrentUserPieceMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { OwnedProductResponse } from "@/api/generated/types.gen";
import { ItemCard, Text } from "@/design-system";
import { invalidateBirdieAndClaireCatalog } from "@/features/pieces/birdie-and-claire-catalog";

type OwnedPieceCardProps = {
  piece: OwnedProductResponse;
  onRemoved: () => void;
};

export function OwnedPieceCard({ piece, onRemoved }: OwnedPieceCardProps) {
  const queryClient = useQueryClient();

  // One mutation per card, so removing a second piece doesn't clear the first one's pending state.
  const removeMutation = useMutation({
    ...removeCurrentUserPieceMutation(),
    onSuccess: onRemoved,
    // The catalog marks owned pieces, so a removed piece shows unselected in the picker. Refreshed
    // on failure too: a 404 means the piece is already gone, and the list should stop showing it.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: listCurrentUserPiecesInfiniteQueryKey() }),
        invalidateBirdieAndClaireCatalog(queryClient),
      ]),
  });

  return (
    <li className="flex flex-col gap-xs">
      <ItemCard
        name={piece.title}
        src={piece.image_url}
        bcStamp
        disabled={removeMutation.isPending}
        menu={{
          label: `Actions for ${piece.title}`,
          actions: [
            {
              label: "Remove",
              destructive: true,
              disabled: removeMutation.isPending,
              onSelect: () => removeMutation.mutate({ path: { product_id: piece.id } }),
            },
          ],
        }}
      />
      {removeMutation.isError && (
        <Text variant="caption" className="text-error">
          Couldn't remove this piece. Try again.
        </Text>
      )}
    </li>
  );
}
