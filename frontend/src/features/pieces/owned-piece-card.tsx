import type { OwnedProductResponse } from "@/api/generated/types.gen";
import { Button, CardImage, Text } from "@/design-system";

type OwnedPieceCardProps = {
  piece: OwnedProductResponse;
  showRemove: boolean;
  onRemove: () => void;
  removing: boolean;
};

export function OwnedPieceCard({ piece, showRemove, onRemove, removing }: OwnedPieceCardProps) {
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
          onClick={onRemove}
          loading={removing}
          loadingLabel="Removing…"
        />
      )}
    </li>
  );
}
