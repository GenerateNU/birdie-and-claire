import { useState } from "react";

import { usePagination } from "./utils/usePagination";

type Character = {
  id: number;
  name: string;
  species: string;
  faction: string;
  force_sensitive: boolean;
  power_level: number;
  threat_score: number;
};

const FACTIONS = ["rebel", "empire", "jedi", "sith", "neutral"] as const;

// Small enough that the seed data pages rather than fitting in one response.
const PAGE_SIZE = 2;

export default function App() {
  const [faction, setFaction] = useState<string>(FACTIONS[0]);

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = usePagination<
    Character,
    { faction: string }
  >("/api/v1/characters", { faction }, PAGE_SIZE);

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">Characters</h1>
      <p className="text-gray-400 text-sm mb-6">
        Paged {PAGE_SIZE} at a time from <code className="text-gray-200">/api/v1/characters</code>.
      </p>

      <div className="flex gap-2 mb-6">
        {FACTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFaction(option)}
            className={
              option === faction
                ? "px-3 py-1 rounded bg-white text-gray-950 text-sm"
                : "px-3 py-1 rounded bg-gray-800 text-gray-300 text-sm hover:bg-gray-700"
            }
          >
            {option}
          </button>
        ))}
      </div>

      {error !== null && (
        <p className="text-red-400 text-sm mb-4">Could not load characters: {error.message}</p>
      )}

      <ul className="space-y-2 mb-6">
        {items.map((character) => (
          <li
            key={character.id}
            className="flex items-baseline justify-between rounded bg-gray-900 px-4 py-3"
          >
            <span>
              {character.name}
              <span className="text-gray-500 text-sm ml-2">{character.species}</span>
            </span>
            <span className="text-gray-400 text-sm">threat {character.threat_score}</span>
          </li>
        ))}
      </ul>

      {items.length === 0 && !isPending && error === null && (
        <p className="text-gray-500 text-sm">No characters in this faction.</p>
      )}

      {hasNextPage && (
        <button
          type="button"
          onClick={() => void fetchNextPage()}
          disabled={isFetchingNextPage}
          className="px-4 py-2 rounded bg-gray-800 text-sm hover:bg-gray-700 disabled:opacity-50"
        >
          {isFetchingNextPage ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}
