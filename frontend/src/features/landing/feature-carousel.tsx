import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import slideCreate from "@/design-system/assets/landing/slide-create.png";
import slideOccasion from "@/design-system/assets/landing/slide-occasion.png";
import slideOwned from "@/design-system/assets/landing/slide-owned.png";
import slideSaved from "@/design-system/assets/landing/slide-saved.png";
import { Box, IconButton, ProgressBar, Text } from "@/design-system";

const SLIDES = [
  {
    title: "Style by occasion recommendations",
    description:
      "Describe the occasion type, vibe you’re going for, weather, and any specifics you want included in your outfit recommendations",
    image: slideOccasion,
    imageAlt: "The review step of a style by occasion request",
  },
  {
    title: "Create an outfit from scratch",
    description:
      "Browse the Birdie & Claire catalogue or add clothes that you own to put together a piece you can envision",
    image: slideCreate,
    imageAlt: "The outfit editor, with a top being swapped from the catalog",
  },
  {
    title: "Look back on outfits you’ve saved",
    description:
      "Create a wardrobe of different types of outfits you saved and look back for inspiration any time",
    image: slideSaved,
    imageAlt: "Saved outfits grouped into collections",
  },
  {
    title: "Add Birdie & Claire clothes you own",
    description:
      "Already own Birdie & Claire clothing? Add it to your collection to see new ways you can style pieces you already have",
    image: slideOwned,
    imageAlt: "The page for adding Birdie & Claire clothes you own",
  },
];

export function FeatureCarousel() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // The arrow that reaches an end hides itself, which would drop keyboard focus to the page.
  function goTo(target: number) {
    setIndex(target);

    if (target === 0) {
      nextRef.current?.focus();

      return;
    }

    if (target === SLIDES.length - 1) {
      previousRef.current?.focus();
    }
  }

  // No dependency array: the handler reads index and goTo from the current render.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Modified arrows belong to the browser, like Alt+Left and Alt+Right for back and forward.
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      if (event.key === "ArrowRight" && !isLast) {
        goTo(index + 1);
      }

      if (event.key === "ArrowLeft" && !isFirst) {
        goTo(index - 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <Box className="flex flex-col items-center gap-xl px-md py-xxl lg:px-xxl">
      <h1 className="sr-only">Features</h1>
      {/* Announces the new slide, since the arrows that change it keep focus. */}
      <Box aria-live="polite" className="flex w-full flex-col gap-xxs">
        <Text variant="headline">{slide.title}</Text>
        <Text variant="body">{slide.description}</Text>
      </Box>
      <Box className="flex w-full items-center justify-center gap-xs lg:gap-xl">
        {/* Both arrows are hidden, not unmounted, so the image stays centered at either end. */}
        <IconButton
          ref={previousRef}
          icon={CaretLeftIcon}
          label="Previous feature"
          variant="outlined"
          onClick={() => goTo(index - 1)}
          className={isFirst ? "invisible shrink-0" : "shrink-0"}
        />
        <img
          src={slide.image}
          alt={slide.imageAlt}
          className="w-full min-w-0 max-w-content-xl border"
        />
        <IconButton
          ref={nextRef}
          icon={CaretRightIcon}
          label="Next feature"
          variant="outlined"
          onClick={() => goTo(index + 1)}
          className={isLast ? "invisible shrink-0" : "shrink-0"}
        />
      </Box>
      <ProgressBar label="Feature" step={index + 1} stepCount={SLIDES.length} />
    </Box>
  );
}
