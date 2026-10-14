import { joinClasses } from "../../utils/join-classes";

type SpinnerProps = {
  label?: string;
  className?: string;
};

const circleClasses =
  "inline-block size-md animate-spin rounded-full border-thick border-primary border-t-transparent";

export function Spinner({ label = "Loading…", className }: SpinnerProps) {
  return (
    <span role="status" className={joinClasses(circleClasses, className)}>
      <span className="sr-only">{label}</span>
    </span>
  );
}
