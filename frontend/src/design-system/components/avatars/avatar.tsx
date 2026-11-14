import { Avatar as BaseAvatar } from "@base-ui/react/avatar";

const sizeClasses = {
  sm: "size-avatar-sm text-body-s",
  md: "size-avatar-md text-body-m",
  lg: "size-avatar-lg text-heading-s",
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
