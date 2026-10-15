import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type SubmitEvent } from "react";

import { apiFetch } from "../../../api";

export const Route = createFileRoute("/_signedIn/_hasAccount/recommend-test")({
  component: RecommendTest,
});

const SLOTS = ["top", "bottom", "accessory"] as const;

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

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setElapsedMs(null);
    setResponse(null);

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
      setResponse((await res.json()) as RecommendationResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setElapsedMs(Math.round(performance.now() - start));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-8">
      <Link className="text-secondary text-sm underline hover:text-primary" to="/">
        ← Home
      </Link>
      <h1 className="text-3xl font-bold mt-4 mb-2">Recommend test</h1>
      <p className="text-secondary text-sm mb-8">
        Describe what you are shopping for. A cold embedder can take many seconds.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4 max-w-md">
        <label className="flex flex-col gap-1 text-sm">
          Query
          <input
            type="text"
            maxLength={200}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded border bg-surface px-3 py-2 text-primary"
          />
        </label>
        <button
          type="submit"
          disabled={loading || query.trim() === ""}
          className="rounded bg-primary px-3 py-2 text-sm text-inverse disabled:opacity-50"
        >
          Submit
        </button>

        {loading && <p className="text-secondary text-sm">Loading...</p>}
        {elapsedMs !== null && <p className="text-secondary text-sm">{elapsedMs} ms</p>}
        {error && <p className="text-error text-sm">Error: {error}</p>}
      </form>

      {response && (
        <div className="flex flex-col gap-4 max-w-md mt-8">
          <div className="bg-surface rounded-lg p-4 border">
            <p className="font-semibold">Expanded query</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {SLOTS.map((slot) => (
                <li key={slot}>
                  <span className="text-secondary capitalize">{slot}:</span>{" "}
                  {response.expanded_query.slots[slot] || "(skipped)"}
                </li>
              ))}
              <li>
                <span className="text-secondary">Exclude tags:</span>{" "}
                {response.expanded_query.exclude_tags.join(", ") || "(none)"}
              </li>
              <li>
                <span className="text-secondary">Nice tags:</span>{" "}
                {response.expanded_query.nice_tags.join(", ") || "(none)"}
              </li>
            </ul>
          </div>

          {SLOTS.map((slot) => (
            <div key={slot} className="bg-surface rounded-lg p-4 border">
              <p className="font-semibold capitalize">{slot}</p>
              {response[slot].length === 0 ? (
                <p className="text-secondary text-sm mt-2">No results</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2">
                  {response[slot].map((product) => (
                    <li key={product.id} className="text-sm">
                      <p>{product.title}</p>
                      <p className="text-secondary text-xs">
                        {product.product_type ?? "(no type)"}
                      </p>
                      <p className="text-secondary text-xs break-all">
                        {product.tags.length > 0 ? product.tags.join(", ") : "(no tags)"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <details className="text-sm">
            <summary className="cursor-pointer text-secondary hover:text-primary">Raw JSON</summary>
            <pre className="mt-2 bg-surface rounded-lg p-4 border text-xs overflow-x-auto">
              {JSON.stringify(response, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
