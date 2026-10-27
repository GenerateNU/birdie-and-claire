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

// Matches StylePreferences in backend/openapi.yaml. An empty list means no preference.
type StylePreferences = Record<Field, string[]>;

const noPreferences: StylePreferences = { style: [], neckline: [], bottoms: [], shoes: [] };

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

// Style is step 1, and each fit tab is one more step after it.
const stepCount = 1 + fitTabs.length;

function Onboarding() {
  const [screen, setScreen] = useState<"style" | "fit">("style");
  const [fitTab, setFitTab] = useState<FitField>("neckline");

  const [preferences, setPreferences] = useState<StylePreferences>(noPreferences);

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

  async function finish(answers: StylePreferences) {
    setError(null);
    setSaving(true);

    try {
      const res = await apiFetch("/api/v1/users/me/style-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
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

  function nextFitTabOrFinish(answers: StylePreferences) {
    const next = fitTabs[fitTabIndex + 1];

    if (next === undefined) {
      void finish(answers);

      return;
    }

    setFitTab(next.value);
  }

  function skipFitTab() {
    // Passed on directly, because finish runs before the state update lands.
    const cleared = { ...preferences, [fitTab]: [] };
    setPreferences(cleared);
    nextFitTabOrFinish(cleared);
  }

  // Skip saves "no preference" for everything so onboarding isn't shown again. Back on the
  // style screen does the same until design decides.
  function skipOnboarding() {
    void finish(noPreferences);
  }

  const errorMessage = error && (
    <Text variant="body" className="text-error">
      Error: {error}
    </Text>
  );

  const skipButton = (
    <Button
      label="Skip →"
      variant="secondary"
      size="sm"
      className="self-end"
      disabled={saving}
      onClick={skipOnboarding}
    />
  );

  if (screen === "style") {
    return (
      <Box className="flex min-h-screen flex-col items-center gap-lg p-xl">
        <Header step={1} saving={saving} onBack={skipOnboarding} />
        <Text variant="heading">{questions.style.title}</Text>
        <Cards field="style" preferences={preferences} onToggle={toggle} />
        <Button label="Next" disabled={saving} onClick={() => setScreen("fit")} />
        {errorMessage}
        {skipButton}
      </Box>
    );
  }

  const onLastTab = fitTabIndex === fitTabs.length - 1;

  return (
    <Box className="flex min-h-screen flex-col items-center gap-lg p-xl">
      <Header step={2 + fitTabIndex} saving={saving} onBack={() => setScreen("style")} />
      <Text variant="heading">{questions[fitTab].title}</Text>
      <Tabs tabs={fitTabs} value={fitTab} onValueChange={setFitTab} disabled={saving}>
        <Cards field={fitTab} preferences={preferences} onToggle={toggle} />
      </Tabs>
      <Button
        label={onLastTab ? "Finish" : "Next"}
        loading={saving}
        onClick={() => nextFitTabOrFinish(preferences)}
      />
      {errorMessage}
      <Button
        label="I don't have a preference →"
        variant="secondary"
        size="sm"
        className="self-end"
        disabled={saving}
        onClick={skipFitTab}
      />
      {skipButton}
    </Box>
  );
}

type HeaderProps = {
  step: number;
  saving: boolean;
  onBack: () => void;
};

function Header({ step, saving, onBack }: HeaderProps) {
  return (
    <Box className="grid h-xxl w-full grid-cols-3 items-center">
      <Button
        label="← Back"
        variant="secondary"
        size="sm"
        className="justify-self-start"
        disabled={saving}
        onClick={onBack}
      />
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
          minSize="lg"
        />
      ))}
    </Box>
  );
}
