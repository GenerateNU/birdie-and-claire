import { Button, Link, Logo, Text } from "@/design-system";

type EditorHeaderProps = {
  onSave: () => void;
  saveDisabled: boolean;
};

export function EditorHeader({ onSave, saveDisabled }: EditorHeaderProps) {
  return (
    <header className="grid h-[9rem] grid-cols-[1fr_auto_1fr] items-end border-y px-md">
      <Text variant="heading" className="pb-md">
        Edit Outfit
      </Text>
      <Link to="/profile/outfits" className="pb-xxxs">
        {/* object-bottom repeats the Figma's crop of the image's empty top edge. */}
        <Logo className="h-[7.375rem] w-[23.3125rem] object-cover object-bottom" />
      </Link>
      <Button
        label="Save"
        onClick={onSave}
        disabled={saveDisabled}
        className="justify-self-end mb-sm"
      />
    </header>
  );
}
