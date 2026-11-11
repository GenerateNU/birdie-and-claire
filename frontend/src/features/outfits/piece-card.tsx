import { ArrowSquareOut } from "@phosphor-icons/react";

import stamp from "@/design-system/assets/stamp.png";
import { Box, Button, Text } from "@/design-system";
import type { Product } from "@/features/outfits/outfit-items";

// Every product is treated as a Birdie & Claire piece until basics and partner brands are decided.
const STORE_BRAND = "Birdie & Claire";

const STORE_PRODUCT_URL = "https://birdieandclaire.com/products";

type PieceCardProps = {
  product: Product;
};

/** One piece in the outfit, linking to its page on the Birdie & Claire store. */
export function PieceCard({ product }: PieceCardProps) {
  return (
    <li className="flex gap-sm border bg-surface p-xs">
      {/* The image tile is smaller than the Figma's 211px-tall cards, so more pieces fit
          before the list scrolls. */}
      <Box className="flex h-[112px] w-[92px] shrink-0 items-center justify-center bg-placeholder">
        {/* Decorative: the title next to it already names the item. multiply blends the photo's
            white background into the tile, as on the canvas. */}
        {product.image_url !== null && (
          <img
            src={product.image_url}
            alt=""
            className="h-full w-full object-contain mix-blend-multiply"
          />
        )}
      </Box>
      <Box className="flex min-w-0 flex-1 flex-col gap-xxs">
        <Box className="flex items-start justify-between gap-xs">
          <Box className="min-w-0">
            <Text variant="body" className="font-semibold uppercase">
              {product.title}
            </Text>
            <Text variant="body" className="text-secondary">
              {STORE_BRAND}
            </Text>
          </Box>
          {/* Decorative: the brand line beside it already names it. */}
          <img src={stamp} alt="" className="size-[40px] shrink-0" />
        </Box>
        <Box className="mt-xs flex flex-col gap-xs">
          <Box title="Coming soon" className="flex flex-col">
            <Button
              label="Add to cart"
              accessibleLabel="Add to cart, coming soon"
              size="sm"
              disabled
            />
          </Box>
          {/* A raw anchor: the design system's Link only types routes in this app, not outside URLs. */}
          <a
            href={`${STORE_PRODUCT_URL}/${encodeURIComponent(product.handle)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-xxs border-thick border-primary bg-background px-xs py-xxs text-caption font-semibold uppercase focus-ring"
          >
            View product
            <ArrowSquareOut aria-hidden="true" />
          </a>
        </Box>
      </Box>
    </li>
  );
}
