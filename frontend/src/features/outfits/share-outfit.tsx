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

import { shareOutfitMutation } from "@/api/generated/@tanstack/react-query.gen";
import {
  Box,
  Button,
  ErrorState,
  IconButton,
  Modal,
  Spinner,
  TextField,
  useToast,
} from "@/design-system";

type ShareOutfitProps = {
  outfitId: string;
};

// Shown but disabled until sharing to each app is built.
const SHARE_TARGETS = [
  { name: "Messages", Icon: ChatCircleText },
  { name: "Instagram", Icon: InstagramLogo },
  { name: "X", Icon: XLogo },
  { name: "Gmail", Icon: EnvelopeSimple },
  { name: "Reddit", Icon: RedditLogo },
];

/** The Share button and the dialog it opens, which holds the outfit's public link. */
export function ShareOutfit({ outfitId }: ShareOutfitProps) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const share = useMutation(shareOutfitMutation());

  function makeLink() {
    share.mutate({ path: { id: outfitId } });
  }

  function openDialog() {
    setOpen(true);

    // The link never changes once made, so one successful request is enough.
    if (share.data === undefined) {
      makeLink();
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.show({ message: "Link copied", variant: "success" });
    } catch {
      toast.show({
        message: "Couldn't copy the link. Select it and copy it yourself.",
        variant: "error",
      });
    }
  }

  // The API answers with a path, so the link works on whichever deploy made it, previews included.
  const shareLink = share.isSuccess ? `${window.location.origin}${share.data.url}` : null;

  return (
    <>
      <Button label="Share" leadingIcon={ShareNetwork} onClick={openDialog} />
      <Modal open={open} onClose={() => setOpen(false)} title="Share" actions={[]} dismissible>
        {share.isPending && <Spinner />}
        {share.isError && (
          <ErrorState message="Couldn't make a share link. Try again." onRetry={makeLink} />
        )}
        {shareLink !== null && (
          <Box className="flex items-end gap-xs">
            <TextField
              label="Link"
              value={shareLink}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1"
            />
            <Button label="Copy" variant="secondary" onClick={() => void copyLink(shareLink)} />
          </Box>
        )}
        <ul className="flex justify-center gap-md">
          {SHARE_TARGETS.map(({ name, Icon }) => (
            <li key={name}>
              <IconButton
                icon={Icon}
                label={`Share to ${name}, coming soon`}
                variant="ghost"
                disabled
                title="Coming soon"
              />
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
