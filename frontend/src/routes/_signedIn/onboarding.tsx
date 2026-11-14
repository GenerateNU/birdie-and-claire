import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { replaceCurrentUserStylePreferencesMutation } from "@/api/generated/@tanstack/react-query.gen";
import type { StylePreferences } from "@/api/generated/types.gen";
import { Box, Button, ImageOptionCard, Logo, Page, ProgressBar, Tabs, Text } from "@/design-system";
import { AccountError, requireAccountStatus } from "@/features/account/account";
import { PiecePicker } from "@/features/pieces/piece-picker";
import {
  fitFields,
  noPreferences,
  questions,
  togglePreference,
  type PreferenceField,
  type PreferenceValue,
} from "@/features/style-preferences/style-preferences";

export const Route = createFileRoute("/_signedIn/onboarding")({
  beforeLoad: ({ context }) => requireAccountStatus(context, ["needs-preferences"]),
  errorComponent: AccountError,
  component: Onboarding,
});

// The owned-pieces question and its picker come first, then the style questions.
type OnboardingStep = "owns-pieces" | "pick-pieces" | PreferenceField;

const fitTabs = fitFields.map((field) => ({ value: field, label: questions[field].name }));

const fieldOrder: PreferenceField[] = ["style", ...fitFields];

function isPreferenceField(step: OnboardingStep): step is PreferenceField {
  return step !== "owns-pieces" && step !== "pick-pieces";
}

// Back from a fit field returns to style, because the fit fields switch through the tabs. "No" on
// the question skips the picker, so style goes back to the question.
function previousStep(step: OnboardingStep): OnboardingStep | null {
  if (step === "owns-pieces") {
    return null;
  }

  if (step === "pick-pieces" || step === "style") {
    return "owns-pieces";
  }

  return "style";
}

// Out of 2: empty through style, half full on the fit fields, and full only on the last field, where
// Finish shows.
const progressStepCount = 2;

function progressStep(step: OnboardingStep) {
  if (!isPreferenceField(step) || step === "style") {
    return 0;
  }

  if (step === fieldOrder[fieldOrder.length - 1]) {
    return progressStepCount;
  }

  return 1;
}

function Onboarding() {
  const [step, setStep] = useState<OnboardingStep>("owns-pieces");

  const [preferences, setPreferences] = useState<StylePreferences>(noPreferences);

  const saveMutation = useMutation({
    ...replaceCurrentUserStylePreferencesMutation(),
    // Has to stay a full page load. The cached account status never expires, so a router
    // navigation would send the user straight back here.
    onSuccess: () => window.location.assign("/"),
  });

  // Still saving while the reload starts, so the buttons don't come back on in between.
  const saving = saveMutation.isPending || saveMutation.isSuccess;

  const back = previousStep(step);

  function toggle(field: PreferenceField, value: PreferenceValue, pressed: boolean) {
    setPreferences((current) => togglePreference(current, field, value, pressed));
  }

  function finish(preferencesToSave: StylePreferences) {
    saveMutation.mutate({ body: preferencesToSave });
  }

  function nextFieldOrFinish(field: PreferenceField) {
    const next = fieldOrder[fieldOrder.indexOf(field) + 1];

    if (next === undefined) {
      finish(preferences);

      return;
    }

    setStep(next);
  }

  function nextButtonLabel(field: PreferenceField) {
    if (preferences[field].length === 0) {
      return "No Preference";
    }

    return field === fieldOrder[fieldOrder.length - 1] ? "Finish" : "Next";
  }

  return (
    <Page className="flex flex-col pb-xxxl">
      <Box className="grid h-xl w-full grid-cols-3 items-center">
        {back !== null && (
          <Button
            label="Back"
            leadingIcon={CaretLeft}
            variant="secondary"
            size="sm"
            className="justify-self-start"
            disabled={saving}
            onClick={() => setStep(back)}
          />
        )}
        <Box className="col-start-2 flex justify-center">
          <ProgressBar
            label="Sign-up progress"
            step={progressStep(step)}
            stepCount={progressStepCount}
          />
        </Box>
      </Box>

      {step === "owns-pieces" && (
        <Box className="flex flex-1 flex-col items-center gap-lg">
          <Logo className="w-full max-w-xs" />
          <Text variant="heading">Do you own any B&C clothes?</Text>
          <Box className="flex flex-col gap-xs">
            <Button label="Yes" variant="secondary" onClick={() => setStep("pick-pieces")} />
            <Button label="No" variant="secondary" onClick={() => setStep("style")} />
          </Box>
        </Box>
      )}

      {step === "pick-pieces" && <PiecePicker onAdded={() => setStep("style")} />}

      {isPreferenceField(step) && (
        <Box className="flex flex-1 flex-col items-center gap-lg">
          <Box className="flex flex-col items-center gap-xs">
            <Logo className="w-full max-w-xs" />
            <Text variant="heading">{questions[step].prompt}</Text>
          </Box>
          {/* Tabs<PreferenceField> because the style check can't narrow step to a fit field. */}
          {step === "style" ? (
            <Cards field={step} preferences={preferences} onToggle={toggle} disabled={saving} />
          ) : (
            <Tabs<PreferenceField>
              tabs={fitTabs}
              value={step}
              onValueChange={setStep}
              disabled={saving}
            >
              <Cards field={step} preferences={preferences} onToggle={toggle} disabled={saving} />
            </Tabs>
          )}
          <Button
            label={nextButtonLabel(step)}
            loading={saving}
            onClick={() => nextFieldOrFinish(step)}
          />
          {saveMutation.isError && (
            <Text variant="body" className="text-error">
              Couldn't save your preferences. Try again.
            </Text>
          )}
        </Box>
      )}

      {/* Per design, Skip starts after the first style field. It drops any picks and saves no
          preference for every field. */}
      {isPreferenceField(step) && step !== "style" && (
        <Button
          label="Skip"
          trailingIcon={CaretRight}
          variant="secondary"
          size="sm"
          className="fixed bottom-lg right-lg"
          disabled={saving}
          onClick={() => finish(noPreferences)}
        />
      )}
    </Page>
  );
}

type CardsProps = {
  field: PreferenceField;
  preferences: StylePreferences;
  onToggle: (field: PreferenceField, value: PreferenceValue, pressed: boolean) => void;
  disabled: boolean;
};

function Cards({ field, preferences, onToggle, disabled }: CardsProps) {
  const { options } = questions[field];
  const picked: readonly PreferenceValue[] = preferences[field];

  return (
    <Box className="flex flex-wrap justify-center gap-md">
      {options.map((option) => (
        <ImageOptionCard
          key={option.value}
          label={option.label}
          src={null}
          pressed={picked.includes(option.value)}
          onPressedChange={(pressed) => onToggle(field, option.value, pressed)}
          size="lg"
          selection="multi"
          disabled={disabled}
        />
      ))}
    </Box>
  );
}
