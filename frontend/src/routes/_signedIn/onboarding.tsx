import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AccountError, requireAccountStatus } from "@/account";
import { apiFetch } from "@/api";
import logo from "@/assets/logo.png";
import { Box, Button, ImageCard, ProgressBar, Tabs, Text } from "@/design-system";

export const Route = createFileRoute("/_signedIn/onboarding")({
  // Finished users may come back to redo it; saving replaces their preferences.
  beforeLoad: ({ context }) => requireAccountStatus(context, ["needs-preferences", "onboarded"]),
  errorComponent: AccountError,
  component: Onboarding,
});

type Field = "style" | "neckline" | "bottoms" | "shoes";

type FitField = Exclude<Field, "style">;

// Matches StylePreferences in backend/openapi.yaml. An empty list means no preference.
type StylePreferences = Record<Field, string[]>;

const noPreferences: StylePreferences = { style: [], neckline: [], bottoms: [], shoes: [] };

type Question = {
  title: string;
  options: { value: string; label: string }[];
};

const questions: Record<Field, Question> = {
  style: {
    title: "What describes your style best?",
    options: [
      { value: "chic_avant_garde", label: "Chic & avant-garde" },
      { value: "timeless_sophisticated", label: "Timeless & sophisticated" },
      { value: "colorful_eclectic", label: "Colorful & eclectic" },
      { value: "comfortable_relaxed", label: "Comfortable & relaxed" },
    ],
  },
  neckline: {
    title: "What neckline do you prefer?",
    options: [
      { value: "modest", label: "Modest" },
      { value: "high", label: "High" },
      { value: "low", label: "Low" },
    ],
  },
  bottoms: {
    title: "What bottoms do you prefer?",
    options: [
      { value: "pants", label: "Pants" },
      { value: "dress", label: "Dress" },
      { value: "skirt", label: "Skirt" },
      { value: "shorts", label: "Shorts" },
    ],
  },
  shoes: {
    title: "What shoes do you prefer?",
    options: [
      { value: "sneakers", label: "Sneakers" },
      { value: "boots", label: "Boots" },
      { value: "sandals", label: "Sandals" },
      { value: "heels", label: "Heels" },
      { value: "flats", label: "Flats" },
    ],
  },
};

const fitTabs: { value: FitField; label: string }[] = [
  { value: "neckline", label: "Neckline" },
  { value: "bottoms", label: "Bottoms" },
  { value: "shoes", label: "Shoes" },
];

const fieldOrder: Field[] = ["style", ...fitTabs.map((tab) => tab.value)];

// Out of 2: empty on style, half full on the fit fields, and full only on the last field, where
// Finish shows.
const progressStepCount = 2;

function progressStep(index: number) {
  if (index === 0) {
    return 0;
  }

  if (index === fieldOrder.length - 1) {
    return progressStepCount;
  }

  return 1;
}

function Onboarding() {
  const [currentField, setCurrentField] = useState<Field>("style");

  const [preferences, setPreferences] = useState<StylePreferences>(noPreferences);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = fieldOrder.indexOf(currentField);
  const onLastField = currentIndex === fieldOrder.length - 1;
  const onFirstField = currentIndex === 0;

  function toggle(field: Field, value: string, pressed: boolean) {
    setPreferences((current) => ({
      ...current,
      [field]: pressed
        ? [...current[field], value]
        : current[field].filter((picked) => picked !== value),
    }));
  }

  async function finish() {
    setError(null);
    setSaving(true);

    try {
      const res = await apiFetch("/api/v1/users/me/style-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!res.ok) {
        throw new Error(`PUT /api/v1/users/me/style-preferences failed: ${res.status}`);
      }

      // Has to stay a full page load. The cached account status never expires, so a router
      // navigation would send the user straight back here.
      window.location.assign("/");
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function nextFieldOrFinish() {
    const next = fieldOrder[currentIndex + 1];

    if (next === undefined) {
      void finish();

      return;
    }

    setCurrentField(next);
  }

  function nextButtonLabel() {
    if (preferences[currentField].length === 0) {
      return "No Preference";
    }

    return onLastField ? "Finish" : "Next";
  }

  return (
    <Box className="flex min-h-screen flex-col p-xl pb-xxl">
      <Box className="grid h-xl w-full grid-cols-3 items-center">
        {/* Back always returns to style; the fit fields switch through the tabs. */}
        {!onFirstField && (
          <Button
            label="← Back"
            variant="secondary"
            size="sm"
            className="justify-self-start"
            disabled={saving}
            onClick={() => setCurrentField("style")}
          />
        )}
        <Box className="col-start-2 flex justify-center">
          <ProgressBar
            label="Sign-up progress"
            step={progressStep(currentIndex)}
            stepCount={progressStepCount}
          />
        </Box>
      </Box>
      <Box className="flex flex-1 flex-col items-center gap-lg">
        <Box className="flex flex-col items-center gap-xs">
          <img src={logo} alt="Birdie & Claire" className="w-full max-w-xs" />
          <Text variant="heading">{questions[currentField].title}</Text>
        </Box>
        {/* Tabs<Field> because the index check can't narrow currentField to a fit field. */}
        {onFirstField ? (
          <Cards field={currentField} preferences={preferences} onToggle={toggle} />
        ) : (
          <Tabs<Field>
            tabs={fitTabs}
            value={currentField}
            onValueChange={setCurrentField}
            disabled={saving}
          >
            <Cards field={currentField} preferences={preferences} onToggle={toggle} />
          </Tabs>
        )}
        <Button label={nextButtonLabel()} loading={saving} onClick={nextFieldOrFinish} />
        {error && (
          <Text variant="body" className="text-error">
            Error: {error}
          </Text>
        )}
      </Box>
      {/* Per design, Skip starts after the first field. It saves what's picked so far, and
          fields left empty save as no preference. */}
      {!onFirstField && (
        <Button
          label="Skip →"
          variant="secondary"
          size="sm"
          className="fixed bottom-lg right-lg"
          disabled={saving}
          onClick={() => void finish()}
        />
      )}
    </Box>
  );
}

type CardsProps = {
  field: Field;
  preferences: StylePreferences;
  onToggle: (field: Field, value: string, pressed: boolean) => void;
};

function Cards({ field, preferences, onToggle }: CardsProps) {
  const { options } = questions[field];

  return (
    <Box className="flex flex-wrap justify-center gap-md">
      {options.map((option) => (
        <ImageCard
          key={option.value}
          label={option.label}
          src={null}
          pressed={preferences[field].includes(option.value)}
          onPressedChange={(pressed) => onToggle(field, option.value, pressed)}
          minSize="lg"
        />
      ))}
    </Box>
  );
}
