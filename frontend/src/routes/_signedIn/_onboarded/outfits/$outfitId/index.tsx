import { BookmarkSimpleIcon, NotePencilIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { CSSProperties } from "react";

import { Box, Button, EmptyState, ErrorState, Link, Spinner, Text } from "@/design-system";
import { ExternalPiecesSection } from "@/features/outfits/external-pieces-section";
import { OutfitCanvas } from "@/features/outfits/outfit-canvas";
import { CANVAS_SIZE } from "@/features/outfits/outfit-items";
import { isOutfitNotFound, outfitQueryOptions } from "@/features/outfits/outfit-query";
import { PiecesSection } from "@/features/outfits/pieces-section";
import { ShareOutfit } from "@/features/outfits/share-outfit";

export const Route = createFileRoute("/_signedIn/_onboarded/outfits/$outfitId/")({
  component: OutfitDetailsPage,
});

// SAFETY: CSSProperties has no index for custom properties; the value is a plain string.
const canvasRatioStyle = {
  "--canvas-ratio": `${CANVAS_SIZE.width} / ${CANVAS_SIZE.height}`,
} as CSSProperties;

function OutfitDetailsPage() {
  const { outfitId } = Route.useParams();

  const outfitQuery = useQuery(outfitQueryOptions(outfitId));
  const navigate = useNavigate();

  if (outfitQuery.isPending) {
    return <Spinner className="m-lg" />;
  }

  if (isOutfitNotFound(outfitQuery.error)) {
    return (
      <EmptyState
        title="Outfit not found"
        action={{
          label: "Back to saved outfits",
          onClick: () => void navigate({ to: "/profile/outfits" }),
        }}
        className="p-lg"
      />
    );
  }

  // Checked rather than isError, so a failed background refetch keeps the outfit on screen.
  if (outfitQuery.data === undefined) {
    return (
      <ErrorState
        message="Couldn't load this outfit."
        onRetry={() => void outfitQuery.refetch()}
        className="p-lg"
      />
    );
  }

  const { name, description, tags, products } = outfitQuery.data;

  return (
    <main className="flex flex-col gap-xl p-md lg:h-screen lg:flex-row lg:gap-xxxl lg:p-xxl">
      <Box
        style={canvasRatioStyle}
        className="order-2 aspect-[var(--canvas-ratio)] min-w-0 lg:order-none lg:aspect-auto lg:flex-1"
      >
        <OutfitCanvas products={products} />
      </Box>
      <section className="contents lg:flex lg:min-h-0 lg:w-content-md lg:flex-col lg:gap-lg lg:overflow-y-auto">
        <header className="order-1 flex shrink-0 flex-col gap-xxs border-b pb-lg">
          <Box className="flex flex-wrap justify-end gap-sm pb-sm">
            <Link
              to="/outfits/$outfitId/edit"
              params={{ outfitId }}
              variant="secondary"
              size="sm"
              leadingIcon={NotePencilIcon}
            >
              Customize
            </Link>
            <Box title="Coming soon">
              <Button
                label="Save"
                accessibleLabel="Save the outfit to a collection, coming soon"
                variant="secondary"
                size="sm"
                leadingIcon={BookmarkSimpleIcon}
                disabled
              />
            </Box>
            <ShareOutfit outfitId={outfitId} />
          </Box>
          <Text variant="display" className="break-words">
            {name}
          </Text>
          {description && <Text variant="body-l">{description}</Text>}
          <ul className="flex flex-wrap gap-sm py-sm">
            {tags.map((tag) => (
              // Static text styled like a Chip: tags aren't selectable on this page.
              <li
                key={tag}
                className="flex h-xl items-center bg-placeholder px-sm text-body-s text-primary"
              >
                {tag}
              </li>
            ))}
          </ul>
        </header>
        <Box className="order-3 flex flex-col gap-xl">
          <PiecesSection products={products} />
          <ExternalPiecesSection />
        </Box>
      </section>
    </main>
  );
}
