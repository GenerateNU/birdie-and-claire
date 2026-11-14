import { Toast as BaseToast } from "@base-ui/react/toast";
import type { ReactNode } from "react";

import { Toast, type ToastAction, type ToastVariant } from "@/design-system/components/toast/toast";

type ToastData = {
  variant?: ToastVariant;
  action?: ToastAction;
  closable?: boolean;
};

// Figma: a toast hides itself after about 4 seconds.
const DEFAULT_DURATION_MS = 4000;

// Not in Figma: a toast with an action stays longer so there is time to reach it.
const ACTION_DURATION_MS = 10000;

type ToastConfig = ToastData & {
  message: string;
};

export function useToast() {
  const toastManager = BaseToast.useToastManager<ToastData>();

  function show({
    message,
    variant = "neutral",
    action,
    closable = variant === "error",
  }: ToastConfig) {
    toastManager.add({
      title: message,
      timeout: action ? ACTION_DURATION_MS : DEFAULT_DURATION_MS,
      data: { variant, action, closable },
    });
  }

  return { show };
}

type ToastProviderProps = {
  children: ReactNode;
};

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <BaseToast.Provider>
      {children}
      <BaseToast.Portal>
        <BaseToast.Viewport className="fixed bottom-lg left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-xs">
          <ToastList />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}

function ToastList() {
  const toastManager = BaseToast.useToastManager<ToastData>();

  return toastManager.toasts.map((toast) => {
    const { variant = "neutral", action, closable } = toast.data ?? {};

    return (
      <BaseToast.Root
        key={toast.id}
        toast={toast}
        className="data-[limited]:hidden motion-safe:transition-opacity motion-safe:data-[starting-style]:opacity-0 motion-safe:data-[ending-style]:opacity-0"
      >
        <Toast
          variant={variant}
          message={<BaseToast.Title render={<span />} />}
          action={
            action && {
              label: action.label,
              onClick: () => {
                action.onClick();
                toastManager.close(toast.id);
              },
            }
          }
          onClose={closable ? () => toastManager.close(toast.id) : undefined}
        />
      </BaseToast.Root>
    );
  });
}
