import { useBlocker } from "@tanstack/react-router";

function alwaysBlock() {
  return true;
}

/**
 * While `blocking`, holds any in-app navigation until the user picks `exit` or `stay`, and has the
 * browser confirm closing or reloading the tab.
 */
export function useLeaveGuard(blocking: boolean) {
  const blocker = useBlocker({
    // Kept stable: useBlocker registers again whenever the function changes.
    shouldBlockFn: alwaysBlock,
    enableBeforeUnload: true,
    disabled: !blocking,
    withResolver: true,
  });

  return {
    blocked: blocker.status === "blocked",
    exit: () => blocker.proceed?.(),
    stay: () => blocker.reset?.(),
  };
}
