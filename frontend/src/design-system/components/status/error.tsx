import { Text } from "../../primitives/text";
import { Button } from "../buttons/button";

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function ErrorState({
  message,
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={className}>
      <Text variant="body">{message}</Text>
      {onRetry && <Button label={retryLabel} onClick={onRetry} />}
    </div>
  );
}
