import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import {
  createOutfitMutation,
  createOutfitReactionMutation,
  getSharedOutfitOptions,
  listOutfitsInfiniteQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import type { SharedOutfitResponse } from "@/api/generated/types.gen";
import {
  Box,
  Button,
  EmptyState,
  ErrorState,
  Link,
  Logo,
  Spinner,
  Text,
  useToast,
} from "@/design-system";
import type { AccountStatus } from "@/features/account/account";
import { rememberReturnPath } from "@/features/auth/return-path";
import { OutfitCanvas } from "@/features/outfits/outfit-canvas";
import { isOutfitNotFound, retryUnlessOutfitNotFound } from "@/features/outfits/outfit-query";
import { PiecesSection } from "@/features/outfits/pieces-section";

/** Who is looking at the share page, or null for a visitor who isn't signed in. */
export type SharedOutfitViewer = {
  id: string;
  accountStatus: AccountStatus;
} | null;

type SharedOutfitPageProps = {
  outfitId: string;
  viewer: SharedOutfitViewer;
};

type SharedOutfitFrameProps = {
  children: ReactNode;
};

type SaveActionProps = {
  outfit: SharedOutfitResponse;
  viewer: SharedOutfitViewer;
};

type SaveSharedOutfitProps = {
  outfit: SharedOutfitResponse;
};

/** What a share link opens: the outfit, who shared it, and a way to save a copy. */
export function SharedOutfitPage({ outfitId, viewer }: SharedOutfitPageProps) {
  const outfitQuery = useQuery({
    ...getSharedOutfitOptions({ path: { id: outfitId } }),
    retry: retryUnlessOutfitNotFound,
  });

  if (outfitQuery.isPending) {
    return (
      <SharedOutfitFrame>
        <Spinner className="m-lg" />
      </SharedOutfitFrame>
    );
  }

  if (isOutfitNotFound(outfitQuery.error)) {
    return (
      <SharedOutfitFrame>
        <EmptyState
          title="This outfit isn't available"
          description="Its owner may have stopped sharing it, or deleted it."
          className="p-lg"
        />
      </SharedOutfitFrame>
    );
  }

  if (outfitQuery.data === undefined) {
    return (
      <SharedOutfitFrame>
        <ErrorState
          message="Couldn't load this outfit."
          onRetry={() => void outfitQuery.refetch()}
          className="p-lg"
        />
      </SharedOutfitFrame>
    );
  }

  const outfit = outfitQuery.data;

  if (viewer?.id === outfit.owner_id) {
    return <Navigate to="/outfits/$outfitId" params={{ outfitId: outfit.id }} replace />;
  }

  return (
    <SharedOutfitFrame>
      <main className="flex min-h-0 flex-1 flex-col gap-xl p-md lg:flex-row lg:gap-xxl lg:px-xxl">
        <Box className="h-1/2 min-w-0 lg:h-auto lg:flex-1">
          <OutfitCanvas products={outfit.products}>{null}</OutfitCanvas>
        </Box>
        <section className="flex min-h-0 flex-1 flex-col gap-md lg:w-content-md lg:flex-none">
          <header className="flex shrink-0 flex-col gap-sm border-b pb-md">
            <Text variant="body" className="text-secondary">
              {outfit.owner_name === ""
                ? "Someone shared this outfit with you"
                : `${outfit.owner_name} shared this outfit with you`}
            </Text>
            <Text variant="heading" className="min-w-0 break-words">
              {outfit.name}
            </Text>
            <SaveAction outfit={outfit} viewer={viewer} />
          </header>
          <PiecesSection products={outfit.products} />
        </section>
      </main>
    </SharedOutfitFrame>
  );
}

function SharedOutfitFrame({ children }: SharedOutfitFrameProps) {
  return (
    <Box className="flex h-screen flex-col">
      <header className="flex h-[120px] shrink-0 items-end justify-center border-y">
        <Link to="/">
          <Logo className="h-[118px] w-[373px] object-cover object-bottom" />
        </Link>
      </header>
      {children}
    </Box>
  );
}

/** Save for a viewer who can, otherwise the step that gets them there and back to this page. */
function SaveAction({ outfit, viewer }: SaveActionProps) {
  const sharePath = `/o/${outfit.id}`;

  // create-outfit needs at least one product, so an empty outfit has nothing to save.
  if (outfit.products.length === 0) {
    return null;
  }

  if (viewer === null) {
    return (
      <Link to="/login" search={{ redirect: sharePath }} variant="primary" className="self-start">
        Log in to save
      </Link>
    );
  }

  // Signed in with no users row yet, so create-outfit would fail on the foreign key.
  if (viewer.accountStatus === "none") {
    return (
      <Link
        to="/create-account"
        onClick={() => rememberReturnPath(sharePath)}
        variant="primary"
        className="self-start"
      >
        Finish your account to save
      </Link>
    );
  }

  return <SaveSharedOutfit key={outfit.id} outfit={outfit} />;
}

/** Copies the outfit into the viewer's own outfits and counts a save on the original. */
function SaveSharedOutfit({ outfit }: SaveSharedOutfitProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const saveReaction = useMutation(createOutfitReactionMutation());

  const copy = useMutation({
    ...createOutfitMutation(),
    onSuccess: () => {
      // Only feeds the owner's save count, so a failure isn't worth showing. The query client
      // logs it.
      saveReaction.mutate({ path: { id: outfit.id }, body: { kind: "save" } });
      void queryClient.invalidateQueries({ queryKey: listOutfitsInfiniteQueryKey() });
      toast.show({ message: "Saved to your outfits", variant: "success" });
    },
    onError: () => toast.show({ message: "Couldn't save this outfit. Try again." }),
  });

  if (copy.isSuccess) {
    return (
      <Link
        to="/outfits/$outfitId"
        params={{ outfitId: copy.data.id }}
        variant="secondary"
        className="self-start"
      >
        View your copy
      </Link>
    );
  }

  return (
    <Button
      label="Save outfit"
      loading={copy.isPending}
      loadingLabel="Saving…"
      onClick={() =>
        copy.mutate({
          body: { name: outfit.name, product_ids: outfit.products.map((product) => product.id) },
        })
      }
      className="self-start"
    />
  );
}
