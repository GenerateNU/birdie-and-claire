import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type SubmitEvent } from "react";

import { apiFetch } from "@/api";
import { Button, Empty, Spinner, Text, TextField } from "@/design-system";

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
    <div className="min-h-screen p-xl">
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
        <p className="mt-xs text-caption text-secondary">{(elapsedMs / 1000).toFixed(1)} s</p>
      )}
      {error && <p className="mt-xs text-caption text-error">Error: {error}</p>}
      {loading && <Spinner label="Finding pieces…" className="mt-lg" />}

      {response && (
        <div className="mt-xl flex flex-col gap-xl">
          <ExpandedQuery expandedQuery={response.expanded_query} />

          <div className="flex flex-col gap-xl lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-xl">
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
            </div>
            {selected && (
              <ProductDetails product={selected} niceTags={response.expanded_query.nice_tags} />
            )}
          </div>

          <details className="text-caption">
            <summary className="cursor-pointer text-secondary hover:text-primary">Raw JSON</summary>
            <pre className="mt-xs overflow-x-auto rounded-md border bg-surface p-md">
              {JSON.stringify(response, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

type ExpandedQueryProps = {
  expandedQuery: RecommendationExpandedQuery;
};

function ExpandedQuery({ expandedQuery }: ExpandedQueryProps) {
  return (
    <section className="flex flex-col gap-md">
      <Text variant="subheading">What the stylist heard</Text>
      <div className="grid gap-sm sm:grid-cols-3">
        {SLOTS.map((slot) => (
          <div key={slot} className="rounded-md bg-surface p-md">
            <p className="text-caption capitalize text-secondary">{slot}</p>
            <p className="text-body">{expandedQuery.slots[slot] || "Skipped"}</p>
          </div>
        ))}
      </div>
      <TagRow label="Leaning toward" tags={expandedQuery.nice_tags} struck={false} />
      <TagRow label="Leaving out" tags={expandedQuery.exclude_tags} struck />
    </section>
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
    <div className="flex flex-wrap items-center gap-xs">
      <span className="w-[120px] text-caption text-secondary">{label}</span>
      {tags.map((tag) => (
        <span
          key={tag}
          className={
            struck
              ? "rounded-full border px-sm py-xxxs text-caption text-secondary line-through"
              : "rounded-full bg-primary px-sm py-xxxs text-caption text-inverse"
          }
        >
          {tag}
        </span>
      ))}
    </div>
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
    <section className="flex flex-col gap-sm">
      <div className="flex items-baseline gap-sm">
        <Text variant="subheading">{slot}</Text>
        {phrase && <span className="text-caption text-secondary">“{phrase}”</span>}
      </div>
      {products.length === 0 ? (
        <Empty title="No results" className="text-secondary" />
      ) : (
        <ul className="grid grid-cols-2 gap-sm sm:grid-cols-3 xl:grid-cols-5">
          {products.map((product, index) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onSelect(product)}
                aria-pressed={product.id === selectedId}
                className="focus-ring flex w-full flex-col gap-xs rounded-md border p-xs text-left aria-pressed:border-primary"
              >
                <span className="relative block">
                  <ProductImage product={product} />
                  <span className="absolute left-xs top-xs rounded-full bg-primary px-xs text-caption text-inverse">
                    #{index + 1}
                  </span>
                </span>
                <span className="line-clamp-2 text-caption">{product.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
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
    <aside className="flex flex-col gap-md rounded-md border p-md lg:sticky lg:top-md lg:w-[360px] lg:shrink-0">
      <ProductImage product={product} />
      <div>
        <p className="text-caption capitalize text-secondary">
          {product.slot} · {product.product_type ?? "No type"}
        </p>
        <Text variant="body" className="font-semibold">
          {product.title}
        </Text>
        <p className="text-caption text-secondary">{product.handle}</p>
      </div>
      <div className="flex flex-wrap gap-xxs">
        {product.tags.map((tag) => (
          <span
            key={tag}
            className={
              wanted.has(tag.toLowerCase())
                ? "rounded-full bg-primary px-xs py-xxxs text-caption text-inverse"
                : "rounded-full bg-surface px-xs py-xxxs text-caption"
            }
          >
            {tag}
          </span>
        ))}
      </div>
    </aside>
  );
}

type ProductImageProps = {
  product: Product;
};

function ProductImage({ product }: ProductImageProps) {
  return (
    <span className="block aspect-portrait w-full overflow-hidden rounded-sm bg-placeholder">
      {/* Decorative: the title beside it names the item. multiply blends the photo's white
          background into the tile, as on the outfit page. */}
      {product.image_url !== null && (
        <img
          src={product.image_url}
          alt=""
          className="h-full w-full object-contain mix-blend-multiply"
        />
      )}
    </span>
  );
}
