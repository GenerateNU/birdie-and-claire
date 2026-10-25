import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { useState } from "react";

import { cardFrameClasses } from "./card-classes";
import { joinClasses } from "../../utils/join-classes";

const imageCardClasses = `${cardFrameClasses} group flex flex-col gap-xs p-xs text-body focus-ring data-[pressed]:border-primary`;

const imageClasses = "aspect-portrait w-full rounded-xs";

// Matches Checkbox's box. It's only a picture of the pressed state; the card is the control.
const checkboxClasses =
  "flex size-md items-center justify-center self-center rounded-xs border bg-background text-caption text-inverse group-data-[pressed]:border-primary group-data-[pressed]:bg-primary";

type ImageCardProps = {
  label: string;
  src: string | null;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  showCheckbox: boolean;
  className?: string;
};

/** A pressable card with a portrait image, its label underneath, and optionally a checkbox. */
export function ImageCard({
  label,
  src,
  pressed,
  onPressedChange,
  showCheckbox,
  className,
}: ImageCardProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <BaseToggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      className={joinClasses(imageCardClasses, className)}
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
      {showCheckbox && (
        <span aria-hidden="true" className={checkboxClasses}>
          {pressed && "✓"}
        </span>
      )}
    </BaseToggle>
  );
}
