import { joinClasses } from "@/design-system/utils/join-classes";

type SpinnerProps = {
  label?: string;
  className?: string;
};

const circleClasses =
  "inline-block size-md rounded-full border-thick border-primary border-t-transparent motion-safe:animate-spin";

export function Spinner({ label = "Loading…", className }: SpinnerProps) {
  return (
    <span role="status" className={joinClasses(circleClasses, className)}>
      <span className="sr-only">{label}</span>
    </span>
  );
}
