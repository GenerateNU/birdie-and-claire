import {
  CalendarBlankIcon,
  CoatHangerIcon,
  KeyboardIcon,
  PencilSimpleIcon,
  SmileyIcon,
  SunIcon,
  type Icon,
} from "@phosphor-icons/react";

import type { RecommendationVibe } from "@/api/generated/types.gen";
import { Box, ListCard } from "@/design-system";
import { vibeCards, type Step } from "@/features/outfits/create-outfit/create-outfit-options";

type AnswerListProps = {
  occasion: string;
  weatherSummary: string;
  vibe: RecommendationVibe | null;
  custom: string;
  disabled?: boolean;
  onEdit: (step: Step) => void;
};

export function AnswerList({
  occasion,
  weatherSummary,
  vibe,
  custom,
  disabled = false,
  onEdit,
}: AnswerListProps) {
  const rows: { step: Step; icon: Icon; title: string; value: string; italic?: boolean }[] = [
    { step: "occasion", icon: CalendarBlankIcon, title: "Occasion", value: occasion },
    { step: "weather", icon: SunIcon, title: "Weather", value: weatherSummary },
    {
      step: "vibe",
      icon: SmileyIcon,
      title: "Vibe",
      value: vibeCards.find((card) => card.vibe === vibe)?.label ?? "None",
    },
    // Always "None" until catalog selection exists.
    { step: "specifics", icon: CoatHangerIcon, title: "Items to include", value: "None" },
    {
      step: "custom",
      icon: KeyboardIcon,
      title: "Additional descriptions",
      value: custom === "" ? "None" : `“${custom}”`,
      italic: custom !== "",
    },
  ];

  return (
    <Box className="flex w-full flex-col divide-y border">
      {rows.map((row) => (
        <ListCard
          key={row.step}
          icon={row.icon}
          title={row.title}
          value={row.value}
          italic={row.italic}
          action={{
            label: "Edit",
            accessibleLabel: `Edit ${row.title}`,
            icon: PencilSimpleIcon,
            onClick: () => onEdit(row.step),
            disabled,
          }}
        />
      ))}
    </Box>
  );
}
