"use client";

import hotToast, { Toaster as HotToaster } from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { success as hapticSuccess, warning as hapticWarning } from "@/lib/haptics";

// Dunne laag over react-hot-toast met de TulipDay-opmaak. Gebruik:
//   import { toast } from "@/components/ui/Toast";
//   toast.success(t("saved_page.added"));

const ICON_SIZE = 18;

export const toast = {
  success(message: string) {
    hapticSuccess();
    hotToast(message, { icon: <CheckCircle2 size={ICON_SIZE} className="text-success flex-shrink-0" /> });
  },
  error(message: string) {
    hapticWarning();
    hotToast(message, { icon: <AlertTriangle size={ICON_SIZE} className="text-warning flex-shrink-0" />, duration: 5000 });
  },
  info(message: string) {
    hotToast(message, { icon: <Info size={ICON_SIZE} className="text-info flex-shrink-0" /> });
  },
};

/** Eén keer plaatsen in de locale-layout; toasts verschijnen boven de navigatiebalk. */
export function Toaster() {
  return (
    <HotToaster
      position="bottom-center"
      containerClassName="pb-safe-nav"
      containerStyle={{ bottom: 16 }}
      toastOptions={{
        duration: 3000,
        className: "!bg-surface-2 !text-ink !text-label !rounded-2xl !shadow-lg !border !border-line !px-4 !py-3 !max-w-[420px]",
      }}
    />
  );
}
