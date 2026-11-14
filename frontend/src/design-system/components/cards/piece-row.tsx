import type { ReactNode } from "react";

import stamp from "@/design-system/assets/stamp.png";
import { CardImage } from "@/design-system/components/cards/card-image";
import { Box } from "@/design-system/primitives/box";

type PieceRowProps = {
  name: string;
  detail: string;
  src: string | null;
  /** `bc` is a Birdie & Claire catalog piece and puts the stamp on the thumbnail. */
  type: "owned" | "bc";
  /** A TextButton for Swap on an owned piece, or a small secondary Button for Add to cart. */
  action?: ReactNode;
};

/** One piece in an outfit, as a row with a thumbnail. Fills the width it is given. */
export function PieceRow({ name, detail, src, type, action }: PieceRowProps) {
  return (
    <Box className="flex w-full items-center gap-md border-b py-sm text-primary">
      <Box className="relative h-row-thumbnail w-row-thumbnail shrink-0 overflow-hidden bg-surface">
        <CardImage src={src} fit="contain" className="absolute inset-0 size-full" />
        {type === "bc" && (
          <img
            src={stamp}
            alt=""
            className="absolute right-xxxs top-xxxs size-lg mix-blend-multiply"
          />
        )}
      </Box>
      <Box className="flex min-w-0 flex-1 flex-col gap-xxs break-words">
        <Box className="text-label-l-strong">{name}</Box>
        <Box className="text-body-s text-secondary">{detail}</Box>
      </Box>
      {action && <Box className="shrink-0">{action}</Box>}
    </Box>
  );
}
