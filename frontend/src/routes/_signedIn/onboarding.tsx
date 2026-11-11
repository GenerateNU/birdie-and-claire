import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { replaceCurrentUserStylePreferencesMutation } from "@/api/generated/@tanstack/react-query.gen";
import type { StylePreferences } from "@/api/generated/types.gen";
import { Box, Button, ImageCard, Logo, Page, ProgressBar, Tabs, Text } from "@/design-system";
import { AccountError, requireAccountStatus } from "@/features/account/account";
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

const fitTabs = fitFields.map((field) => ({ value: field, label: questions[field].name }));

const fieldOrder: PreferenceField[] = ["style", ...fitFields];

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
  const [currentField, setCurrentField] = useState<PreferenceField>("style");

  const [preferences, setPreferences] = useState<StylePreferences>(noPreferences);

  const saveMutation = useMutation({
    ...replaceCurrentUserStylePreferencesMutation(),
    // Has to stay a full page load. The cached account status never expires, so a router
    // navigation would send the user straight back here.
    onSuccess: () => window.location.assign("/"),
  });

  // Still saving while the reload starts, so the buttons don't come back on in between.
  const saving = saveMutation.isPending || saveMutation.isSuccess;

  const currentIndex = fieldOrder.indexOf(currentField);
  const onLastField = currentIndex === fieldOrder.length - 1;
  const onFirstField = currentIndex === 0;

  function toggle(field: PreferenceField, value: PreferenceValue, pressed: boolean) {
    setPreferences((current) => togglePreference(current, field, value, pressed));
  }

  function finish(preferencesToSave: StylePreferences) {
    saveMutation.mutate({ body: preferencesToSave });
  }

  function nextFieldOrFinish() {
    const next = fieldOrder[currentIndex + 1];

    if (next === undefined) {
      finish(preferences);

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
    <Page className="flex flex-col pb-xxl">
      <Box className="grid h-xl w-full grid-cols-3 items-center">
        {/* Back always returns to style; the fit fields switch through the tabs. */}
        {!onFirstField && (
          <Button
            label="Back"
            leadingIcon={CaretLeft}
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
          <Logo className="w-full max-w-xs" />
          <Text variant="heading">{questions[currentField].prompt}</Text>
        </Box>
        {/* Tabs<PreferenceField> because the index check can't narrow currentField to a fit field. */}
        {onFirstField ? (
          <Cards
            field={currentField}
            preferences={preferences}
            onToggle={toggle}
            disabled={saving}
          />
        ) : (
          <Tabs<PreferenceField>
            tabs={fitTabs}
            value={currentField}
            onValueChange={setCurrentField}
            disabled={saving}
          >
            <Cards
              field={currentField}
              preferences={preferences}
              onToggle={toggle}
              disabled={saving}
            />
          </Tabs>
        )}
        <Button label={nextButtonLabel()} loading={saving} onClick={nextFieldOrFinish} />
        {saveMutation.isError && (
          <Text variant="body" className="text-error">
            Couldn't save your preferences. Try again.
          </Text>
        )}
      </Box>
      {/* Per design, Skip starts after the first field. It drops any picks and saves no
          preference for every field. */}
      {!onFirstField && (
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
        <ImageCard
          key={option.value}
          label={option.label}
          src={null}
          pressed={picked.includes(option.value)}
          onPressedChange={(pressed) => onToggle(field, option.value, pressed)}
          size="lg"
          disabled={disabled}
        />
      ))}
    </Box>
  );
}
