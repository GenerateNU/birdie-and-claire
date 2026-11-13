import { Toggle as BaseToggle } from "@base-ui/react/toggle";

import { cardFrameClasses } from "@/design-system/components/cards/card-classes";
import { CardImage } from "@/design-system/components/cards/card-image";

const imageCardClasses = `${cardFrameClasses} flex flex-col gap-xs p-xs text-body focus-ring data-[pressed]:border-primary`;

// fill takes the width its container gives it.
const sizeClasses = {
  fill: { card: "", image: "aspect-portrait" },
  sm: { card: "w-card-sm min-h-card-sm", image: "aspect-landscape" },
  lg: { card: "w-card-lg min-h-card-lg", image: "aspect-portrait" },
};

type ImageCardProps = {
  label: string;
  src: string | null;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  size?: keyof typeof sizeClasses;
  disabled?: boolean;
};

export function ImageCard({
  label,
  src,
  pressed,
  onPressedChange,
  size = "fill",
  disabled = false,
}: ImageCardProps) {
  const imageClasses = `${sizeClasses[size].image} w-full rounded-xs`;

  return (
    <BaseToggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      className={`${imageCardClasses} ${sizeClasses[size].card}`}
    >
      <CardImage src={src} className={imageClasses} />
      {label}
    </BaseToggle>
  );
}
