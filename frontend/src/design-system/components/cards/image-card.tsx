import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { useState } from "react";

import { cardFrameClasses } from "./card-classes";

const imageCardClasses = `${cardFrameClasses} flex flex-col gap-xs p-xs text-body focus-ring data-[pressed]:border-primary`;

const imageClasses = "aspect-portrait w-full rounded-xs";

const minSizeClasses = {
  lg: "min-w-card-lg min-h-card-lg",
};

type ImageCardProps = {
  label: string;
  src: string | null;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  minSize?: keyof typeof minSizeClasses;
};

/** A pressable card with a portrait image and its label underneath. */
export function ImageCard({ label, src, pressed, onPressedChange, minSize }: ImageCardProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <BaseToggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      className={minSize ? `${imageCardClasses} ${minSizeClasses[minSize]}` : imageCardClasses}
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
