import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState, type ComponentProps } from "react";
import { z } from "zod";

import { listOutfitsOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { ListOutfitsResponse } from "@/api/generated/types.gen";
import { zUpdateOutfitInputBody } from "@/api/generated/zod.gen";
import { AutocompleteField, Box, Chip, Text } from "@/design-system";

// The body's tags are optional and nullable because a PATCH can leave them out; the field here always has a list.
export const tagsSchema = zUpdateOutfitInputBody.shape.tags.unwrap().unwrap();

const tagSchema = z.string().trim().pipe(tagsSchema.element);

// There's no tags endpoint, so suggestions come from the tags on the user's newest saved outfits.
// 100 is the API's largest page.
const TAG_SOURCE_OUTFITS = 100;

const SUGGESTION_LIMIT = 5;

export function sameTags(a: string[], b: string[]) {
  return a.length === b.length && a.every((tag, index) => tag === b[index]);
}

function sameTag(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

/** Every tag on the loaded outfits, once each, ignoring case. */
function knownTags(page: ListOutfitsResponse): string[] {
  const tags: string[] = [];

  for (const tag of page.items.flatMap((outfit) => outfit.tags)) {
    if (!tags.some((known) => sameTag(known, tag))) {
      tags.push(tag);
    }
  }

  return tags;
}

type TagsFieldProps = {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled: boolean;
};

export function TagsField({ tags, onTagsChange, disabled }: TagsFieldProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();

  // Suggestions are a convenience, so while they load or if they fail the field takes free text.
  const knownTagsQuery = useQuery({
    ...listOutfitsOptions({ query: { limit: TAG_SOURCE_OUTFITS } }),
    select: knownTags,
  });

  function addTag(text: string) {
    if (text.trim() === "") {
      return;
    }

    const parsed = tagSchema.safeParse(text);

    if (!parsed.success) {
      setError("Tags can be up to 30 characters. Try a shorter one.");

      return;
    }

    const tag = parsed.data;

    if (tags.some((existing) => sameTag(existing, tag))) {
      setError("This outfit already has that tag. Try a different one.");

      return;
    }

    const nextTags = [...tags, tag];

    if (!tagsSchema.safeParse(nextTags).success) {
      setError("An outfit can have up to 10 tags. Remove one to add another.");

      return;
    }

    onTagsChange(nextTags);
    setDraft("");
    setError(undefined);
  }

  const typed = draft.trim();

  const matches =
    typed === ""
      ? []
      : (knownTagsQuery.data ?? [])
          .filter((tag) => tag.toLowerCase().includes(typed.toLowerCase()))
          .filter((tag) => !tags.some((existing) => sameTag(existing, tag)))
          .slice(0, SUGGESTION_LIMIT);

  const options: ComponentProps<typeof AutocompleteField>["options"] = matches.map((tag) => ({
    value: tag,
    label: tag,
  }));

  if (typed !== "" && !matches.some((tag) => sameTag(tag, typed))) {
    options.push({ value: typed, label: `Create “${typed}”`, icon: PlusIcon });
  }

  return (
    <Box className="flex flex-col gap-sm">
      <Box className="text-label-s text-primary">Tags</Box>
      <Box className="flex flex-wrap items-start gap-xs">
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
        {adding ? (
          <AutocompleteField
            label="Add a tag"
            placeholder="Add a tag"
            value={draft}
            onValueChange={(value) => {
              setDraft(value);
              setError(undefined);
            }}
            options={options}
            onOptionSelect={addTag}
            onSubmit={() => addTag(draft)}
            // A tag typed but not added would be lost when Confirm is clicked, so leaving the
            // field adds it.
            onBlur={() => {
              addTag(draft);
              setAdding(false);
            }}
            error={error}
            disabled={disabled}
            autoFocus
            className="w-menu"
          />
        ) : (
          // Styled as a chip in Figma; it opens the field rather than toggling anything.
          <Chip
            label="Add Tag"
            selected={false}
            onSelectedChange={() => setAdding(true)}
            leadingIcon={PlusIcon}
            disabled={disabled}
          />
        )}
      </Box>
      {!adding && error && (
        <Text variant="caption" className="text-error">
          {error}
        </Text>
      )}
    </Box>
  );
}
