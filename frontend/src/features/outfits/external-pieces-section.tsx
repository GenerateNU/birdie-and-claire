import { Box, Button, Text } from "@/design-system";

// Mock tiles until basics and partner brands are decided.
const EXTERNAL_PLACEHOLDER_COUNT = 4;

/** Pieces from outside Birdie & Claire. Mock tiles for now. */
export function ExternalPiecesSection() {
  const placeholderNumbers = Array.from(
    { length: EXTERNAL_PLACEHOLDER_COUNT },
    (_, index) => index + 1,
  );

  return (
    <section className="flex shrink-0 flex-col gap-md">
      <Text variant="subheading">External pieces</Text>
      {/* Mock tiles, sized to fit beside each other rather than taken from the Figma. */}
      <ul className="flex gap-md">
        {placeholderNumbers.map((number) => (
          <li key={number} className="flex flex-col gap-xxs">
            <Box className="flex size-[64px] items-center justify-center bg-placeholder text-caption text-secondary">
              Piece {number}
            </Box>
            <Box title="Coming soon" className="flex flex-col">
              <Button
                label="View item"
                accessibleLabel="View item, coming soon"
                variant="secondary"
                size="sm"
                disabled
              />
            </Box>
          </li>
        ))}
      </ul>
    </section>
  );
}
