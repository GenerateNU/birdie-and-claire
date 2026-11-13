import { useState } from "react";

import { joinClasses } from "@/design-system/utils/join-classes";

type CardImageProps = {
  src: string | null;
  className?: string;
};

/** A card's image, or a placeholder block when there is none or it fails to load. Cards name
 * themselves with visible text, so the image is decorative. */
export function CardImage({ src, className }: CardImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src === null || src === failedSrc) {
    return <span className={joinClasses("block bg-placeholder", className)} />;
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setFailedSrc(src)}
      className={joinClasses("object-cover", className)}
    />
  );
}
