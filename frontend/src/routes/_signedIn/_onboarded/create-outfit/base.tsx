import { createFileRoute } from "@tanstack/react-router";

import { BasePicker } from "@/features/outfits/create-outfit/base-picker";

export const Route = createFileRoute("/_signedIn/_onboarded/create-outfit/base")({
  component: BasePicker,
});
