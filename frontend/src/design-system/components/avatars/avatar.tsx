import { Avatar as BaseAvatar } from "@base-ui/react/avatar";

// md and lg go past the spacing tokens (max 48px), so these use Tailwind's own sizes.
const sizeClasses = {
  sm: "size-6",
  md: "size-12",
  lg: "size-32",
} as const;

type AvatarProps = {
  src: string | null;
  alt: string;
  size?: keyof typeof sizeClasses;
};

export function Avatar({ src, alt, size = "md" }: AvatarProps) {
  return (
    <BaseAvatar.Root
      className={`inline-flex shrink-0 overflow-hidden rounded-full bg-gray-200 ${sizeClasses[size]}`}
    >
      {src && <BaseAvatar.Image src={src} alt={alt} className="size-full object-cover" />}
      {/* Shown while the image loads, if it fails, or when there's no photo. Only
          one of Image and Fallback renders at a time, so each carries the alt. */}
      <BaseAvatar.Fallback role="img" aria-label={alt} className="size-full" />
    </BaseAvatar.Root>
  );
}
