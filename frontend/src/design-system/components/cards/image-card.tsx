import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { useState } from "react";

import { cardFrameClasses } from "./card-classes";

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

/** A pressable card with an image and its label underneath. */
export function ImageCard({
  label,
  src,
  pressed,
  onPressedChange,
  size = "fill",
  disabled = false,
}: ImageCardProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageClasses = `${sizeClasses[size].image} w-full rounded-xs`;

  return (
    <BaseToggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      className={`${imageCardClasses} ${sizeClasses[size].card}`}
    >
      {src === null || src === failedSrc ? (
        <span className={`block bg-placeholder ${imageClasses}`} />
      ) : (
        <img
          src={src}
          // The visible label names the card, so the image is decorative.
          alt=""
          onError={() => setFailedSrc(src)}
          className={`object-cover ${imageClasses}`}
        />
      )}
      {label}
    </BaseToggle>
  );
}
