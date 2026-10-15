import { Text } from "../../primitives/text";
import { Button } from "../buttons/button";
import { cardFrameClasses } from "./card-classes";

const listCardClasses = `${cardFrameClasses} flex items-center justify-between gap-md px-md py-sm`;

type ListCardAction = {
  label: string;
  accessibleLabel?: string;
  onClick: () => void;
};

type ListCardProps = {
  title: string;
  value: string;
  action?: ListCardAction;
};

/** A row showing a title, its current value, and an optional button. */
export function ListCard({ title, value, action }: ListCardProps) {
  return (
    <div className={listCardClasses}>
      <div className="flex flex-col">
        <Text variant="subheading">{title}</Text>
        <Text variant="body">{value}</Text>
      </div>
      {action && (
        <Button
          label={action.label}
          accessibleLabel={action.accessibleLabel}
          variant="secondary"
          size="sm"
          onClick={action.onClick}
        />
      )}
    </div>
  );
}
