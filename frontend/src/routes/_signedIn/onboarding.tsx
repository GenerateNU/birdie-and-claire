import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AccountError, requireAccountStatus } from "@/account";
import logo from "@/assets/logo.png";
import { Box, Button, ImageCard, ProgressBar, Tabs, Text } from "@/design-system";
import {
  fitFields,
  noPreferences,
  questions,
  saveStylePreferences,
  togglePreference,
  type PreferenceField,
  type StylePreferences,
} from "@/style-preferences";

export const Route = createFileRoute("/_signedIn/onboarding")({
  // Finished users may come back to redo it; saving replaces their preferences.
  beforeLoad: ({ context }) => requireAccountStatus(context, ["needs-preferences", "ready"]),
  errorComponent: AccountError,
  component: Onboarding,
});

const fitTabs = fitFields.map((field) => ({ value: field, label: questions[field].name }));

const fieldOrder: PreferenceField[] = ["style", ...fitFields];

// One step per section. Style counts once the user is past it, and the fit section counts on the
// last field, where Finish shows.
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
  const [currentField, setCurrentField] = useState<PreferenceField>("style");

  const [preferences, setPreferences] = useState<StylePreferences>(noPreferences);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = fieldOrder.indexOf(currentField);
  const onLastField = currentIndex === fieldOrder.length - 1;
  const onFirstField = currentIndex === 0;
  const onFitField = currentField !== "style";

  function toggle(field: PreferenceField, value: string, pressed: boolean) {
    setPreferences((current) => togglePreference(current, field, value, pressed));
  }

  async function finish(preferencesToSave: StylePreferences) {
    setError(null);
    setSaving(true);

    try {
      await saveStylePreferences(preferencesToSave);

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
      void finish(preferences);

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
          <Text variant="heading">{questions[currentField].prompt}</Text>
        </Box>
        {onFitField ? (
          <Tabs
            tabs={fitTabs}
            value={currentField}
            onValueChange={setCurrentField}
            disabled={saving}
          >
            <Cards field={currentField} preferences={preferences} onToggle={toggle} />
          </Tabs>
        ) : (
          <Cards field={currentField} preferences={preferences} onToggle={toggle} />
        )}
        <Button label={nextButtonLabel()} loading={saving} onClick={nextFieldOrFinish} />
        {error && (
          <Text variant="body" className="text-error">
            Error: {error}
          </Text>
        )}
      </Box>
      {/* Per design, Skip starts on the fit fields. It saves what's picked so far; fields the
          user hasn't reached are still empty, so they save as no preference. */}
      {onFitField && (
        <Button
          label="Skip →"
          variant="secondary"
          size="sm"
          className="fixed bottom-lg right-lg"
          disabled={saving}
          onClick={() => void finish(preferences)}
        />
      )}
    </Box>
  );
}

type CardsProps = {
  field: PreferenceField;
  preferences: StylePreferences;
  onToggle: (field: PreferenceField, value: string, pressed: boolean) => void;
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
          size="lg"
        />
      ))}
    </Box>
  );
}
