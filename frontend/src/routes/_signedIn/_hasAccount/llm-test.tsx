import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { apiFetch } from "@/api";

export const Route = createFileRoute("/_signedIn/_hasAccount/llm-test")({
  component: LlmTest,
});

type Mode = "plain" | "tool" | "stream" | "structured";

const MODES: { mode: Mode; label: string }[] = [
  { mode: "plain", label: "Plain" },
  { mode: "tool", label: "With current_time tool" },
  { mode: "stream", label: "Streaming" },
  { mode: "structured", label: "Structured (outfit idea)" },
];

interface OutfitIdea {
  occasion: string;
  pieces: string[];
  why: string;
}

/** The request body every /api/v1/llm route accepts; routes ignore the fields they do not use. */
interface LlmRequest {
  prompt: string;
  system?: string;
  use_tool?: boolean;
}

interface StreamEvent {
  event: string;
  data: string;
}

/** Splits a server-sent events buffer into complete events and the unfinished remainder. */
function parseEvents(buffer: string): [StreamEvent[], string] {
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() ?? "";

  const events = blocks.map((block) => {
    let event = "message";
    let data = "";

    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) {
        event = line.slice("event: ".length);
      } else if (line.startsWith("data: ")) {
        data += line.slice("data: ".length);
      }
    }

    return { event, data };
  });

  return [events, rest];
}

async function failureMessage(path: string, res: Response): Promise<string> {
  const status = res.statusText ? `${res.status} (${res.statusText})` : String(res.status);
  const text = (await res.text()).trim();

  if (text === "") {
    return `${path} failed: ${status}`;
  }

  return `${path} failed: ${status}: ${explanation(res, text)}`;
}

function explanation(res: Response, text: string): string {
  if (res.headers.get("Content-Type")?.includes("application/problem+json")) {
    try {
      // SAFETY: huma writes problem+json bodies as huma.ErrorModel, whose detail and title are strings.
      const problem = JSON.parse(text) as { detail?: string; title?: string };
      const message = problem.detail || problem.title;

      if (message) {
        return message;
      }
    } catch {
      // a mislabeled body falls back to its raw text below
    }
  }

  return text.slice(0, 200);
}

function LlmTest() {
  const [mode, setMode] = useState<Mode>("plain");
  const [system, setSystem] = useState("");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function postJson(path: string, body: LlmRequest): Promise<Response> {
    const res = await apiFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(await failureMessage(path, res));
    }

    return res;
  }

  async function generate() {
    const res = await postJson("/api/v1/llm/generate", {
      prompt,
      system,
      use_tool: mode === "tool",
    });

    // SAFETY: a 2xx from /api/v1/llm/generate is the LLMGenerateOutput body in controllers/llm.go.
    const body = (await res.json()) as { text: string };
    setOutput(body.text);
  }

  async function generateStructured() {
    const res = await postJson("/api/v1/llm/generate/structured", { prompt });

    // SAFETY: a 2xx from the structured route is the LLMOutfitIdea body in controllers/llm.go.
    const idea = (await res.json()) as OutfitIdea;
    setOutput(JSON.stringify(idea, null, 2));
  }

  // EventSource cannot send the Authorization header, so the stream is read with fetch.
  async function stream() {
    const res = await postJson("/api/v1/llm/stream", { prompt, system });

    if (!res.body) {
      throw new Error("response has no body");
    }

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";

    for (;;) {
      const { value, done } = await reader.read();

      if (done) {
        throw new Error("stream ended without a done event");
      }

      const [events, rest] = parseEvents(buffer + value);
      buffer = rest;

      for (const { event, data } of events) {
        if (event === "done") {
          return;
        }

        if (event === "error") {
          // SAFETY: the error event's data is LLMStreamError in controllers/llm.go.
          throw new Error((JSON.parse(data) as { message: string }).message);
        }

        // SAFETY: the chunk event's data is LLMStreamChunk in controllers/llm.go.
        const chunk = JSON.parse(data) as { text: string };
        setOutput((previous) => previous + chunk.text);
      }
    }
  }

  async function run() {
    setOutput("");
    setError(null);
    setRunning(true);

    try {
      if (mode === "stream") {
        await stream();
      } else if (mode === "structured") {
        await generateStructured();
      } else {
        await generate();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <a className="text-gray-400 text-sm underline hover:text-white" href="/">
        ← Home
      </a>
      <h1 className="text-3xl font-bold mt-4 mb-2">LLM test</h1>
      <p className="text-gray-400 text-sm mb-8">
        Sign in first. Your user id must be in{" "}
        <code className="text-gray-200">AI_DEV_USER_IDS</code> on the API.
      </p>

      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="flex flex-wrap gap-4 text-sm">
          {MODES.map((option) => (
            <label key={option.mode} className="flex items-center gap-1">
              <input
                type="radio"
                name="mode"
                checked={mode === option.mode}
                onChange={() => setMode(option.mode)}
              />
              {option.label}
            </label>
          ))}
        </div>

        {mode !== "structured" && (
          <label className="flex flex-col gap-1 text-sm">
            System (optional)
            <textarea
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              rows={2}
              className="rounded bg-gray-800 border border-gray-700 p-2"
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Prompt
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="rounded bg-gray-800 border border-gray-700 p-2"
          />
        </label>

        <button
          type="button"
          onClick={run}
          disabled={running || prompt.trim() === ""}
          className="self-start rounded bg-blue-500 px-4 py-2 text-sm disabled:opacity-50"
        >
          {running ? "Running…" : "Run"}
        </button>

        {error && <p className="text-red-400 text-sm">Error: {error}</p>}

        {output && (
          <pre className="whitespace-pre-wrap rounded-lg bg-gray-800 border border-gray-700 p-4 text-sm">
            {output}
          </pre>
        )}
      </div>
    </div>
  );
}
