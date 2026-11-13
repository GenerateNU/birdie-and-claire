import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  listCurrentUserPiecesInfiniteQueryKey,
  listProductsInfiniteQueryKey,
  removeCurrentUserPieceMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { OwnedProductResponse } from "@/api/generated/types.gen";
import { Button, CardImage, Text } from "@/design-system";

type OwnedPieceCardProps = {
  piece: OwnedProductResponse;
  showRemove: boolean;
  onRemoved: () => void;
};

export function OwnedPieceCard({ piece, showRemove, onRemoved }: OwnedPieceCardProps) {
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
    <li className="flex flex-col gap-xs border p-xs">
      <CardImage src={piece.image_url} className="aspect-portrait w-full" />
      <Text variant="body" className="font-semibold uppercase">
        {piece.title}
      </Text>
      {showRemove && (
        <Button
          label="Remove"
          accessibleLabel={`Remove ${piece.title}`}
          variant="secondary"
          size="sm"
          onClick={() => removeMutation.mutate({ path: { product_id: piece.id } })}
          loading={removeMutation.isPending}
          loadingLabel="Removing…"
        />
      )}
      {removeMutation.isError && (
        <Text variant="caption" className="text-error">
          Couldn't remove this piece. Try again.
        </Text>
      )}
    </li>
  );
}
