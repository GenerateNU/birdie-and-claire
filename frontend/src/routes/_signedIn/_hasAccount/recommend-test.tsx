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

const SLOTS = ["top", "bottom", "accessory"] as const;

type Slot = (typeof SLOTS)[number];

interface Product {
  id: string;
  shopify_id: number;
  handle: string;
  title: string;
  product_type: string | null;
  slot: "top" | "bottom" | "accessory" | "shoe";
  tags: string[];
  created_at: string;
  updated_at: string;
  image_url: string | null;
}

interface RecommendationExpandedQuery {
  slots: { top: string; bottom: string; accessory: string };
  exclude_tags: string[];
  nice_tags: string[];
}

interface RecommendationResponse {
  expanded_query: RecommendationExpandedQuery;
  top: Product[];
  bottom: Product[];
  accessory: Product[];
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
  const [query, setQuery] = useState("");
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
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        setError(`${res.status}: ${errorDetail(await res.text())}`);

        return;
      }

      // SAFETY: a 2xx from POST /api/v1/recommend is the RecommendationResponse schema in openapi.yaml.
      const recommendation = (await res.json()) as RecommendationResponse;
      setResponse(recommendation);
      setSelected(SLOTS.flatMap((slot) => recommendation[slot])[0] ?? null);
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
        Describe what you are shopping for. A cold embedder can take many seconds.
      </Text>

      <form onSubmit={submit} className="flex max-w-content-lg items-end gap-sm">
        <TextField
          label="Query"
          maxLength={200}
          value={query}
          onValueChange={setQuery}
          placeholder="clothes for an office sunday social"
          className="flex-1"
        />
        <Button
          type="submit"
          label="Recommend"
          loading={loading}
          loadingLabel="Styling…"
          disabled={query.trim() === ""}
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
              {SLOTS.map((slot) => (
                <SlotResults
                  key={slot}
                  slot={slot}
                  phrase={response.expanded_query.slots[slot]}
                  products={response[slot]}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelected}
                />
              ))}
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
      <Box className="grid gap-sm sm:grid-cols-3">
        {SLOTS.map((slot) => (
          <ListCard key={slot} title={slot} value={expandedQuery.slots[slot] || "Skipped"} />
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

type SlotResultsProps = {
  slot: Slot;
  phrase: string;
  products: Product[];
  selectedId: string | null;
  onSelect: (product: Product) => void;
};

function SlotResults({ slot, phrase, products, selectedId, onSelect }: SlotResultsProps) {
  return (
    <Box className="flex flex-col gap-sm">
      <Box className="flex items-baseline gap-sm">
        <Text variant="subheading">{slot}</Text>
        {phrase && (
          <Text variant="caption" className="text-secondary">
            “{phrase}”
          </Text>
        )}
      </Box>
      {products.length === 0 ? (
        <Empty title="No results" className="text-secondary" />
      ) : (
        <Box className="flex snap-x gap-sm overflow-x-auto pb-xs">
          {products.map((product, index) => (
            <Box key={product.id} className="w-[180px] shrink-0 snap-start">
              <ImageCard
                label={`#${index + 1} ${product.title}`}
                src={product.image_url}
                pressed={product.id === selectedId}
                onPressedChange={() => onSelect(product)}
              />
            </Box>
          ))}
        </Box>
      )}
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
