import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { warmEmbedderMutation } from "@/api/generated/@tanstack/react-query.gen";
import type { RecommendationVibe, RecommendationWeather } from "@/api/generated/types.gen";
import { Box, Button, ListCard, Page, Text, useToast } from "@/design-system";
import type { Step } from "@/features/outfits/create-outfit/create-outfit-options";
import { requestOutfit } from "@/features/outfits/create-outfit/request-outfit";

type ReviewProps = {
  occasion: string;
  // Null when the shopper skipped the questions.
  weather: RecommendationWeather | null;
  weatherLabel: string;
  vibe: RecommendationVibe | null;
  // Empty when the shopper skipped Custom.
  custom: string;
  onEdit: (step: Step) => void;
};

export function Review({ occasion, weather, weatherLabel, vibe, custom, onEdit }: ReviewProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const abortController = useRef(new AbortController());
  const { mutate: warmEmbedder } = useMutation(warmEmbedderMutation());

  const createMutation = useMutation({
    mutationFn: () =>
      requestOutfit(occasion, weather, vibe, custom, abortController.current.signal),
    onSuccess: async (outfitId) => {
      if (outfitId === null) {
        toast.show({
          message:
            "Couldn't build a full outfit for that, try changing the weather, vibe or custom details",
          variant: "error",
        });

        return;
      }

      await navigate({ to: "/outfits/$outfitId", params: { outfitId } });
    },
    onError: () => {
      if (abortController.current.signal.aborted) {
        return;
      }

      toast.show({
        message: "Couldn't create the outfit. Try again in a moment.",
        variant: "error",
      });
    },
  });

  // Stays on through the navigation to the new outfit.
  const creating =
    createMutation.isPending || (createMutation.isSuccess && createMutation.data !== null);

  useEffect(() => {
    // StrictMode mounts twice, and the first unmount aborts the controller, so make a fresh one.
    abortController.current = new AbortController();
    // Best effort: a cold embedder takes tens of seconds, so start it while the user reviews.
    warmEmbedder({});

    // Leaving the page cancels a pending create, so it can't navigate back to the new outfit.
    return () => abortController.current.abort();
  }, [warmEmbedder]);

  return (
    <Page className="flex flex-col items-center gap-lg">
      <Text variant="heading">Let's review</Text>
      <Box className="flex w-full max-w-content-md flex-col gap-xs">
        <ListCard
          title="Occasion"
          value={occasion}
          action={{
            label: "Edit",
            accessibleLabel: "Edit Occasion",
            onClick: () => onEdit("occasion"),
            disabled: creating,
          }}
        />
        <ListCard
          title="Weather"
          value={weatherLabel}
          action={{
            label: "Edit",
            accessibleLabel: "Edit Weather",
            onClick: () => onEdit("weather"),
            disabled: creating,
          }}
        />
        {/* Only the vibe value is a lowercase list value; the occasion is the shopper's own
            text, so it is not capitalized. */}
        <Box className="capitalize">
          <ListCard
            title="Vibe"
            value={vibe ?? "None"}
            action={{
              label: "Edit",
              accessibleLabel: "Edit Vibe",
              onClick: () => onEdit("vibe"),
              disabled: creating,
            }}
          />
        </Box>
        <ListCard
          title="Custom"
          value={custom === "" ? "None" : custom}
          action={{
            label: "Edit",
            accessibleLabel: "Edit Custom",
            onClick: () => onEdit("custom"),
            disabled: creating,
          }}
        />
      </Box>
      <Button
        label="Create my outfit"
        loading={creating}
        loadingLabel="Styling your outfit…"
        onClick={() => createMutation.mutate()}
      />
    </Page>
  );
}
