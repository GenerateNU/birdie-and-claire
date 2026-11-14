import { CheckIcon } from "@phosphor-icons/react";

import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

type StepState = "done" | "current" | "upcoming";

function stepState(index: number, currentIndex: number): StepState {
  if (index < currentIndex) {
    return "done";
  }

  return index === currentIndex ? "current" : "upcoming";
}

const markerClasses = {
  done: "bg-primary text-inverse",
  current: "border-medium border-primary bg-card",
  upcoming: "border border-control bg-card",
} as const;

type StepProps = {
  label: string;
  state: StepState;
  /** The line to the next step. The last step has none. */
  showLine: boolean;
};

function Step({ label, state, showLine }: StepProps) {
  return (
    <li
      aria-current={state === "current" ? "step" : undefined}
      className={`flex flex-col gap-xs ${showLine ? "flex-1" : "shrink-0"}`}
    >
      <Box className="flex items-center gap-xs">
        <Box
          className={`${markerClasses[state]} flex size-control shrink-0 items-center justify-center rounded-full`}
        >
          {state === "done" && <CheckIcon size={12} aria-hidden="true" />}
          {state === "current" && <Box className="size-xs rounded-full bg-primary" />}
        </Box>
        {showLine && (
          <Box
            className={joinClasses(
              "flex-1 border-t-medium",
              state === "done" ? "border-primary" : undefined,
            )}
          />
        )}
      </Box>
      <span
        className={`whitespace-nowrap text-overline uppercase ${state === "upcoming" ? "text-secondary" : "text-primary"}`}
      >
        {label}
      </span>
    </li>
  );
}

type ProgressStepperProps = {
  /** One label per step. Figma shows 3, 4, or 5. */
  steps: string[];
  /** The position of the step in progress. Steps before it are done. */
  currentStep: number;
};

export function ProgressStepper({ steps, currentStep }: ProgressStepperProps) {
  return (
    <ol className="flex w-full">
      {steps.map((label, index) => (
        <Step
          key={label}
          label={label}
          state={stepState(index, currentStep)}
          showLine={index < steps.length - 1}
        />
      ))}
    </ol>
  );
}
