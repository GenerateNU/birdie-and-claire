import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type SubmitEvent } from "react";

import { apiFetch } from "@/api";
import {
  Box,
  Button,
  Empty,
  ErrorState,
  ImageCard,
  ListCard,
  Spinner,
  Text,
  TextField,
} from "@/design-system";

export const Route = createFileRoute("/_signedIn/_hasAccount/recommend-test")({
  component: RecommendTest,
});

const SLOTS = ["top", "bottom", "accessory", "shoe"] as const;

type Slot = (typeof SLOTS)[number];

interface Product {
  id: string;
  shopify_id: number;
  handle: string;
  title: string;
  product_type: string | null;
  slot: Slot;
  tags: string[];
  created_at: string;
  updated_at: string;
  image_url: string | null;
}

interface RecommendationExpandedQuery {
  slots: Record<Slot, string>;
  exclude_tags: string[];
  nice_tags: string[];
}

type Outfit = Record<Slot, Product>;

interface RecommendationResponse {
  expanded_query: RecommendationExpandedQuery;
  outfits: Outfit[];
}

interface ErrorModel {
  detail?: string;
}

// a proxy or gateway in front of the API can answer with a non-JSON body
function errorDetail(body: string): string {
  try {
    // SAFETY: a non-2xx from the API is the ErrorModel schema in openapi.yaml; detail is optional there.
    return (JSON.parse(body) as ErrorModel).detail ?? body;
  } catch {
    return body;
  }
}

