import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Box, Button, EmptyState, ExternalLink, PieceRow, TextButton } from "@/design-system";
import type { ProductResponse } from "@/api/generated/types.gen";

const STORE_BRAND = "Birdie & Claire";

const STORE_PRODUCT_URL = "https://birdieandclaire.com/products";

// The Figma shows two pieces, then "+ N more".
const COLLAPSED_PIECE_COUNT = 2;

type PiecesSectionProps = {
  products: ProductResponse[];
};

type OutfitPieceRowProps = {
  product: ProductResponse;
};

/** The outfit's pieces, the first two until expanded, with Add all under them. */
export function PiecesSection({ products }: PiecesSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const hiddenCount = products.length - COLLAPSED_PIECE_COUNT;
  const shownProducts = expanded ? products : products.slice(0, COLLAPSED_PIECE_COUNT);

  return (
    <section className="flex flex-col gap-lg">
      <Box className="flex items-baseline justify-between px-sm">
        <h2 className="text-label-l-strong">Pieces in this outfit</h2>
        <Box className="text-label-l-strong">
          {products.length} {products.length === 1 ? "piece" : "pieces"}
        </Box>
      </Box>
      {products.length === 0 ? (
        <EmptyState title="This outfit has no items yet" />
      ) : (
        <>
          <ul className="flex flex-col">
            {shownProducts.map((product) => (
              <li key={product.id}>
                <OutfitPieceRow product={product} />
              </li>
            ))}
          </ul>
          <Box className="flex flex-col gap-xs">
            {hiddenCount > 0 && (
              <Box className="self-start">
                <TextButton
                  label={expanded ? "Show less" : `+ ${hiddenCount} more`}
                  onClick={() => setExpanded(!expanded)}
                />
              </Box>
            )}
            <Box title="Coming soon" className="flex flex-col">
              <Button
                label="Add all to cart"
                accessibleLabel="Add all to cart, coming soon"
                size="sm"
                leadingIcon={ArrowSquareOutIcon}
                disabled
              />
            </Box>
          </Box>
        </>
      )}
    </section>
  );
}

/** A Birdie & Claire piece links to its store page. A demo piece is filler with no page there. */
function OutfitPieceRow({ product }: OutfitPieceRowProps) {
  if (product.source !== "birdie_and_claire") {
    return (
      <PieceRow
        type="owned"
        name={product.title}
        // Demo pieces have no brand, so the row names the kind of piece. Some have no type.
        detail={product.product_type ?? ""}
        src={product.image_url}
      />
    );
  }

  return (
    <PieceRow
      type="bc"
      name={product.title}
      detail={STORE_BRAND}
      src={product.image_url}
      action={
        <Box title="Coming soon" className="flex flex-col">
          <Button
            label="Add to cart"
            accessibleLabel="Add to cart, coming soon"
            variant="secondary"
            size="sm"
            disabled
          />
        </Box>
      }
      secondaryAction={
        <ExternalLink
          href={`${STORE_PRODUCT_URL}/${encodeURIComponent(product.handle)}`}
          variant="secondary"
          size="sm"
          trailingIcon={ArrowSquareOutIcon}
        >
          View product
        </ExternalLink>
      }
    />
  );
}
