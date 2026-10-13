import { Text } from "../../primitives/text";

type EmptyProps = {
  title: string;
  description?: string;
  className?: string;
};

export function Empty({ title, description, className }: EmptyProps) {
  return (
    <div role="status" className={className}>
      <Text variant="subheading">{title}</Text>
      {description && <Text variant="body">{description}</Text>}
    </div>
  );
}
