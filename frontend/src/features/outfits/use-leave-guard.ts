import { useBlocker } from "@tanstack/react-router";
import { useCallback, useRef } from "react";

/**
 * While `blocking`, holds any in-app navigation until the user picks `exit` or `stay`, and has the
 * browser confirm closing or reloading the tab.
 */
export function useLeaveGuard(blocking: boolean) {
  const allowedRef = useRef(false);

  // Kept stable: useBlocker registers again whenever the function changes.
  const shouldBlock = useCallback(() => !allowedRef.current, []);

  const blocker = useBlocker({
    shouldBlockFn: shouldBlock,
    enableBeforeUnload: true,
    disabled: !blocking,
    withResolver: true,
  });

  return {
    blocked: blocker.status === "blocked",
    exit: () => blocker.proceed?.(),
    stay: () => blocker.reset?.(),
    /** Stops holding in-app navigation, for the editor's own move after a save. */
    allowLeaving: () => {
      allowedRef.current = true;
    },
  };
}
