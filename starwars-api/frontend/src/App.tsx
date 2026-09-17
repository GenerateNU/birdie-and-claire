import { useState, type ChangeEvent } from "react";

const FACTIONS = ["rebel", "empire", "jedi", "sith", "neutral"];

// Tip for TODO 2: use threat_score to pick a badge color
//   threat_score > 150  → high threat   → red
//   threat_score 75–150 → medium threat → yellow
//   threat_score < 75   → low threat    → green



interface Character {
  id: number;
  name: string;
  species: string;
  faction: string;
  force_sensitive: boolean;
  power_level: number;
  threat_score: number;
}

export default function App() {
  const [faction, setFaction] = useState("rebel");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch() {
    setLoading(true);
    setError(null);

    try {
      // TODO 1: Fetch characters from the backend for the selected faction.
      //
      // The endpoint is: /api/characters?faction=<faction>
      // (The Vite proxy in vite.config.js forwards /api/* to http://localhost:8080)
      //
      // Steps:
      //   1. Call fetch() with the correct URL including the faction query param
      //   2. If the response is not ok (res.ok === false), throw an Error
      //   3. Parse the body as JSON with res.json()
      //   4. Call setCharacters(...) with the result

            const res = await fetch(`/api/characters?faction=${faction}`);
            if (res.ok === false) {
              throw new Error(`error: ${res.status}`);
            }
            const result = await res.json();

            setCharacters(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold text-yellow-400 mb-2 tracking-wide">
        Rebel Alliance Intelligence Database
      </h1>
      <p className="text-gray-400 mb-8 text-sm">
        Select a faction and scan for known operatives.
      </p>

      {/* Controls */}
      <div className="flex gap-3 mb-8 items-center">
        <select
          value={faction}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setFaction(e.target.value)
          }
          className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          {FACTIONS.map((f) => (
            <option key={f} value={f}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </option>
          ))}
        </select>

        <button
          onClick={handleFetch}
          disabled={loading}
          className="bg-yellow-400 text-gray-950 font-semibold px-4 py-2 rounded hover:bg-yellow-300 disabled:opacity-50 transition-colors"
        >
          {loading ? "Scanning..." : "Scan Faction"}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <p className="text-red-400 mb-6 text-sm">Intel error: {error}</p>
      )}

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map((c) => (
          // Tip for TODO 2: use threat_score to pick a badge color
          //   threat_score > 150  → high threat   → red
          //   threat_score 75–150 → medium threat → yellow
          //   threat_score < 75   → low threat    → green

          // TODO 2: Render a card for each character.
          //
          // Each character object has these fields:
          //   id, name, species, faction, force_sensitive (bool), power_level, threat_score
          //
          // Ideas for the card:
          //   - Bold name as the heading
          //   - Species and faction as secondary text
          //   - A colored badge for threat_score (see the tip at the top of this file)
          //   - Conditionally show a "Force Sensitive" label when force_sensitive is true
          //
          // Hint: replace the <p> below with your full card markup.
          //       key={c.id} must stay on the outermost element.
          <div
            key={c.id}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700"
          >
            <p className="font-semibold">{c.name}</p>
            <p className="text-sm text-gray-400">
              {c.species}, {c.faction}
            </p>

            {c.force_sensitive && (
              <span className="text-xs text-blue-400 block mt-1">
                Force Sensitive
              </span>
            )}

            <span
              className={`inline-block mt-2 text-xs px-2 py-1 rounded ${getThreatColor(c.threat_score)}`}
            >
              Threat: {c.threat_score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getThreatColor(threat_score: number ) {
  if (threat_score > 150) return "bg-red-500";
  if (threat_score >= 75) return "bg-yellow-500"
  return "bg-green-500"
}
