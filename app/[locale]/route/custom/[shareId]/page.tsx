import SharedRouteClient from "./SharedRouteClient";

export function generateStaticParams() {
  return [{ shareId: "_" }];
}

export default function Page() {
  return <SharedRouteClient />;
}
