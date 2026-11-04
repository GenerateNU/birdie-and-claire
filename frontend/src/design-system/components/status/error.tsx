import { Text } from "@/design-system/primitives/text";
import { Button } from "@/design-system/components/buttons/button";
import { Box } from "@/design-system/primitives/box";

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
    <Box role="alert" className={className}>
      <Text variant="body">{message}</Text>
      {onRetry && <Button label={retryLabel} onClick={onRetry} />}
    </Box>
  );
}
