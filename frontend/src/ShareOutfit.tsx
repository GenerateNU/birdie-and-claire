import {
  ChatCircleText,
  EnvelopeSimple,
  InstagramLogo,
  RedditLogo,
  ShareNetwork,
  XLogo,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/api";
import { Button, Dialog, ErrorState, Spinner, TextField, useToast } from "@/design-system";

type ShareOutfitProps = {
  outfitId: string;
};

type ShareOutfitResponse = {
  url: string;
};

// Shown but disabled until sharing to each app is built.
const SHARE_TARGETS = [
  { name: "Messages", Icon: ChatCircleText },
  { name: "Instagram", Icon: InstagramLogo },
  { name: "X", Icon: XLogo },
  { name: "Gmail", Icon: EnvelopeSimple },
  { name: "Reddit", Icon: RedditLogo },
];

async function shareOutfit(outfitId: string): Promise<ShareOutfitResponse> {
  const response = await apiFetch(`/api/v1/outfits/${encodeURIComponent(outfitId)}/share`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/** The Share button and the dialog it opens, which holds the outfit's public link. */
export default function ShareOutfit({ outfitId }: ShareOutfitProps) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const share = useMutation({ mutationFn: () => shareOutfit(outfitId) });

  function openDialog() {
    setOpen(true);

    // The link never changes once made, so one successful request is enough.
    if (share.data === undefined) {
      share.mutate();
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.show({ message: "Link copied", variant: "success" });
    } catch {
      toast.show({ message: "Couldn't copy the link. Select it and copy it yourself." });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex items-center gap-xs rounded-full bg-primary px-md py-xs text-body text-inverse focus-ring"
      >
        <ShareNetwork aria-hidden="true" />
        Share
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Share" actions={[]} dismissible>
        {share.isPending && <Spinner />}
        {share.isError && (
          <ErrorState
            message={`Failed to make a share link: ${share.error.message}`}
            onRetry={() => share.mutate()}
          />
        )}
        {share.isSuccess && (
          <div className="flex items-end gap-xs">
            <TextField
              label="Link"
              value={share.data.url}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1"
            />
            <Button
              label="Copy"
              variant="secondary"
              onClick={() => void copyLink(share.data.url)}
            />
          </div>
        )}
        <ul className="flex justify-center gap-md">
          {SHARE_TARGETS.map(({ name, Icon }) => (
            <li key={name}>
              <button
                type="button"
                disabled
                aria-label={`Share to ${name}, coming soon`}
                title="Coming soon"
                className="text-heading text-secondary disabled:opacity-disabled"
              >
                <Icon aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
