import { useState } from "react";

import { joinClasses } from "@/design-system/utils/join-classes";

type CardImageProps = {
  src: string | null;
  /** `contain` shows a whole product or outfit shot on whatever background its parent has, and
   * multiplies it so a white photo background disappears. */
  fit?: "cover" | "contain";
  className?: string;
};

/** A card's image, or an empty block when there is none or it fails to load. Cards name
 * themselves with visible text, so the image is decorative. */
export function CardImage({ src, fit = "cover", className }: CardImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const fitClasses = fit === "cover" ? "object-cover" : "object-contain mix-blend-multiply";

  if (src === null || src === failedSrc) {
    return (
      <span className={joinClasses(fit === "cover" ? "block bg-surface" : "block", className)} />
    );
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setFailedSrc(src)}
      className={joinClasses(fitClasses, className)}
    />
  );
}
