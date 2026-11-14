import { createFileRoute } from "@tanstack/react-router";

import { AccountError, getAccountStatus } from "@/features/account/account";
import { SharedOutfitPage, type SharedOutfitViewer } from "@/features/outfits/shared-outfit-page";
import { supabase } from "@/lib/supabase";

// Public: anyone with a share link can open it, signed in or not.
export const Route = createFileRoute("/o/$outfitId")({
  beforeLoad: async ({ context }): Promise<{ viewer: SharedOutfitViewer }> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { viewer: null };
    }

    const userId = session.user.id;
    const accountStatus = await getAccountStatus({ queryClient: context.queryClient, userId });

    return { viewer: { id: userId, accountStatus } };
  },
  errorComponent: AccountError,
  component: SharedOutfitRoute,
});

function SharedOutfitRoute() {
  const { outfitId } = Route.useParams();
  const { viewer } = Route.useRouteContext();

  return <SharedOutfitPage outfitId={outfitId} viewer={viewer} />;
}
