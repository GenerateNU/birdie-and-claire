import { BookmarkSimpleIcon, type Icon } from "@phosphor-icons/react";

import { Button } from "@/design-system/components/buttons/button";
import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

type EmptyStateProps = {
  title: string;
  description?: string;
  /** Shown on the square above the title. */
  icon?: Icon;
  action?: { label: string; onClick: () => void; icon?: Icon };
  className?: string;
};

/** A centered message for a page or panel that has nothing in it yet. */
export function EmptyState({
  title,
  description,
  icon: StateIcon = BookmarkSimpleIcon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Box
      role="status"
      className={joinClasses(
        "mx-auto flex w-full max-w-empty-state flex-col items-center gap-md py-xxl text-center",
        className,
      )}
    >
      <Box className="flex size-empty-state-icon items-center justify-center bg-surface">
        <StateIcon size={24} aria-hidden="true" />
      </Box>
      <Box className="flex w-full flex-col gap-xs">
        <h2 className="text-heading-s">{title}</h2>
        {description && <p className="text-body-m text-secondary">{description}</p>}
      </Box>
      {action && <Button label={action.label} leadingIcon={action.icon} onClick={action.onClick} />}
    </Box>
  );
}
