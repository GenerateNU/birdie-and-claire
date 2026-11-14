import { createFileRoute } from "@tanstack/react-router";

import { CreateOutfitFlow } from "@/features/outfits/create-outfit/create-outfit-flow";

export const Route = createFileRoute("/_signedIn/_onboarded/create-outfit")({
  component: CreateOutfitFlow,
});
