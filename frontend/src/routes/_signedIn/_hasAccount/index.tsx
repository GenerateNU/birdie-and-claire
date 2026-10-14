import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { signOut } from "@/account";
import { apiFetch } from "@/api";
import { Button } from "@/design-system";

export const Route = createFileRoute("/_signedIn/_hasAccount/")({
  component: Home,
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

function Home() {
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  async function seedOutfits() {
    setSeeding(true);
    setSeedStatus(null);

    try {
      for (let i = 1; i <= SEED_OUTFIT_COUNT; i++) {
        const res = await apiFetch("/api/v1/outfits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Random outfit ${i}`,
            product_ids: SEED_PRODUCT_GROUPS.map(pickRandom),
          }),
        });

        if (!res.ok) {
          throw new Error(`${res.status}: ${await res.text()}`);
        }
      }

      setSeedStatus(`Created ${SEED_OUTFIT_COUNT} outfits.`);
    } catch (err) {
      setSeedStatus(`Seeding failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      // Refetch the outfits list even after a partial failure, since some outfits may exist.
      await queryClient.invalidateQueries({ queryKey: ["/api/v1/outfits"] });
      setSeeding(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">Birdie &amp; Claire</h1>
      <p className="text-gray-400 text-sm mb-4">
        The API is at <code className="text-gray-200">/api/v1</code>. Docs are at{" "}
        <a className="underline hover:text-white" href="http://localhost:8080/docs">
          localhost:8080/docs
        </a>
        .
      </p>
      <Link className="block underline hover:text-white text-sm" to="/profile-picture-test">
        Profile picture test →
      </Link>
      <Link className="block underline hover:text-white text-sm" to="/outfits">
        Outfits →
      </Link>
      <Link className="block underline hover:text-white text-sm" to="/recommend-test">
        Recommend test →
      </Link>
      <div className="mt-6 flex flex-col items-start gap-2">
        <Button
          label="Seed random outfits"
          loading={seeding}
          loadingLabel="Seeding…"
          onClick={() => void seedOutfits()}
        />
        {seedStatus && <p className="text-gray-400 text-sm">{seedStatus}</p>}
      </div>
      <div className="mt-6">
        <Button label="Sign out" onClick={signOut} />
      </div>
    </div>
  );
}
