import { CoatHangerIcon, PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { listOutfitsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { Box, EmptyState, ErrorState, OutfitCard, Skeleton } from "@/design-system";
import { HomeSection } from "@/features/home/home-section";
import { OutfitCanvas } from "@/features/outfits/outfit-canvas";
import { piecesLine } from "@/features/outfits/saved-outfits";

const RECENT_COUNT = 4;

export function RecentOutfits() {
  return (
    <HomeSection
      title="Recently Created Outfits"
      link={{ label: "See all", to: "/profile/outfits" }}
    >
      <RecentOutfitsBody />
    </HomeSection>
  );
}

function RecentOutfitsBody() {
  const navigate = useNavigate();

  // GET /outfits returns newest first.
  const { data, isError, isFetching, refetch } = useQuery({
    ...listOutfitsOptions({ query: { limit: RECENT_COUNT } }),
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Also true for a retry after an error, so the error and its button never sit idle during a refetch.
  if (data === undefined && isFetching) {
    return (
      <Box role="status" aria-label="Loading your outfits">
        <OutfitRow>
          {Array.from({ length: RECENT_COUNT }, (_, index) => (
            <li key={index}>
              <Skeleton className="h-outfit w-outfit" />
            </li>
          ))}
        </OutfitRow>
      </Box>
    );
  }

  // No data and not fetching without an error means the request is paused offline.
  if (isError || data === undefined) {
    return <ErrorState message="Couldn't load your outfits." onRetry={() => void refetch()} />;
  }

  if (data.items.length === 0) {
    return (
      <EmptyState
        icon={CoatHangerIcon}
        title="No outfit yet"
        description="Your saved outfits live here"
        action={{
          label: "Add outfit",
          icon: PlusIcon,
          onClick: () => void navigate({ to: "/create-outfit" }),
        }}
      />
    );
  }

  return (
    <OutfitRow>
      {data.items.map((outfit) => (
        <li key={outfit.id}>
          <OutfitCard
            mode="browse"
            title={outfit.name}
            pieces={piecesLine(outfit.products)}
            src={null}
            image={<OutfitCanvas products={outfit.products} variant="card" />}
            onOpen={() =>
              void navigate({ to: "/outfits/$outfitId", params: { outfitId: outfit.id } })
            }
          />
        </li>
      ))}
    </OutfitRow>
  );
}

// The padding is the hover outline's width, so the outline stays inside the row, and the negative
// margin keeps the cards on the page's edge.
function OutfitRow({ children }: { children: ReactNode }) {
  return <ul className="flex flex-wrap gap-xl p-card-hover -m-card-hover">{children}</ul>;
}
