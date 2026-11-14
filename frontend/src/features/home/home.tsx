import { ArrowRightIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";

import { getCurrentUserOptions } from "@/api/generated/@tanstack/react-query.gen";
import heroPhoto from "@/design-system/assets/home/hero.jpg";
import { Box, Link, Text } from "@/design-system";
import { firstName } from "@/features/account/first-name";
import { RecentOutfits } from "@/features/home/recent-outfits";
import { AppSidebar } from "@/features/navigation/app-sidebar";

export function Home() {
  const { data: name } = useQuery({
    ...getCurrentUserOptions(),
    select: firstName,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return (
    <Box className="flex min-h-screen">
      <Box className="sticky top-0 h-screen shrink-0">
        <AppSidebar />
      </Box>
      <main className="min-w-0 flex-1 p-xxxl">
        <Box className="flex max-w-content-2xl flex-col gap-xxxl">
          <Box className="flex flex-col">
            <Text variant="display">
              Welcome back
              {name && (
                <>
                  , <em className="italic">{name}</em>
                </>
              )}
            </Text>
            <Text variant="body-l">How can we help style your day?</Text>
          </Box>
          <Box className="flex h-hero overflow-clip">
            <img src={heroPhoto} alt="" className="h-full w-hero-photo shrink-0 object-cover" />
            <Box className="flex min-w-0 flex-1 flex-col items-start justify-center gap-md bg-surface px-xxxl">
              <Text variant="headline">
                Create a <em className="italic">new</em> outfit
              </Text>
              <Text variant="body" className="max-w-content-sm text-secondary">
                Tell us where you’re headed, or create an outfit from scratch, or from a base.
              </Text>
              <Link to="/create-outfit" variant="primary" trailingIcon={ArrowRightIcon}>
                Get started
              </Link>
            </Box>
          </Box>
          <RecentOutfits />
        </Box>
      </main>
    </Box>
  );
}
