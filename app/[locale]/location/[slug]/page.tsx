import LocationDetailClient from "./LocationDetailClient";

export function generateStaticParams() {
  // Placeholder so static export compiles; real slugs are resolved client-side via useParams
  return [{ slug: "_" }];
}

export default function Page() {
  return <LocationDetailClient />;
}