function RecommendTest() {
  const [occasion, setOccasion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [response, setResponse] = useState<RecommendationResponse | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setElapsedMs(null);
    setResponse(null);
    setSelected(null);

    const start = performance.now();

    try {
      const res = await apiFetch("/api/v1/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion }),
      });

      if (!res.ok) {
        setError(`${res.status}: ${errorDetail(await res.text())}`);

        return;
      }

      // SAFETY: a 2xx from POST /api/v1/recommend is the RecommendationResponse schema in openapi.yaml.
      const recommendation = (await res.json()) as RecommendationResponse;
      setResponse(recommendation);
      setSelected(recommendation.outfits.at(0)?.top ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setElapsedMs(Math.round(performance.now() - start));
      setLoading(false);
    }
  }

  return (
    <Box className="min-h-screen p-xl">
      <Link className="text-secondary text-body underline hover:text-primary" to="/">
        ← Home
      </Link>
      <Text variant="heading" className="mt-md">
        Recommend test
      </Text>
      <Text variant="body" className="mb-lg text-secondary">
        Name the occasion. A cold embedder can take many seconds.
      </Text>

      <form onSubmit={submit} className="flex max-w-content-lg items-end gap-sm">
        <TextField
          label="Occasion"
          maxLength={100}
          value={occasion}
          onValueChange={setOccasion}
          placeholder="office sunday social"
          className="flex-1"
        />
        <Button
          type="submit"
          label="Recommend"
          loading={loading}
          loadingLabel="Styling…"
          disabled={occasion.trim() === ""}
        />
      </form>
      {elapsedMs !== null && (
        <Text variant="caption" className="mt-xs block text-secondary">
          {(elapsedMs / 1000).toFixed(1)} s
        </Text>
      )}
      {error && <ErrorState message={`Error: ${error}`} className="mt-xs text-error" />}
      {loading && <Spinner label="Finding pieces…" className="mt-lg" />}

      {response && (
        <Box className="mt-xl flex flex-col gap-xl">
          <ExpandedQuery expandedQuery={response.expanded_query} />

          <Box className="flex flex-col gap-xl lg:flex-row lg:items-start">
            <Box className="flex min-w-0 flex-1 flex-col gap-xl">
              {response.outfits.length === 0 ? (
                <Empty title="No outfits" className="text-secondary" />
              ) : (
                response.outfits.map((outfit, index) => (
                  <OutfitResult
                    key={outfit.top.id}
                    rank={index + 1}
                    outfit={outfit}
                    selectedId={selected?.id ?? null}
                    onSelect={setSelected}
                  />
                ))
              )}
            </Box>
            {selected && (
              <ProductDetails product={selected} niceTags={response.expanded_query.nice_tags} />
            )}
          </Box>

          <Box className="flex flex-col items-start gap-xs">
            <Button
              label={showRawJson ? "Hide raw JSON" : "Show raw JSON"}
              variant="secondary"
              size="sm"
              onClick={() => setShowRawJson(!showRawJson)}
            />
            {showRawJson && (
              <Box className="w-full overflow-x-auto rounded-md border bg-surface p-md">
                <Text variant="caption" className="whitespace-pre font-mono">
                  {JSON.stringify(response, null, 2)}
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

type ExpandedQueryProps = {
  expandedQuery: RecommendationExpandedQuery;
};

function ExpandedQuery({ expandedQuery }: ExpandedQueryProps) {
  return (
    <Box className="flex flex-col gap-md">
      <Text variant="subheading">What the stylist heard</Text>
      <Box className="grid gap-sm sm:grid-cols-4">
        {SLOTS.map((slot) => (
          <ListCard key={slot} title={slot} value={expandedQuery.slots[slot]} />
        ))}
      </Box>
      <TagRow label="Leaning toward" tags={expandedQuery.nice_tags} struck={false} />
      <TagRow label="Leaving out" tags={expandedQuery.exclude_tags} struck />
    </Box>
  );
}

type TagRowProps = {
  label: string;
  tags: string[];
  struck: boolean;
};

function TagRow({ label, tags, struck }: TagRowProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <Box className="flex flex-wrap items-center gap-xs">
      <Text variant="caption" className="w-[120px] text-secondary">
        {label}
      </Text>
      {tags.map((tag) => (
        <Text
          key={tag}
          variant="caption"
          className={
            struck
              ? "rounded-full border px-sm py-xxxs text-secondary line-through"
              : "rounded-full bg-primary px-sm py-xxxs text-inverse"
          }
        >
          {tag}
        </Text>
      ))}
    </Box>
  );
}

type OutfitResultProps = {
  rank: number;
  outfit: Outfit;
  selectedId: string | null;
  onSelect: (product: Product) => void;
};

function OutfitResult({ rank, outfit, selectedId, onSelect }: OutfitResultProps) {
  return (
    <Box className="flex flex-col gap-sm">
      <Text variant="subheading">Outfit {rank}</Text>
      <Box className="flex snap-x gap-sm overflow-x-auto pb-xs">
        {SLOTS.map((slot) => (
          <Box key={slot} className="w-[180px] shrink-0 snap-start">
            <ImageCard
              label={`${slot}: ${outfit[slot].title}`}
              src={outfit[slot].image_url}
              pressed={outfit[slot].id === selectedId}
              onPressedChange={() => onSelect(outfit[slot])}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

type ProductDetailsProps = {
  product: Product;
  niceTags: string[];
};

function ProductDetails({ product, niceTags }: ProductDetailsProps) {
  // the backend lowercases nice tags before matching, and stored tags keep the catalog's casing
  const wanted = new Set(niceTags.map((tag) => tag.toLowerCase()));

  return (
    <Box className="flex flex-col gap-md rounded-md border p-md lg:sticky lg:top-md lg:w-[360px] lg:shrink-0">
      {/* A plain img, since the design system's only image component, ImageCard, is a toggle.
          Decorative: the title below names the item. multiply blends the photo's white
          background into the tile, as on the outfit page. */}
      <Box className="aspect-portrait w-full overflow-hidden rounded-sm bg-placeholder">
        {product.image_url !== null && (
          <img
            src={product.image_url}
            alt=""
            className="h-full w-full object-contain mix-blend-multiply"
          />
        )}
      </Box>
      <Box className="flex flex-col">
        <Text variant="caption" className="capitalize text-secondary">
          {product.slot} · {product.product_type ?? "No type"}
        </Text>
        <Text variant="body" className="font-semibold">
          {product.title}
        </Text>
        <Text variant="caption" className="text-secondary">
          {product.handle}
        </Text>
      </Box>
      <Box className="flex flex-wrap gap-xxs">
        {product.tags.map((tag) => (
          <Text
            key={tag}
            variant="caption"
            className={
              wanted.has(tag.toLowerCase())
                ? "rounded-full bg-primary px-xs py-xxxs text-inverse"
                : "rounded-full bg-surface px-xs py-xxxs"
            }
          >
            {tag}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
