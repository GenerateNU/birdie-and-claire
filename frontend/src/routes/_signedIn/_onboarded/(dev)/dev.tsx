import { CaretRight } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { listOutfitsInfiniteQueryKey } from "@/api/generated/@tanstack/react-query.gen";
import { createOutfit } from "@/api/generated/sdk.gen";
import { Box, Button, Link, Page, Text } from "@/design-system";

export const Route = createFileRoute("/_signedIn/_onboarded/(dev)/dev")({
  component: Dev,
});

// Product IDs from backend/cmd/tasks/seeds/products.sql, which every dev and preview database has.
// A seeded outfit takes one product from each group: top, bottom, accessory, shoe.
const SEED_PRODUCT_GROUPS = [
  [
    "63f8fe1f-917f-4a3d-a3b5-78c114a10aee", // Sweaters: Benetton Blue Sweater
    "f97a8bf9-7283-4321-a17b-a15944bbd32e", // Tops: Gini and Jony Knit White Top
    "74b64b1a-3e59-459d-a45d-c9be21032812", // Shirts: Turtle Check Navy Blue Shirt
    "a64a8b54-06b0-40a6-963a-ac59f17a7083", // Tshirts: Puma Grey T-shirt
  ],
  [
    "602c3342-e66e-4200-ba6c-15cab86fc370", // Skirts: Mineral Grey Skirt
    "0c48e46b-23f6-4a6e-ac7e-7755f9ab7114", // Skirts: Urban Yoga Blue Skirt
    "b22d9978-87a7-45a4-96cf-a7f999bf5945", // Jeans: Jealous 21 Black Jeans
    "bf4493d4-664c-4be3-8664-01a13ec33cf4", // Trousers: ONLY Blue Trousers
  ],
  [
    "49fc8c0f-a8e0-43c1-bd90-b0e01f252f36", // Belts: Fossil Black Weave Belt
    "1d5a7fb5-e856-45d5-a80f-dcc06ec1ab48", // Scarves: Femella Brown Scarf
    "a53d37e9-fa8f-4b53-baec-1791d2a02ce2", // Handbags: Murcia Blue Handbag
  ],
  [
    "4143606a-b72c-443d-a917-78268a94e6ee", // Flats: Catwalk Brown Flats
    "95eda3c4-c086-4c38-98e8-25a6e47977d4", // Heels: Catwalk Grey Heels
    "8cafedd2-2a20-46d9-a654-9f9a6f6ec9bf", // Casual Shoes: Gas Europa White Shoes
  ],
];

const SEED_OUTFIT_COUNT = 5;

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function seedOutfits() {
  for (let i = 1; i <= SEED_OUTFIT_COUNT; i++) {
    await createOutfit({
      body: { name: `Random outfit ${i}`, product_ids: SEED_PRODUCT_GROUPS.map(pickRandom) },
      throwOnError: true,
    });
  }
}

function Dev() {
  const queryClient = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: seedOutfits,
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
