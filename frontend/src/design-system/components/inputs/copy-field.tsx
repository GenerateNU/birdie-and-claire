import { Input as BaseInput } from "@base-ui/react/input";

import { Button } from "@/design-system/components/buttons/button";
import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

type CopyFieldProps = {
  label: string;
  value: string;
  onCopy: () => void;
  className?: string;
};

/** Read-only text, like a share link, with a Copy button beside it. */
export function CopyField({ label, value, onCopy, className }: CopyFieldProps) {
  return (
    <Box className={joinClasses("flex gap-sm", className)}>
      {/* Not uppercase like Figma: links are case-sensitive. */}
      <BaseInput
        aria-label={label}
        value={value}
        readOnly
        onFocus={(event) => event.currentTarget.select()}
        className="min-w-0 flex-1 border border-primary bg-card px-sm text-label-m text-primary outline-none focus-ring"
      />
      <Button label="Copy" variant="secondary" size="sm" onClick={onCopy} />
    </Box>
  );
}
