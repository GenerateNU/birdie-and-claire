import { Box, ItemCard, SectionHeader } from "@/design-system";

// Mock pieces copied from the Figma until basics and partner brands are decided.
const MOCK_EXTERNAL_PIECES = [
  { name: "Sneakers", brand: "Adidas" },
  { name: "Mini Shoulder Bag", brand: "Saint Laurent" },
  { name: "Leather Belt", brand: "Unknown" },
  { name: "Wool Beret", brand: "Unknown" },
];

/** Pieces from outside Birdie & Claire. Mock cards for now. */
export function ExternalPiecesSection() {
  return (
    <section className="flex shrink-0 flex-col gap-lg">
      <Box className="px-sm">
        <SectionHeader
          title="External pieces"
          count={`${MOCK_EXTERNAL_PIECES.length} pieces`}
          size="sm"
        />
      </Box>
      <ul className="flex justify-between">
        {MOCK_EXTERNAL_PIECES.map(({ name, brand }) => (
          <li key={name}>
            <ItemCard size="xs" name={name} detail={brand} src={null} />
          </li>
        ))}
      </ul>
    </section>
  );
}
