import type { Icon } from "@phosphor-icons/react";

import { Text } from "@/design-system/primitives/text";
import { Button } from "@/design-system/components/buttons/button";
import { Box } from "@/design-system/primitives/box";

type ListCardAction = {
  label: string;
  accessibleLabel?: string;
  icon: Icon;
  onClick: () => void;
  disabled?: boolean;
};

type ListCardProps = {
  icon: Icon;
  title: string;
  value: string;
  italic?: boolean;
  action?: ListCardAction;
};

/** One row of a list. The parent draws the border and the dividers between rows. */
export function ListCard({
  icon: LeadingIcon,
  title,
  value,
  italic = false,
  action,
}: ListCardProps) {
  return (
    <Box className="flex items-center justify-between gap-md px-lg py-xl text-primary">
      <Box className="flex items-center gap-sm">
        <LeadingIcon aria-hidden="true" className="size-md shrink-0" />
        <Box className="flex flex-col">
          <Box className="text-label-l-strong uppercase">{title}</Box>
          <Text variant="body-m" className={italic ? "italic" : undefined}>
            {value}
          </Text>
        </Box>
      </Box>
      {action && (
        <Button
          label={action.label}
          accessibleLabel={action.accessibleLabel}
          variant="ghost"
          size="sm"
          leadingIcon={action.icon}
          onClick={action.onClick}
          disabled={action.disabled}
        />
      )}
    </Box>
  );
}
