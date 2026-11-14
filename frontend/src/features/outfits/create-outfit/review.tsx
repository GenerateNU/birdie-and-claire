import {
  CalendarBlankIcon,
  CoatHangerIcon,
  KeyboardIcon,
  PencilSimpleIcon,
  SmileyIcon,
  SunIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { warmEmbedderMutation } from "@/api/generated/@tanstack/react-query.gen";
import type {
  RecommendedOutfit,
  RecommendationSetting,
  RecommendationVibe,
  RecommendationWeather,
} from "@/api/generated/types.gen";
import { Box, Button, ListCard, Page, Text, useToast } from "@/design-system";
import { vibeCards, type Step } from "@/features/outfits/create-outfit/create-outfit-options";
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

  const createMutation = useMutation({
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
        message: "Couldn't create the outfit. Try again in a moment.",
        variant: "error",
      });
    },
  });

  const creating = createMutation.isPending;

  useEffect(() => {
    // StrictMode mounts twice, and the first unmount aborts the controller, so make a fresh one.
    abortController.current = new AbortController();
    // Best effort: a cold embedder takes tens of seconds, so start it while the user reviews.
    warmEmbedder({});

    // Leaving the page cancels a pending request, so it can't open the results afterwards.
    return () => abortController.current.abort();
  }, [warmEmbedder]);

  const rows: { step: Step; icon: Icon; title: string; value: string; italic?: boolean }[] = [
    { step: "occasion", icon: CalendarBlankIcon, title: "Occasion", value: occasion },
    { step: "weather", icon: SunIcon, title: "Weather", value: weatherSummary },
    {
      step: "vibe",
      icon: SmileyIcon,
      title: "Vibe",
      value: vibeCards.find((card) => card.vibe === vibe)?.label ?? "None",
    },
    // Always "None" until catalog selection exists.
    { step: "specifics", icon: CoatHangerIcon, title: "Items to include", value: "None" },
    {
      step: "custom",
      icon: KeyboardIcon,
      title: "Additional descriptions",
      value: custom === "" ? "None" : `“${custom}”`,
      italic: custom !== "",
    },
  ];

  return (
    <Page className="flex flex-col items-center justify-center gap-xl">
      <Text variant="display">Let’s Review</Text>
      <Box className="flex w-full max-w-content-xl flex-col divide-y border">
        {rows.map((row) => (
          <ListCard
            key={row.step}
            icon={row.icon}
            title={row.title}
            value={row.value}
            italic={row.italic}
            action={{
              label: "Edit",
              accessibleLabel: `Edit ${row.title}`,
              icon: PencilSimpleIcon,
              onClick: () => onEdit(row.step),
              disabled: creating,
            }}
          />
        ))}
      </Box>
      <Button
        className="mt-md"
        label="Create outfits"
        loading={creating}
        loadingLabel="Styling your outfit…"
        onClick={() => createMutation.mutate()}
      />
    </Page>
  );
}
