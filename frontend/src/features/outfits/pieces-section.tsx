import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { useState } from "react";

import {
  Box,
  Button,
  EmptyState,
  ExternalLink,
  PieceRow,
  SectionHeader,
  TextButton,
} from "@/design-system";
import type { OutfitDetailProductResponse, ProductResponse } from "@/api/generated/types.gen";

const STORE_BRAND = "Birdie & Claire";

const STORE_PRODUCT_URL = "https://birdieandclaire.com/products";

// The Figma shows two pieces, then "+ N more".
const COLLAPSED_PIECE_COUNT = 2;

/** A shared outfit's pieces come without ownership or cart links, since its viewer may not be signed in. */
type OutfitPiece = ProductResponse &
  Partial<Pick<OutfitDetailProductResponse, "owned" | "cart_url">>;

type PiecesSectionProps = {
  products: OutfitPiece[];
  /** Shopify cart link for every piece that can be bought, absent when none can. */
  addAllToCartUrl?: string;
};

type OutfitPieceRowProps = {
  product: OutfitPiece;
};

export function PiecesSection({ products, addAllToCartUrl }: PiecesSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const hiddenCount = products.length - COLLAPSED_PIECE_COUNT;
  const shownProducts = expanded ? products : products.slice(0, COLLAPSED_PIECE_COUNT);

  return (
    <section className="flex flex-col gap-lg">
      <Box className="px-sm">
        <SectionHeader
          title="Pieces in this outfit"
          count={`${products.length} ${products.length === 1 ? "piece" : "pieces"}`}
          size="sm"
        />
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
            {!addAllToCartUrl ? (
              <Button label="Add all to cart" size="sm" leadingIcon={ArrowSquareOutIcon} disabled />
            ) : (
              <ExternalLink
                href={addAllToCartUrl}
                variant="primary"
                size="sm"
                leadingIcon={ArrowSquareOutIcon}
              >
                Add all to cart
              </ExternalLink>
            )}
          </Box>
        </>
      )}
    </section>
  );
}

/**
 * A Birdie & Claire piece links to its store page, and to its cart when it can be bought. A demo
 * piece is filler with no page there. A piece the user owns has no cart button.
 */
function OutfitPieceRow({ product }: OutfitPieceRowProps) {
  const isStoreProduct = product.source === "birdie_and_claire";

  const viewProductLink = (
    <ExternalLink
      href={`${STORE_PRODUCT_URL}/${encodeURIComponent(product.handle)}`}
      variant="secondary"
      size="sm"
      trailingIcon={ArrowSquareOutIcon}
    >
      View product
    </ExternalLink>
  );

  if (product.owned) {
    return (
      <PieceRow
        type="owned"
        name={product.title}
        detail="You own this"
        src={product.image_url}
        action={isStoreProduct ? viewProductLink : undefined}
      />
    );
  }

  if (!isStoreProduct) {
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
        product.cart_url === undefined ? undefined : (
          <ExternalLink
            href={product.cart_url}
            variant="secondary"
            size="sm"
            trailingIcon={ArrowSquareOutIcon}
          >
            Add to cart
          </ExternalLink>
        )
      }
      secondaryAction={viewProductLink}
    />
  );
}
