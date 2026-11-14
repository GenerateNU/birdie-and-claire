import { CheckboxBox } from "@/design-system/components/buttons/checkbox";
import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

type CheckboxListItem = {
  value: string;
  label: string;
  checked: boolean;
};

type CheckboxListProps = {
  /** The group's accessible name, like "Collections". */
  label: string;
  items: CheckboxListItem[];
  onCheckedChange: (value: string, checked: boolean) => void;
  className?: string;
};

/** Full-width rows with the label on the left and a checkbox on the right, like picking the
 * collections an outfit belongs to. */
export function CheckboxList({ label, items, onCheckedChange, className }: CheckboxListProps) {
  return (
    // 20px between rows, from Figma. It sits between the md and lg spacing tokens.
    <Box
      role="group"
      aria-label={label}
      className={joinClasses("flex flex-col gap-[20px]", className)}
    >
      {items.map((item) => (
        <label
          key={item.value}
          className="group flex items-center justify-between gap-md py-xxs text-body-l text-primary"
        >
          {item.label}
          <CheckboxBox
            checked={item.checked}
            onCheckedChange={(checked) => onCheckedChange(item.value, checked)}
          />
        </label>
      ))}
    </Box>
  );
}
