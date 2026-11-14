import { useNavigate, type LinkProps } from "@tanstack/react-router";

import fromABase from "@/design-system/assets/create-outfit/from-a-base.png";
import fromAnOccasion from "@/design-system/assets/create-outfit/from-an-occasion.png";
import fromScratch from "@/design-system/assets/create-outfit/from-scratch.png";
import { Box, ImageOptionCard, PageHeader, Text } from "@/design-system";
import { ExitFlowButton } from "@/features/navigation/exit-flow-button";

type StartOption = {
  label: string;
  subtitle: string;
  src: string;
  fit: "cover" | "contain";
  to: LinkProps["to"];
};

const startOptions: StartOption[] = [
  {
    label: "From scratch",
    subtitle: "Pick every piece yourself",
    src: fromScratch,
    fit: "contain",
    to: "/create-outfit/build",
  },
  {
    label: "From a base",
    subtitle: "Start from one of your saved pieces, or one of our bases",
    src: fromABase,
    fit: "contain",
    to: "/create-outfit/base",
  },
  {
    label: "From an occasion",
    subtitle: "Let us know where you’re headed, and we’ll put together a look for you",
    src: fromAnOccasion,
    fit: "cover",
    to: "/create-outfit/occasion",
  },
];

/** Where a new outfit starts: an empty canvas, a saved outfit, or the occasion questions. */
export function CreateOutfitChooser() {
  const navigate = useNavigate();

  return (
    <Box className="flex min-h-screen flex-col">
      <PageHeader
        title="Create new outfit"
        logoTo="/profile/outfits"
        actions={<ExitFlowButton onExit={() => void navigate({ to: "/profile/outfits" })} />}
      />
      {/* From Figma, past the end of the 48px space scale: the title sits 132px under the header,
          with 64px between it and the cards. */}
      <main className="flex flex-1 flex-col items-center gap-[64px] px-lg pb-xxxl pt-[132px]">
        <Box className="flex flex-col items-center gap-xs text-center">
          <Text variant="heading-l">How do you want to style it?</Text>
          <Text variant="body-l" className="text-secondary">
            Build from scratch, describe an occasion, or start from a template
          </Text>
        </Box>
        {/* 54px between cards, from Figma. */}
        <ul className="flex flex-wrap justify-center gap-[54px]">
          {startOptions.map((option) => (
            <li key={option.label}>
              <ImageOptionCard
                label={option.label}
                subtitle={option.subtitle}
                src={option.src}
                fit={option.fit}
                size="lg"
                // Picking a card moves on, so none stays pressed.
                pressed={false}
                onPressedChange={() => void navigate({ to: option.to })}
              />
            </li>
          ))}
        </ul>
      </main>
    </Box>
  );
}
