import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useIsMutating, useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { replaceCurrentUserStylePreferencesMutation } from "@/api/generated/@tanstack/react-query.gen";
import type { StylePreferences } from "@/api/generated/types.gen";
import { Box, Button, Checkbox, ImageOptionCard, Modal, Page, Text } from "@/design-system";
import { AccountError, requireAccountStatus } from "@/features/account/account";
import { takeReturnPath } from "@/features/auth/return-path";
import { ExitFlowButton } from "@/features/navigation/exit-flow-button";
import {
  ChoiceQuestion,
  OwnedPiecesLayout,
  Welcome,
} from "@/features/onboarding/onboarding-screens";
import { OnboardingStepper } from "@/features/onboarding/onboarding-stepper";
import { saveOwnedPiecesMutationKey, PiecePicker } from "@/features/pieces/piece-picker";
import {
  fitFields,
  includeOnePiecesLabel,
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

const introSteps = ["welcome", "owns-pieces", "add-method", "shop-login", "pick-pieces"] as const;

type IntroStep = (typeof introSteps)[number];

type OnboardingStep = IntroStep | PreferenceField;

const fieldOrder: PreferenceField[] = ["style", ...fitFields];

function isPreferenceField(step: OnboardingStep): step is PreferenceField {
  return !introSteps.some((introStep) => introStep === step);
}

const lastField = fieldOrder[fieldOrder.length - 1];

function previousStep(step: OnboardingStep): OnboardingStep | null {
  if (isPreferenceField(step)) {
    const index = fieldOrder.indexOf(step);

    return index === 0 ? "owns-pieces" : fieldOrder[index - 1];
  }

  switch (step) {
    case "welcome":
    case "owns-pieces":
      return null;
    case "add-method":
      return "owns-pieces";
    case "shop-login":
    case "pick-pieces":
      return "add-method";
  }
}

/** The onboarding steps, with an X on every step that leaves for the landing page. */
function Onboarding() {
  const navigate = useNavigate();

  return (
    <>
      <OnboardingSteps />
      {/* No z-index: it stacks after the steps but before the modals, which portal to the end of
          the body and so still cover it. */}
      <ExitFlowButton onExit={() => void navigate({ to: "/" })} className="fixed right-lg top-lg" />
    </>
  );
}

function OnboardingSteps() {
  const [step, setStep] = useState<OnboardingStep>("welcome");

  const [preferences, setPreferences] = useState<StylePreferences>(noPreferences);

  const saveMutation = useMutation({
    ...replaceCurrentUserStylePreferencesMutation(),
    // Has to stay a full page load. The cached account status never expires, so a router
    // navigation would send the user straight back here.
    onSuccess: () => window.location.assign(takeReturnPath() ?? "/"),
  });

  const addingPieces = useIsMutating({ mutationKey: saveOwnedPiecesMutationKey }) > 0;

  // Still saving while the reload starts, so the buttons don't come back on in between.
  const saving = saveMutation.isPending || saveMutation.isSuccess;

  const back = previousStep(step);

  function toggle(field: PreferenceField, value: PreferenceValue, pressed: boolean) {
    setPreferences((current) => togglePreference(current, field, value, pressed));
  }

  function nextFieldOrFinish(field: PreferenceField) {
    if (field === lastField) {
      saveMutation.mutate({ body: preferences });

      return;
    }

    setStep(fieldOrder[fieldOrder.indexOf(field) + 1]);
  }

  function nextButtonLabel(field: PreferenceField) {
    if (preferences[field].length === 0) {
      return "No preference";
    }

    return field === lastField ? "Finish" : "Next";
  }

  if (step === "welcome") {
    return <Welcome onStart={() => setStep("owns-pieces")} />;
  }

  if (!isPreferenceField(step)) {
    return (
      <OwnedPiecesLayout onBack={back === null ? null : () => setStep(back)} stage="owned-items">
        {step === "owns-pieces" && (
          <ChoiceQuestion
            heading={<Text variant="heading-l">Do you own any Birdie & Claire clothes?</Text>}
            options={[
              { value: "add-method", label: "Yes, I'm an existing customer!" },
              { value: "style", label: "No, I'm new!" },
            ]}
            onSelect={setStep}
          />
        )}
        {(step === "add-method" || step === "pick-pieces") && (
          <ChoiceQuestion
            heading={
              <>
                <Text variant="display">Welcome back!</Text>
                <Text variant="heading-m">Add your Birdie & Claire items</Text>
              </>
            }
            options={[
              {
                value: "pick-pieces",
                label: "Add owned items manually",
                subtitle: "Bring me to the Birdie & Claire catalog",
              },
              {
                value: "shop-login",
                label: "Connect with Shop",
                subtitle: "Sync owned items from your Shop account",
              },
            ]}
            onSelect={setStep}
          />
        )}
        {step === "shop-login" && <Text variant="display">Log in with Shop</Text>}
        <Modal
          open={step === "pick-pieces"}
          // Ignored mid-save rather than passing dismissible={!addingPieces}: Modal swaps Dialog for
          // AlertDialog on that prop, which remounts the picker and drops the save's onAdded.
          onClose={() => {
            if (!addingPieces) {
              setStep("add-method");
            }
          }}
          title="Add Items"
          actions={[]}
          dismissible
          size="lg"
        >
          <PiecePicker onAdded={() => setStep("style")} />
        </Modal>
      </OwnedPiecesLayout>
    );
  }

  return (
    <Page className="flex flex-col items-center gap-xxl">
      <OnboardingStepper stage={step === "style" ? "style" : "fit"} />

      <Box className="flex flex-1 flex-col items-center justify-center gap-xxl">
        <Text variant="display">{questions[step].prompt}</Text>
        <Box className="flex flex-col items-center gap-lg">
          <Text variant="body-l">{preferences[step].length} selected</Text>
          <Cards field={step} preferences={preferences} onToggle={toggle} disabled={saving} />
          {/* Dresses and jumpsuits replace a top and bottom, so the choice sits with the bottoms. */}
          {step === "bottoms" && (
            <Checkbox
              label={includeOnePiecesLabel}
              checked={preferences.include_one_pieces}
              onCheckedChange={(checked) =>
                setPreferences((current) => ({ ...current, include_one_pieces: checked }))
              }
              disabled={saving}
            />
          )}
        </Box>
        <Box className="flex flex-col items-center gap-sm">
          {/* Keyed by step so a repeated Enter doesn't land on the next screen's button. Clicks past the
              first of a double-click are ignored for the same reason. */}
          <Button
            key={step}
            label={nextButtonLabel(step)}
            variant={preferences[step].length === 0 ? "secondary" : "primary"}
            className="w-onboarding-next"
            loading={saving}
            onClick={(event) => {
              if (event.detail > 1) {
                return;
              }

              nextFieldOrFinish(step);
            }}
          />
          {back !== null && (
            <Button
              label="Back"
              leadingIcon={ArrowLeftIcon}
              variant="ghost"
              disabled={saving}
              onClick={() => setStep(back)}
            />
          )}
        </Box>
        {step === lastField && saveMutation.isError && (
          <Text variant="body" className="text-error">
            Couldn't save your preferences. Try again.
          </Text>
        )}
      </Box>
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
    <Box className="flex flex-wrap justify-center gap-lg">
      {options.map((option) => (
        <ImageOptionCard
          key={option.value}
          label={option.label}
          src={option.image}
          pressed={picked.includes(option.value)}
          onPressedChange={(pressed) => onToggle(field, option.value, pressed)}
          size="lg"
          selection="multi"
          fit={field === "style" ? "cover" : "contain"}
          disabled={disabled}
        />
      ))}
    </Box>
  );
}
