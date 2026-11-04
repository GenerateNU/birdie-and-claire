import { Progress } from "@base-ui/react/progress";

type ProgressBarProps = {
  label: string;
  step: number;
  stepCount: number;
};

/** A thin bar showing how far through a multi-step flow the user is. */
export function ProgressBar({ label, step, stepCount }: ProgressBarProps) {
  return (
    <Progress.Root
      value={step}
      max={stepCount}
      aria-label={label}
      getAriaValueText={() => `Step ${step} of ${stepCount}`}
      className="w-full max-w-content-sm"
    >
      <Progress.Track className="h-xxs w-full overflow-hidden rounded-full bg-placeholder">
        <Progress.Indicator className="bg-primary" />
      </Progress.Track>
    </Progress.Root>
  );
}
