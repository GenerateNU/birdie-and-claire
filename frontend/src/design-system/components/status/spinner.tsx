type SpinnerProps = {
  label?: string;
  className?: string;
};

const circleClasses =
  "inline-block size-md animate-spin rounded-full border-2 border-brand-500 border-t-transparent";

export function Spinner({ label = "Loading…", className }: SpinnerProps) {
  return (
    <span role="status" className={className ? `${circleClasses} ${className}` : circleClasses}>
      <span className="sr-only">{label}</span>
    </span>
  );
}
