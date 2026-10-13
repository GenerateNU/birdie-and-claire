import { Toast as BaseToast } from "@base-ui/react/toast";
import type { ReactNode } from "react";

import { Toast, type ToastAction, type ToastData, type ToastVariant } from "./toast";

const DEFAULT_DURATION_MS = 5000;
const ACTION_DURATION_MS = 10000;

type ToastConfig = {
  message: string;
  subtitle?: string;
  variant?: ToastVariant;
  action?: ToastAction;
};

export function useToast() {
  const toastManager = BaseToast.useToastManager<ToastData>();

  function show({ message, subtitle, variant = "neutral", action }: ToastConfig) {
    toastManager.add({
      title: message,
      description: subtitle,
      type: variant,
      timeout: action ? ACTION_DURATION_MS : DEFAULT_DURATION_MS,
      data: { action },
    });
  }

  return { show };
}

type ToastProviderProps = {
  children: ReactNode;
};

/** Renders the toast stack at the top center. */
export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <BaseToast.Provider>
      {children}
      <BaseToast.Portal>
        <BaseToast.Viewport className="fixed left-1/2 top-md z-50 flex w-96 max-w-[calc(100vw-32px)] -translate-x-1/2 flex-col gap-xs">
          <ToastList />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}

function ToastList() {
  const { toasts } = BaseToast.useToastManager<ToastData>();

  return toasts.map((toast) => <Toast key={toast.id} toast={toast} />);
}
