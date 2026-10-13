type SpinnerProps = {
  label?: string;
  className?: string;
};

export function Spinner({ label = "Loading…", className }: SpinnerProps) {
  return (
    <span role="status" className={className}>
      {label}
    </span>
  );
}
