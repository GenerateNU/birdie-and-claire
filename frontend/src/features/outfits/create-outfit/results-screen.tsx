import { useState } from "react";

import type { RecommendedOutfit } from "@/api/generated/types.gen";
import { Box, OutfitCard, Page, Text } from "@/design-system";
import { OutfitCollage } from "@/features/outfits/outfit-collage";
import { piecesLine } from "@/features/outfits/saved-outfits";

type ResultsScreenProps = {
  occasion: string;
  outfits: RecommendedOutfit[];
};

export function ResultsScreen({ occasion, outfits }: ResultsScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <Page className="flex flex-col items-center gap-xxxl">
      <Box className="flex flex-col items-center gap-xs text-center">
        <Text variant="headline">Select your favorite outfit</Text>
        <Text variant="caption" className="text-secondary">
          You can finetune it after.
        </Text>
      </Box>
      <Box className="flex flex-wrap justify-center gap-xxxl">
        {outfits.map((outfit, index) => {
          const pieces = outfitPieces(outfit);

          return (
            <OutfitCard
              // An outfit's place in the list is its only identity: outfit n takes each slot's nth match.
              key={index}
              mode="single"
              title={`${occasion} outfit ${index + 1}`}
              pieces={piecesLine(pieces)}
              src={null}
              image={<OutfitCollage products={pieces} />}
              selected={selectedIndex === index}
              onSelectedChange={(selected) => setSelectedIndex(selected ? index : null)}
            />
          );
        })}
      </Box>
    </Page>
  );
}

// In the order Figma lists them. A slot with no match is missing from the outfit.
function outfitPieces(outfit: RecommendedOutfit) {
  return [outfit.top, outfit.bottom, outfit.shoe, outfit.accessory].flatMap((piece) =>
    piece === undefined ? [] : [piece],
  );
}
