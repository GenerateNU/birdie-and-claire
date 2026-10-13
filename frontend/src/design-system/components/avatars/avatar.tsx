import { Avatar as BaseAvatar } from "@base-ui/react/avatar";

const sizeClasses = {
  sm: "size-avatar-sm text-caption",
  md: "size-avatar-md text-body",
  lg: "size-avatar-lg text-heading",
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
      className={`inline-flex shrink-0 overflow-hidden rounded-full bg-placeholder ${sizeClasses[size]}`}
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
