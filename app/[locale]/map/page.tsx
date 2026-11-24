import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-surface" aria-busy="true">
      <Skeleton className="h-full w-full rounded-none" />
    </div>
  ),
});

export default function MapPage() {
  return <MapView />;
}
