import type { OwnedProductResponse } from "@/api/generated/types.gen";
import { Box, Button, Text } from "@/design-system";

type OwnedPieceCardProps = {
  piece: OwnedProductResponse;
  // Shown only while Pieces I Own is being edited.
  onRemove?: () => void;
  removing: boolean;
};

export function OwnedPieceCard({ piece, onRemove, removing }: OwnedPieceCardProps) {
  return (
    <li className="flex flex-col gap-xs border p-xs">
      <Box className="aspect-portrait w-full bg-placeholder">
        {piece.image_url !== null && (
          // The title below names the piece, so the image is decorative.
          <img src={piece.image_url} alt="" className="h-full w-full object-contain" />
        )}
      </Box>
      <Text variant="body" className="font-semibold uppercase">
        {piece.title}
      </Text>
      {onRemove && (
        <Button
          label="Remove"
          accessibleLabel={`Remove ${piece.title}`}
          variant="secondary"
          size="sm"
          onClick={onRemove}
          disabled={removing}
        />
      )}
    </li>
  );
}
