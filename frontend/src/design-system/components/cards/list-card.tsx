import { Text } from "@/design-system/primitives/text";
import { Button } from "@/design-system/components/buttons/button";
import { cardFrameClasses } from "@/design-system/components/cards/card-classes";
import { Box } from "@/design-system/primitives/box";

const listCardClasses = `${cardFrameClasses} flex items-center justify-between gap-md px-md py-sm`;

type ListCardAction = {
  label: string;
  accessibleLabel?: string;
  onClick: () => void;
  disabled?: boolean;
};

type ListCardProps = {
  title: string;
  value: string;
  action?: ListCardAction;
};

export function ListCard({ title, value, action }: ListCardProps) {
  return (
    <Box className={listCardClasses}>
      <Box className="flex flex-col">
        <Text variant="subheading">{title}</Text>
        <Text variant="body">{value}</Text>
      </Box>
      {action && (
        <Button
          label={action.label}
          accessibleLabel={action.accessibleLabel}
          variant="secondary"
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
        />
      )}
    </Box>
  );
}
