import { Avatar as BaseAvatar } from "@base-ui/react/avatar";

const sizeClasses = {
  sm: "size-6 text-caption",
  md: "size-12 text-body",
  lg: "size-32 text-heading",
} as const;

type AvatarProps = {
  src: string | null;
  alt: string;
  initials?: string;
  size?: keyof typeof sizeClasses;
};

export function Avatar({ src, alt, initials, size = "md" }: AvatarProps) {
  return (
    <BaseAvatar.Root
      className={`inline-flex shrink-0 overflow-hidden rounded-full bg-gray-200 ${sizeClasses[size]}`}
    >
      {src && <BaseAvatar.Image src={src} alt={alt} className="size-full object-cover" />}
      <BaseAvatar.Fallback
        role="img"
        aria-label={alt}
        className="flex size-full items-center justify-center uppercase text-secondary"
      >
        {initials}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
}
