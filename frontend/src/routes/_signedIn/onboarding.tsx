import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { AccountError, accountStatusQuery } from "@/account";
import { apiFetch } from "@/api";
import { Box, Button, ImageCard, ProgressBar, Tabs, Text } from "@/design-system";

export const Route = createFileRoute("/_signedIn/onboarding")({
  beforeLoad: async ({ context }) => {
    const status = await context.queryClient.query(accountStatusQuery(context.userId));

    if (status === "none") {
      throw redirect({ to: "/create-account", replace: true });
    }

    if (status === "ready") {
      throw redirect({ to: "/", replace: true });
    }
  },
  errorComponent: AccountError,
  component: Onboarding,
});

type Field = "style" | "neckline" | "bottoms" | "shoes";

type FitField = Exclude<Field, "style">;

// An empty list means no preference. Values match StylePreferences in backend/openapi.yaml.
type StylePreferences = Record<Field, string[]>;

type Question = {
  title: string;
  options: { value: string; label: string }[];
};

// Labels are placeholders until design sends the real copy and images.
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

// One step per question: style, then each fit tab.
const stepCount = 1 + fitTabs.length;

function Onboarding() {
  const [step, setStep] = useState<"style" | "fit">("style");
  const [fitTab, setFitTab] = useState<FitField>("neckline");

  const [preferences, setPreferences] = useState<StylePreferences>({
    style: [],
    neckline: [],
    bottoms: [],
    shoes: [],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fitTabIndex = fitTabs.findIndex((tab) => tab.value === fitTab);

  function toggle(field: Field, value: string, pressed: boolean) {
    setPreferences((current) => ({
      ...current,
      [field]: pressed
        ? [...current[field], value]
        : current[field].filter((picked) => picked !== value),
    }));
  }

  function clear(field: Field) {
    setPreferences((current) => ({ ...current, [field]: [] }));
  }

  async function finish(finalPreferences: StylePreferences) {
    setError(null);
    setSaving(true);

    try {
      const res = await apiFetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style_preferences: finalPreferences }),
      });

      if (!res.ok) {
        throw new Error(`PATCH /api/v1/users/me failed: ${res.status}`);
      }

      // Has to stay a full page load. The cached account status never expires, so a router
      // navigation would send the user straight back here.
      window.location.assign("/");
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function nextFitTab(finalPreferences: StylePreferences) {
    const next = fitTabs[fitTabIndex + 1];

    if (next === undefined) {
      void finish(finalPreferences);

      return;
    }

    setFitTab(next.value);
  }

  function skipFitTab() {
    const cleared = { ...preferences, [fitTab]: [] };
    clear(fitTab);
    nextFitTab(cleared);
  }

  if (step === "style") {
    return (
      <Box className="flex min-h-screen flex-col items-center gap-lg p-xl">
        <Header step={1} onBack={null} />
        <Text variant="heading">{questions.style.title}</Text>
        <Cards field="style" preferences={preferences} onToggle={toggle} />
        <Button label="Next" onClick={() => setStep("fit")} />
        <Button
          label="Skip →"
          variant="secondary"
          size="sm"
          className="self-end"
          onClick={() => {
            clear("style");
            setStep("fit");
          }}
        />
      </Box>
    );
  }

  const onLastTab = fitTabIndex === fitTabs.length - 1;

  return (
    <Box className="flex min-h-screen flex-col items-center gap-lg p-xl">
      <Header step={2 + fitTabIndex} onBack={() => setStep("style")} />
      <Text variant="heading">{questions[fitTab].title}</Text>
      <Tabs tabs={fitTabs} value={fitTab} onValueChange={setFitTab}>
        <Cards field={fitTab} preferences={preferences} onToggle={toggle} />
      </Tabs>
      <Button
        label={onLastTab ? "Finish" : "Next"}
        loading={saving}
        onClick={() => nextFitTab(preferences)}
      />
      {error && <p className="text-error text-body">Error: {error}</p>}
      <Button
        label="I don't have a preference →"
        variant="secondary"
        size="sm"
        className="self-end"
        disabled={saving}
        onClick={skipFitTab}
      />
    </Box>
  );
}

type HeaderProps = {
  step: number;
  onBack: (() => void) | null;
};

// A fixed-height row on every screen, so showing or hiding Back doesn't move the page.
function Header({ step, onBack }: HeaderProps) {
  return (
    <Box className="grid h-xxl w-full grid-cols-3 items-center">
      {onBack && (
        <Button
          label="← Back"
          variant="secondary"
          size="sm"
          className="justify-self-start"
          onClick={onBack}
        />
      )}
      <Box className="col-start-2 flex justify-center">
        <ProgressBar label="Sign-up progress" step={step} stepCount={stepCount} />
      </Box>
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
          showCheckbox
          className="min-h-card min-w-card"
        />
      ))}
    </Box>
  );
}
