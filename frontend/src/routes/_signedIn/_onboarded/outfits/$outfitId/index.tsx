import { ArrowSquareOut, ArrowsOut, CaretLeft, Plus } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import stamp from "@/design-system/assets/stamp.png";
import { Box, Button, Empty, ErrorState, Link, Logo, Spinner, Text } from "@/design-system";
import { OutfitCanvas } from "@/features/outfits/outfit-canvas";
import type { Product } from "@/features/outfits/outfit-items";
import { isOutfitNotFound, outfitQueryOptions } from "@/features/outfits/outfit-query";
import { ShareOutfit } from "@/features/outfits/share-outfit";

export const Route = createFileRoute("/_signedIn/_onboarded/outfits/$outfitId/")({
  component: OutfitDetailsPage,
});

// Outfits have no tags yet, so the chips are the Figma's placeholders. Real ones will come from the
// answers given when the outfit was created.
const PLACEHOLDER_TAGS = ["Tag 1", "Tag 2", "Tag 3"];

// Every product is treated as a Birdie & Claire piece for now. Basics and partner brands, which
// would need their own brand and link, aren't decided yet.
const STORE_BRAND = "Birdie & Claire";

const STORE_PRODUCT_URL = "https://birdieandclaire.com/products";

const EXTERNAL_PLACEHOLDER_COUNT = 4;

type DetailsFrameProps = {
  children: ReactNode;
};

type PiecesSectionProps = {
  products: Product[];
};

type PieceCardProps = {
  product: Product;
};

type ComingSoonIconButtonProps = {
  label: string;
  children: ReactNode;
};

function OutfitDetailsPage() {
  const { outfitId } = Route.useParams();

  const outfitQuery = useQuery(outfitQueryOptions(outfitId));

  if (outfitQuery.isPending) {
    return (
      <DetailsFrame>
        <Spinner className="m-lg" />
      </DetailsFrame>
    );
  }

  if (isOutfitNotFound(outfitQuery.error)) {
    return (
      <DetailsFrame>
        <Empty title="Outfit not found" className="p-lg" />
      </DetailsFrame>
    );
  }

  // Checked rather than isError, so a failed background refetch keeps the outfit on screen.
  if (outfitQuery.data === undefined) {
    return (
      <DetailsFrame>
        <ErrorState
          message="Couldn't load this outfit."
          onRetry={() => void outfitQuery.refetch()}
          className="p-lg"
        />
      </DetailsFrame>
    );
  }

  const { name, products } = outfitQuery.data;

  return (
    <DetailsFrame>
      {/* The canvas fits the height under the header and only the details panel scrolls. Side by
          side from lg up. Narrower than that, the panels stack and split the height. */}
      <main className="relative flex min-h-0 flex-1 flex-col gap-xl p-md lg:flex-row lg:gap-[88px] lg:py-md lg:pl-[120px] lg:pr-[80px]">
        {/* From lg up it sits in the left gutter, outside the canvas, as in the Figma. */}
        <Link
          to="/profile/outfits"
          aria-label="Back to saved outfits"
          className="flex size-avatar-md shrink-0 items-center justify-center self-start rounded-full border text-subheading focus-ring lg:absolute lg:left-xl lg:top-xl"
        >
          <CaretLeft aria-hidden="true" />
        </Link>
        <Box className="h-1/2 min-w-0 lg:h-auto lg:flex-1">
          <OutfitCanvas products={products}>
            <Box className="absolute right-md top-md flex items-center gap-xs">
              <Link
                to="/outfits/$outfitId/edit"
                params={{ outfitId }}
                className="rounded-full border bg-background px-md py-xs text-body focus-ring"
              >
                Customize
              </Link>
              <ComingSoonIconButton label="Expand the outfit">
                <ArrowsOut aria-hidden="true" />
              </ComingSoonIconButton>
            </Box>
          </OutfitCanvas>
        </Box>
        {/* Only the pieces list scrolls. The header and the sections below it stay in place. */}
        <section className="flex min-h-0 flex-1 flex-col gap-md lg:w-[554px] lg:flex-none">
          <header className="flex shrink-0 flex-col gap-sm border-b pb-md">
            <Box className="flex items-center justify-between gap-md">
              <Text variant="heading" className="min-w-0 break-words">
                {name}
              </Text>
              <Box className="flex shrink-0 items-center gap-sm">
                <ComingSoonIconButton label="Save the outfit to a collection">
                  <Plus aria-hidden="true" />
                </ComingSoonIconButton>
                <ShareOutfit outfitId={outfitId} />
              </Box>
            </Box>
            {/* Outfits have no description yet, so this is the Figma's placeholder. */}
            <Text variant="body" className="text-secondary">
              This is a short description about the outfit...
            </Text>
            <ul className="flex flex-wrap gap-xs">
              {PLACEHOLDER_TAGS.map((tag) => (
                <li key={tag} className="rounded-full bg-placeholder px-md py-xxs text-caption">
                  {tag}
                </li>
              ))}
            </ul>
          </header>
          <PiecesSection products={products} />
          <ExternalPiecesSection />
        </section>
      </main>
    </DetailsFrame>
  );
}

function PiecesSection({ products }: PiecesSectionProps) {
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

function PieceCard({ product }: PieceCardProps) {
  return (
    <li className="flex gap-sm border bg-surface p-xs">
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
          {/* The cart isn't built yet. */}
          <Box title="Coming soon" className="flex flex-col">
            <Button
              label="Add to cart"
              accessibleLabel="Add to cart, coming soon"
              size="sm"
              disabled
            />
          </Box>
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

function ExternalPiecesSection() {
  const placeholderNumbers = Array.from(
    { length: EXTERNAL_PLACEHOLDER_COUNT },
    (_, index) => index + 1,
  );

  return (
    <section className="flex shrink-0 flex-col gap-md">
      <Text variant="subheading">External pieces</Text>
      {/* Mock tiles until basics and partner brands are designed. */}
      <ul className="flex gap-md">
        {placeholderNumbers.map((number) => (
          <li key={number} className="flex flex-col gap-xxs">
            <Box className="flex size-[64px] items-center justify-center bg-placeholder text-caption text-secondary">
              Piece {number}
            </Box>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="flex items-center gap-xxs text-caption text-secondary disabled:opacity-disabled"
            >
              <ArrowSquareOut aria-hidden="true" />
              View item
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComingSoonIconButton({ label, children }: ComingSoonIconButtonProps) {
  return (
    <button
      type="button"
      disabled
      aria-label={`${label}, coming soon`}
      title="Coming soon"
      className="flex size-avatar-md items-center justify-center rounded-full border bg-background text-subheading disabled:opacity-disabled"
    >
      {children}
    </button>
  );
}

function DetailsFrame({ children }: DetailsFrameProps) {
  return (
    <Box className="flex h-screen flex-col">
      <header className="flex h-[120px] shrink-0 items-end justify-center border-y">
        <Link to="/profile/outfits">
          {/* object-bottom repeats the Figma's crop of the image's empty top edge. */}
          <Logo className="h-[118px] w-[373px] object-cover object-bottom" />
        </Link>
      </header>
      {children}
    </Box>
  );
}
