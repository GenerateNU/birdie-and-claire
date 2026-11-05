import { Text } from "@/design-system/primitives/text";
import { Box } from "@/design-system/primitives/box";

type EmptyProps = {
  title: string;
  description?: string;
  className?: string;
};

export function Empty({ title, description, className }: EmptyProps) {
  return (
    <Box role="status" className={className}>
      <Text variant="subheading">{title}</Text>
      {description && <Text variant="body">{description}</Text>}
    </Box>
  );
}
