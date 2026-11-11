import { Box, Button, Empty, Text } from "@/design-system";
import type { Product } from "@/features/outfits/outfit-items";
import { PieceCard } from "@/features/outfits/piece-card";

type PiecesSectionProps = {
  products: Product[];
};

/** The outfit's pieces as a scrolling list of cards, with Add all under them. */
export function PiecesSection({ products }: PiecesSectionProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-md">
      <Box className="flex items-baseline justify-between">
        <Text variant="subheading">Pieces in this outfit</Text>
        <Text variant="body">
          {products.length} {products.length === 1 ? "piece" : "pieces"}
        </Text>
      </Box>
      {products.length === 0 ? (
        <Empty title="This outfit has no items yet" />
      ) : (
        <>
          <ul className="flex min-h-0 flex-1 flex-col gap-md overflow-y-auto">
            {products.map((product) => (
              <PieceCard key={product.id} product={product} />
            ))}
          </ul>
          <Box title="Coming soon">
            <Button
              label="Add all"
              accessibleLabel="Add all to cart, coming soon"
              disabled
              className="w-full"
            />
          </Box>
        </>
      )}
    </section>
  );
}
