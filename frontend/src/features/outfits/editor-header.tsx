import { Box, Button, Link, Logo, Text } from "@/design-system";

type EditorHeaderProps = {
  /** Save is disabled without it, while the outfit loads or after it failed to. */
  onSave?: () => void;
  /** The name button is hidden without both of these, while the outfit loads or after it failed to. */
  name?: string;
  onRename?: () => void;
};

export function EditorHeader({ onSave, name, onRename }: EditorHeaderProps) {
  return (
    <header className="grid h-[144px] grid-cols-[1fr_auto_1fr] items-end border-y px-md">
      <Box className="flex items-end gap-md pb-md">
        <Text variant="heading">Edit Outfit</Text>
        {name !== undefined && onRename !== undefined ? (
          <Button label={name} variant="secondary" size="sm" onClick={onRename} />
        ) : null}
      </Box>
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
