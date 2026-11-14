import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  listCurrentUserPiecesInfiniteQueryKey,
  listProductsInfiniteQueryKey,
  removeCurrentUserPieceMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { OwnedProductResponse } from "@/api/generated/types.gen";
import { ItemCard, Text } from "@/design-system";

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
    // The catalog leaves owned pieces out, so a removed piece goes back into the picker. Refreshed
    // on failure too: a 404 means the piece is already gone, and the list should stop showing it.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: listCurrentUserPiecesInfiniteQueryKey() }),
        queryClient.invalidateQueries({ queryKey: listProductsInfiniteQueryKey() }),
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
