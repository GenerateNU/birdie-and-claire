import { Button, Link, Logo, Text } from "@/design-system";

type EditorHeaderProps = {
  /** Save is disabled without it, while the outfit loads or after it failed to. */
  onSave?: () => void;
};

export function EditorHeader({ onSave }: EditorHeaderProps) {
  return (
    <header className="grid h-[144px] grid-cols-[1fr_auto_1fr] items-end border-y px-md">
      <Text variant="heading" className="pb-md">
        Edit Outfit
      </Text>
      <Link to="/profile/outfits" className="pb-xxxs">
        {/* object-bottom repeats the Figma's crop of the image's empty top edge. */}
        <Logo className="h-[118px] w-[373px] object-cover object-bottom" />
      </Link>
      <Button
        label="Save"
        onClick={onSave}
        disabled={onSave === undefined}
        className="justify-self-end mb-sm"
      />
    </header>
  );
}
