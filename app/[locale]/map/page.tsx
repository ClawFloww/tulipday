import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-gray-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="text-4xl animate-pulse">🌷</span>
        <p className="text-sm text-gray-400 font-medium">Loading map…</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  return <MapView />;
}
