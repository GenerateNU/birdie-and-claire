import { ArrowsOut, CaretLeft, Plus } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Box, Empty, ErrorState, IconButton, Link, Spinner, Text } from "@/design-system";
import { ExternalPiecesSection } from "@/features/outfits/external-pieces-section";
import { OutfitCanvas } from "@/features/outfits/outfit-canvas";
import { OutfitDetailsFrame } from "@/features/outfits/outfit-details-frame";
import { isOutfitNotFound, outfitQueryOptions } from "@/features/outfits/outfit-query";
import { PiecesSection } from "@/features/outfits/pieces-section";
import { ShareOutfit } from "@/features/outfits/share-outfit";

export const Route = createFileRoute("/_signedIn/_onboarded/outfits/$outfitId/")({
  component: OutfitDetailsPage,
});

// Placeholders until outfits have descriptions and tags.
const PLACEHOLDER_DESCRIPTION = "This is a short description about the outfit...";

const PLACEHOLDER_TAGS = ["Tag 1", "Tag 2", "Tag 3"];

function OutfitDetailsPage() {
  const { outfitId } = Route.useParams();

  const outfitQuery = useQuery(outfitQueryOptions(outfitId));

  if (outfitQuery.isPending) {
    return (
      <OutfitDetailsFrame>
        <Spinner className="m-lg" />
      </OutfitDetailsFrame>
    );
  }

  if (isOutfitNotFound(outfitQuery.error)) {
    return (
      <OutfitDetailsFrame>
        <Empty title="Outfit not found" className="p-lg" />
      </OutfitDetailsFrame>
    );
  }

  // Checked rather than isError, so a failed background refetch keeps the outfit on screen.
  if (outfitQuery.data === undefined) {
    return (
      <OutfitDetailsFrame>
        <ErrorState
          message="Couldn't load this outfit."
          onRetry={() => void outfitQuery.refetch()}
          className="p-lg"
        />
      </OutfitDetailsFrame>
    );
  }

  const { name, products } = outfitQuery.data;

  return (
    <OutfitDetailsFrame>
      {/* The canvas fits the height under the header. Side by side from lg up, with the back button
          beside the canvas as in the Figma. Narrower than that, the panels stack and split the
          height. */}
      <main className="flex min-h-0 flex-1 flex-col gap-xl p-md lg:flex-row lg:gap-xxxl lg:px-xxxl">
        <Link
          to="/profile/outfits"
          aria-label="Back to saved outfits"
          className="flex size-avatar-md shrink-0 items-center justify-center self-start rounded-full border text-subheading focus-ring"
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
              <IconButton
                icon={ArrowsOut}
                label="Expand the outfit, coming soon"
                variant="outlined"
                disabled
                title="Coming soon"
              />
            </Box>
          </OutfitCanvas>
        </Box>
        {/* Only the pieces list scrolls. The header and the sections below it stay in place. */}
        <section className="flex min-h-0 flex-1 flex-col gap-md lg:w-content-md lg:flex-none">
          <header className="flex shrink-0 flex-col gap-sm border-b pb-md">
            <Box className="flex items-center justify-between gap-md">
              <Text variant="heading" className="min-w-0 break-words">
                {name}
              </Text>
              <Box className="flex shrink-0 items-center gap-sm">
                <IconButton
                  icon={Plus}
                  label="Save the outfit to a collection, coming soon"
                  variant="outlined"
                  disabled
                  title="Coming soon"
                />
                <ShareOutfit outfitId={outfitId} />
              </Box>
            </Box>
            <Text variant="body" className="text-secondary">
              {PLACEHOLDER_DESCRIPTION}
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
    </OutfitDetailsFrame>
  );
}
