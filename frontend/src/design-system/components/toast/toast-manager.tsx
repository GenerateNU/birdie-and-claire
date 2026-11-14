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

// Long enough to reach the action before it goes.
const ACTION_DURATION_MS = 10000;

type ToastConfig = {
  message: string;
  variant?: ToastVariant;
  action?: ToastAction;
  closable?: boolean;
};

export function useToast() {
  const toastManager = BaseToast.useToastManager<ToastData>();

  function show({ message, variant = "neutral", action, closable = false }: ToastConfig) {
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
      <BaseToast.Root key={toast.id} toast={toast} className="data-[limited]:hidden">
        <Toast
          variant={variant}
          message={toast.title}
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
