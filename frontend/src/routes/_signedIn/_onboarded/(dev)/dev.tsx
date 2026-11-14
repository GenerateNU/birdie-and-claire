import { CaretRight } from "@phosphor-icons/react";
import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import {
  listOutfitsInfiniteQueryKey,
  listProductsOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { createOutfit } from "@/api/generated/sdk.gen";
import { Box, Button, Link, Page, Text } from "@/design-system";

export const Route = createFileRoute("/_signedIn/_onboarded/(dev)/dev")({
  component: Dev,
});

const SEED_OUTFIT_COUNT = 5;

// the most the products endpoint returns in one page, which covers the whole catalog
const SEED_PRODUCT_LIMIT = 100;

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// A seeded outfit takes one random product from each slot the synced catalog has.
async function seedOutfits(queryClient: QueryClient) {
  const page = await queryClient.fetchQuery(
    listProductsOptions({ query: { limit: SEED_PRODUCT_LIMIT } }),
  );

  const productIdsBySlot = new Map<string, string[]>();

  for (const product of page.items) {
    const slotProductIds = productIdsBySlot.get(product.slot) ?? [];

    slotProductIds.push(product.id);
    productIdsBySlot.set(product.slot, slotProductIds);
  }

  for (let i = 1; i <= SEED_OUTFIT_COUNT; i++) {
    await createOutfit({
      body: {
        name: `Random outfit ${i}`,
        product_ids: [...productIdsBySlot.values()].map(pickRandom),
      },
      throwOnError: true,
    });
  }
}

function Dev() {
  const queryClient = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: () => seedOutfits(queryClient),
    // Refetch the outfits list even after a partial failure, since some outfits may exist.
    onSettled: () => queryClient.invalidateQueries({ queryKey: listOutfitsInfiniteQueryKey() }),
  });

  return (
    <Page>
      <Text variant="heading" className="mb-xs">
        Dev
      </Text>
      <Text variant="body" className="mb-md text-secondary">
        The API is at <code className="text-primary">/api/v1</code>. Docs are at{" "}
        {/* A plain anchor: /docs is the backend's page, not a route in this app. */}
        <a className="underline" href="/docs">
          /docs
        </a>
        .
      </Text>
      <Box className="flex flex-col items-start gap-xxs">
        <Link variant="text" to="/profile-picture-test" trailingIcon={CaretRight}>
          Profile picture test
        </Link>
        <Link variant="text" to="/playground" trailingIcon={CaretRight}>
          Design system playground
        </Link>
      </Box>
      <Box className="mt-lg flex flex-col items-start gap-xs">
        <Button
          label="Seed random outfits"
          loading={seedMutation.isPending}
          loadingLabel="Seeding…"
          onClick={() => seedMutation.mutate()}
        />
        {seedMutation.isSuccess && (
          <Text variant="body" className="text-secondary">
            Created {SEED_OUTFIT_COUNT} outfits.
          </Text>
        )}
        {seedMutation.isError && (
          <Text variant="body" className="text-error">
            Seeding failed. The console has the error.
          </Text>
        )}
      </Box>
    </Page>
  );
}
