import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useIsMutating, useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { replaceCurrentUserStylePreferencesMutation } from "@/api/generated/@tanstack/react-query.gen";
import type { StylePreferences } from "@/api/generated/types.gen";
import { Box, Button, ImageOptionCard, Logo, Modal, Page, Tabs, Text } from "@/design-system";
import {
  ChoiceQuestion,
  OwnedPiecesLayout,
  Welcome,
} from "@/features/onboarding/onboarding-screens";
import { takeReturnPath } from "@/features/auth/return-path";
import { OnboardingStepper } from "@/features/onboarding/onboarding-stepper";
import { addOwnedPiecesMutationKey, PiecePicker } from "@/features/pieces/piece-picker";
import {
  fitFields,
  noPreferences,
  questions,
  togglePreference,
  type PreferenceField,
  type PreferenceValue,
} from "@/features/style-preferences/style-preferences";

const introSteps = ["welcome", "owns-pieces", "add-method", "shop-login", "pick-pieces"] as const;

type IntroStep = (typeof introSteps)[number];

type OnboardingStep = IntroStep | PreferenceField;

const fitTabs = fitFields.map((field) => ({ value: field, label: questions[field].name }));

const fieldOrder: PreferenceField[] = ["style", ...fitFields];

function isPreferenceField(step: OnboardingStep): step is PreferenceField {
  return !introSteps.some((introStep) => introStep === step);
}

// Back from a fit field returns to style, because the fit fields switch through the tabs. "No" on
// the first question skips the add-method question, so style goes back to the first question.
function previousStep(step: OnboardingStep): OnboardingStep | null {
  switch (step) {
    case "welcome":
    case "owns-pieces":
      return null;
    case "add-method":
    case "style":
      return "owns-pieces";
    case "shop-login":
    case "pick-pieces":
      return "add-method";
    default:
      return "style";
  }
}

export function OnboardingFlow() {
  const [step, setStep] = useState<OnboardingStep>("welcome");

  const [preferences, setPreferences] = useState<StylePreferences>(noPreferences);

  const saveMutation = useMutation({
    ...replaceCurrentUserStylePreferencesMutation(),
    // Has to stay a full page load. The cached account status never expires, so a router
    // navigation would send the user straight back here.
    onSuccess: () => window.location.assign(takeReturnPath() ?? "/"),
  });

  // Closing the picker mid-save would hide whether the pieces were added.
  const addingPieces = useIsMutating({ mutationKey: addOwnedPiecesMutationKey }) > 0;

  // Still saving while the reload starts, so the buttons don't come back on in between.
  const saving = saveMutation.isPending || saveMutation.isSuccess;

  const back = previousStep(step);

  function toggle(field: PreferenceField, value: PreferenceValue, pressed: boolean) {
    setPreferences((current) => togglePreference(current, field, value, pressed));
  }

  function nextFieldOrFinish(field: PreferenceField) {
    const next = fieldOrder[fieldOrder.indexOf(field) + 1];

    if (next === undefined) {
      saveMutation.mutate({ body: preferences });

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

  if (step === "welcome") {
    return <Welcome onStart={() => setStep("owns-pieces")} />;
  }

  if (!isPreferenceField(step)) {
    return (
      <OwnedPiecesLayout
        onBack={back === null ? null : () => setStep(back)}
        stage={step === "owns-pieces" ? "owns-pieces" : "add-pieces"}
      >
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
                <Text variant="display-hifi">Welcome back!</Text>
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
        {/* Stands in for connecting a Shopify account, which doesn't exist yet. */}
        {step === "shop-login" && <Text variant="display-hifi">Log in with Shop</Text>}
        <Modal
          open={step === "pick-pieces"}
          onClose={() => setStep("add-method")}
          title="Add Items"
          // A shopper who finds none of their pieces still needs a way on to the style questions.
          actions={[
            {
              label: "Skip for now",
              variant: "ghost",
              disabled: addingPieces,
              onClick: () => setStep("style"),
            },
          ]}
          dismissible={!addingPieces}
          size="lg"
        >
          <PiecePicker onAdded={() => setStep("style")} />
        </Modal>
      </OwnedPiecesLayout>
    );
  }

  return (
    <Page className="flex flex-col pb-xxxl">
      <OnboardingStepper stage={step === "style" ? "style" : "fit"} />

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
        {back !== null && (
          <Button
            label="Back"
            leadingIcon={ArrowLeftIcon}
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => setStep(back)}
          />
        )}
        {saveMutation.isError && (
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
    <Box className="flex flex-wrap justify-center gap-md">
      {options.map((option) => (
        <ImageOptionCard
          key={option.value}
          label={option.label}
          src={option.image}
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
