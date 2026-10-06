import { Suspense } from "react";
import SharedRouteClient from "./SharedRouteClient";

export function generateStaticParams() {
  return [{ shareId: "_" }];
}

export default function Page() {
  // useSearchParams vereist een Suspense-grens bij statische export
  return (
    <Suspense>
      <SharedRouteClient />
    </Suspense>
  );
}
