import { XIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { IconButton, Modal } from "@/design-system";

type ExitFlowButtonProps = {
  /** Runs once the user confirms, and does the leaving. */
  onExit: () => void;
  className?: string;
};

/** The X out of a full-screen flow, which asks before leaving. */
export function ExitFlowButton({ onExit, className }: ExitFlowButtonProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <IconButton
        icon={XIcon}
        label="Exit"
        variant="ghost"
        onClick={() => setConfirming(true)}
        className={className}
      />
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Are you sure you want to exit?"
        message="Your progress won't be saved."
        actions={[
          { label: "Cancel", variant: "ghost", onClick: () => setConfirming(false) },
          {
            label: "Exit",
            variant: "primary",
            onClick: () => {
              setConfirming(false);
              onExit();
            },
          },
        ]}
        dismissible
      />
    </>
  );
}
