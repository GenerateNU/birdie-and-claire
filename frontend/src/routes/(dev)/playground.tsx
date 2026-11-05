import { createFileRoute } from "@tanstack/react-router";

import { Playground } from "@/design-system/playground/playground";

export const Route = createFileRoute("/(dev)/playground")({
  component: Playground,
});
