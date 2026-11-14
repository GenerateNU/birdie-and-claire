import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import {
  createOutfitMutation,
  listOutfitsInfiniteQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import type { RecommendationVibe, RecommendedOutfit } from "@/api/generated/types.gen";
import {
  Box,
  Button,
  Modal,
  OutfitCard,
  OutfitSlot,
  PageHeader,
  SectionHeader,
  Text,
  useToast,
} from "@/design-system";
import { AnswerList } from "@/features/outfits/create-outfit/answer-list";
import type { Step } from "@/features/outfits/create-outfit/create-outfit-options";
import { OutfitCollage } from "@/features/outfits/outfit-collage";
import { piecesLine } from "@/features/outfits/saved-outfits";
import { SaveOutfitDialog } from "@/features/outfits/save-outfit-dialog";

type ResultsScreenProps = {
  occasion: string;
  weatherLabel: string | null;
  weatherSummary: string;
  vibe: RecommendationVibe | null;
  custom: string;
  outfits: RecommendedOutfit[];
  onEdit: (step: Step) => void;
};

export function ResultsScreen({
  occasion,
  weatherLabel,
  weatherSummary,
  vibe,
  custom,
  outfits,
  onEdit,
}: ResultsScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selected = selectedIndex === null ? undefined : outfits[selectedIndex];
  const [saveDestination, setSaveDestination] = useState<"view" | "edit" | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  // A second click can land before the re-render that disables Confirm.
  const saveStarted = useRef(false);

  const saveMutation = useMutation({
    ...createOutfitMutation(),
    // Awaited so the save stays pending, and Confirm disabled, until the outfit page has opened.
    onSuccess: async (outfit) => {
      void queryClient.invalidateQueries({ queryKey: listOutfitsInfiniteQueryKey() });
      await navigate({
        to: saveDestination === "edit" ? "/outfits/$outfitId/edit" : "/outfits/$outfitId",
        params: { outfitId: outfit.id },
      });
    },
    onError: () => {
      saveStarted.current = false;
      toast.show({ message: "Couldn't save the outfit. Try again.", variant: "error" });
    },
  });

  const suggestedTags = [occasion, ...(weatherLabel ? [`${weatherLabel} Weather`] : [])].filter(
    (tag, index, tags) =>
      tag.length <= 30 &&
      tags.findIndex((other) => other.toLowerCase() === tag.toLowerCase()) === index,
  );

  return (
    <Box className="flex min-h-screen flex-col">
      <PageHeader
        title={occasion}
        logoTo="/"
        actions={
          <Button
            label="Occasion details"
            variant="secondary"
            size="sm"
            onClick={() => setDetailsOpen(true)}
          />
        }
      />
      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Occasion Details"
        dismissible
        actions={[
          { label: "Cancel", variant: "ghost", onClick: () => setDetailsOpen(false) },
          { label: "Confirm", variant: "primary", onClick: () => setDetailsOpen(false) },
        ]}
      >
        <AnswerList
          occasion={occasion}
          weatherSummary={weatherSummary}
          vibe={vibe}
          custom={custom}
          disabled={false}
          onEdit={onEdit}
        />
      </Modal>
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
            <Button
              label="Save outfit"
              className="w-outfit"
              onClick={() => setSaveDestination("view")}
            />
            <Button
              label="Customize"
              variant="secondary"
              className="w-outfit"
              onClick={() => setSaveDestination("edit")}
            />
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
          <SaveOutfitDialog
            open={saveDestination !== null}
            savedName={`${occasion} outfit ${outfits.indexOf(selected) + 1}`.slice(0, 100)}
            savedDescription=""
            savedTags={suggestedTags}
            productsChanged
            saving={saveMutation.isPending}
            onCancel={() => setSaveDestination(null)}
            onSave={(values) => {
              if (saveStarted.current) {
                return;
              }

              saveStarted.current = true;
              saveMutation.mutate({
                body: { ...values, product_ids: outfitPieces(selected).map((piece) => piece.id) },
              });
            }}
          />
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
