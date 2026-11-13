import { ArrowRightIcon, MagnifyingGlassIcon, UserIcon } from "@phosphor-icons/react";
import { useState } from "react";

import heroPhoto from "@/design-system/assets/landing/hero.jpg";
import { Box, Button, Header, Link, Text } from "@/design-system";
import { FeatureCarousel } from "@/features/landing/feature-carousel";

type View = "hero" | "features";

type LandingProps = {
  signedIn: boolean;
};

export function Landing({ signedIn }: LandingProps) {
  const [view, setView] = useState<View>("hero");
  const showFeatures = () => setView("features");
  const profileItem = { label: "My profile", icon: UserIcon, to: "/profile" } as const;

  const featuresItem = {
    label: "Features",
    icon: MagnifyingGlassIcon,
    onClick: showFeatures,
    active: view === "features",
  };

  const getStartedItem = {
    label: "Get started",
    icon: ArrowRightIcon,
    to: signedIn ? "/create-outfit" : "/login",
  } as const;

  return (
    <Box className="flex min-h-screen flex-col">
      <Header
        onLogoClick={() => setView("hero")}
        items={
          signedIn ? [profileItem, featuresItem, getStartedItem] : [featuresItem, getStartedItem]
        }
      />
      <main className="flex flex-1 flex-col">
        {view === "hero" ? (
          <Hero signedIn={signedIn} onExploreFeatures={showFeatures} />
        ) : (
          <FeatureCarousel />
        )}
      </main>
    </Box>
  );
}

type HeroProps = {
  signedIn: boolean;
  onExploreFeatures: () => void;
};

function Hero({ signedIn, onExploreFeatures }: HeroProps) {
  return (
    <Box className="relative flex flex-1 flex-col items-center justify-center gap-lg px-md py-xxl text-inverse lg:px-xxl">
      <img src={heroPhoto} alt="" className="absolute inset-0 size-full object-cover" />
      <Box className="absolute inset-0 bg-photo-overlay" />
      <Box className="relative flex w-full flex-col items-center gap-lg">
        <Box className="flex w-full max-w-content-2xl flex-col gap-lg">
          <Text variant="display">Meet Birdie & Claire’s closet curator</Text>
          <Text variant="body" className="max-w-content-xl">
            Ever struggled with picking out an outfit? We’ve got you covered! With Birdie & Claire’s
            closet curator, get customized outfit options tailored to your taste. Add any Birdie &
            Claire items you own to imagine your existing wardrobe in completely new ways. Create
            outfits from scratch and look back at your wardrobe for inspiration at any time!
          </Text>
        </Box>
        <Box className="flex w-full max-w-content-sm flex-col gap-xl">
          <Button
            label="Explore features"
            variant="secondary"
            size="lg"
            trailingIcon={ArrowRightIcon}
            onClick={onExploreFeatures}
            className="focus-visible:outline-focus-inverse"
          />
          {!signedIn && (
            <Link
              to="/login"
              variant="secondary"
              size="lg"
              className="focus-visible:outline-focus-inverse"
            >
              Create an account
            </Link>
          )}
        </Box>
      </Box>
    </Box>
  );
}
