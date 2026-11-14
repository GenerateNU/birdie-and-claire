import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { warmEmbedderMutation } from "@/api/generated/@tanstack/react-query.gen";
import type {
  RecommendedOutfit,
  RecommendationSetting,
  RecommendationVibe,
  RecommendationWeather,
} from "@/api/generated/types.gen";
import { Box, Button, Page, Text, useToast } from "@/design-system";
import { AnswerList } from "@/features/outfits/create-outfit/answer-list";
import type { Step } from "@/features/outfits/create-outfit/create-outfit-options";
import { recommendOutfits } from "@/features/outfits/create-outfit/recommend-outfits";

type ReviewProps = {
  occasion: string;
  // Null when the shopper skipped the questions.
  weather: RecommendationWeather | null;
  weatherSummary: string;
  // Null when the shopper didn't answer the weather question.
  setting: RecommendationSetting | null;
  // Comma-separated, or null when no chip or no weather tile was picked.
  conditions: string | null;
  vibe: RecommendationVibe | null;
  // Empty when the shopper skipped Custom.
  custom: string;
  onEdit: (step: Step) => void;
  onResults: (outfits: RecommendedOutfit[]) => void;
};

export function Review({
  occasion,
  weather,
  weatherSummary,
  setting,
  conditions,
  vibe,
  custom,
  onEdit,
  onResults,
}: ReviewProps) {
  const toast = useToast();
  const abortController = useRef(new AbortController());
  const { mutate: warmEmbedder } = useMutation(warmEmbedderMutation());

  const recommendMutation = useMutation({
    mutationFn: () =>
      recommendOutfits(
        occasion,
        weather,
        setting,
        conditions,
        vibe,
        custom,
        abortController.current.signal,
      ),
    onSuccess: (outfits) => {
      if (outfits.length === 0) {
        toast.show({
          message:
            "Couldn't build a full outfit for that, try changing the weather, vibe or custom details",
          variant: "error",
        });

        return;
      }

      onResults(outfits);
    },
    onError: () => {
      if (abortController.current.signal.aborted) {
        return;
      }

      toast.show({
        message: "Couldn't get outfit recommendations. Try again in a moment.",
        variant: "error",
      });
    },
  });

  const recommending = recommendMutation.isPending;

  useEffect(() => {
    // StrictMode mounts twice, and the first unmount aborts the controller, so make a fresh one.
    abortController.current = new AbortController();
    // Best effort: a cold embedder takes tens of seconds, so start it while the user reviews.
    warmEmbedder({});

    // Leaving the page cancels a pending request, so it can't open the results afterwards.
    return () => abortController.current.abort();
  }, [warmEmbedder]);

  return (
    <Page className="flex flex-col items-center justify-center gap-xl">
      <Text variant="display">Let’s Review</Text>
      <Box className="w-full max-w-content-xl">
        <AnswerList
          occasion={occasion}
          weatherSummary={weatherSummary}
          vibe={vibe}
          custom={custom}
          disabled={recommending}
          onEdit={onEdit}
        />
      </Box>
      <Button
        className="mt-md"
        label="Create outfits"
        loading={recommending}
        loadingLabel="Styling your outfit…"
        onClick={() => recommendMutation.mutate()}
      />
    </Page>
  );
}
