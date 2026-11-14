import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useState } from "react";

import type { RecommendedOutfit } from "@/api/generated/types.gen";
import {
  Box,
  Button,
  OutfitCard,
  OutfitSlot,
  PageHeader,
  SectionHeader,
  Text,
} from "@/design-system";
import { OutfitCollage } from "@/features/outfits/outfit-collage";
import { piecesLine } from "@/features/outfits/saved-outfits";

type ResultsScreenProps = {
  occasion: string;
  outfits: RecommendedOutfit[];
};

export function ResultsScreen({ occasion, outfits }: ResultsScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selected = selectedIndex === null ? undefined : outfits[selectedIndex];

  return (
    <Box className="flex min-h-screen flex-col">
      <PageHeader
        title={occasion}
        logoTo="/"
        actions={<Button label="Event details" variant="secondary" size="sm" />}
      />
      {selected ? (
        <Box className="flex flex-1">
          <Box className="flex flex-1 flex-col items-center justify-center gap-md p-xxxl">
            <Button
              label="Back"
              variant="ghost"
              size="sm"
              leadingIcon={ArrowLeftIcon}
              onClick={() => setSelectedIndex(null)}
            />
            <Box className="flex h-outfit w-outfit items-center bg-surface">
              <OutfitCollage products={outfitPieces(selected)} />
            </Box>
            <Button label="Save outfit" className="w-outfit" />
            <Button label="Customize" variant="secondary" className="w-outfit" />
          </Box>
          <Box className="flex flex-col gap-md border-l px-xl py-lg">
            <SectionHeader title="Outfit details" />
            <Box className="grid grid-cols-2 gap-md">
              {outfitPieces(selected).map((piece) => (
                <OutfitSlot
                  key={piece.id}
                  title={piece.title}
                  piece={{ src: piece.image_url, bcStamp: piece.source === "birdie_and_claire" }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      ) : (
        <Box className="flex flex-col items-center gap-xxxl p-xxxl">
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
                  selected={false}
                  onSelectedChange={() => setSelectedIndex(index)}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// In the order Figma lists them. A slot with no match is missing from the outfit.
function outfitPieces(outfit: RecommendedOutfit) {
  return [outfit.top, outfit.bottom, outfit.shoe, outfit.accessory].flatMap((piece) =>
    piece === undefined ? [] : [piece],
  );
}
