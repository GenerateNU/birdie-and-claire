import { createFileRoute } from "@tanstack/react-router";

import { CreateOutfitChooser } from "@/features/outfits/create-outfit/chooser";

export const Route = createFileRoute("/_signedIn/_onboarded/create-outfit/")({
  component: CreateOutfitChooser,
});
