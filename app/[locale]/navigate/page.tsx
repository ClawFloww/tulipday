import { Suspense } from "react";
import NavigateClient from "./NavigateClient";

export default function NavigatePage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="w-8 h-8 rounded-full border-2 border-tulip-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <NavigateClient />
    </Suspense>
  );
}
