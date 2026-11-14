import { Box, CardImage, Checkbox } from "@/design-system";

type PreferenceCardProps = {
  label: string;
  src: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled: boolean;
};

export function PreferenceCard({
  label,
  src,
  checked,
  onCheckedChange,
  disabled,
}: PreferenceCardProps) {
  return (
    <Box className="relative flex w-onboarding-preference-card flex-col gap-xs border border-control bg-background p-xs">
      <CardImage src={src} className="w-full bg-placeholder" />
      {/* The label's overlay stretches over the whole card, so clicking the photo toggles it too. */}
      <Checkbox
        label={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="flex-col-reverse text-label-l-strong uppercase after:absolute after:inset-0"
      />
    </Box>
  );
}
