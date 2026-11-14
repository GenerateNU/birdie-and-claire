import { Box, ItemCard } from "@/design-system";

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
      <Box className="flex items-baseline justify-between px-sm">
        <h2 className="text-label-l-strong">External pieces</h2>
        <Box className="text-label-l-strong">{MOCK_EXTERNAL_PIECES.length} pieces</Box>
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
