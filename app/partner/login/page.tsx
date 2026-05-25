// Wrapper rond de client-only login-form. useSearchParams() in LoginClient
// vereist een Suspense-boundary tijdens prerendering, anders bail-out
// Next.js bij de static-export build.

import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function PartnerLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#E8102A", borderTopColor: "transparent" }}
        />
      </div>
    }>
      <LoginClient />
    </Suspense>
  );
}
