import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { useState, type KeyboardEvent } from "react";
import { z } from "zod";

import { zUpdateOutfitInputBody } from "@/api/generated/zod.gen";
import { Box, Button, Chip, TextField } from "@/design-system";

// The body's tags are optional and nullable because a PATCH can leave them out; the field here always has a list.
export const tagsSchema = zUpdateOutfitInputBody.shape.tags.unwrap().unwrap();

const tagSchema = z.string().trim().pipe(tagsSchema.element);

export function sameTags(a: string[], b: string[]) {
  return a.length === b.length && a.every((tag, index) => tag === b[index]);
}

type TagsFieldProps = {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled: boolean;
};

export function TagsField({ tags, onTagsChange, disabled }: TagsFieldProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();

  function addTag() {
    if (draft.trim() === "") {
      return;
    }

    const parsed = tagSchema.safeParse(draft);

    if (!parsed.success) {
      setError("That tag is too long.");

      return;
    }

    const tag = parsed.data;

    if (tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      setError("You already added that tag.");

      return;
    }

    const nextTags = [...tags, tag];

    if (!tagsSchema.safeParse(nextTags).success) {
      setError("You can't add more tags.");

      return;
    }

    onTagsChange(nextTags);
    setDraft("");
    setError(undefined);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    // Enter would otherwise submit the whole form.
    event.preventDefault();
    addTag();
  }

  return (
    <Box className="flex flex-col gap-sm">
      <Box className="flex items-start gap-sm">
        <TextField
          label="Tag"
          hideLabel
          placeholder="Add a tag"
          helper="e.g. weather, occasion, etc."
          error={error}
          value={draft}
          onValueChange={(value) => {
            setDraft(value);
            setError(undefined);
          }}
          // A tag typed but not added would be lost when Save is clicked, so leaving the field adds it.
          onBlur={addTag}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="min-w-0 flex-1"
        />
        <Button
          label="Add Tag"
          leadingIcon={PlusIcon}
          variant="secondary"
          onClick={addTag}
          disabled={disabled}
        />
      </Box>
      {tags.length > 0 && (
        <Box className="flex flex-wrap gap-xs">
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              selected
              // The chip only ever toggles off, which removes the tag.
              onSelectedChange={() => onTagsChange(tags.filter((existing) => existing !== tag))}
              trailingIcon={XIcon}
              disabled={disabled}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
