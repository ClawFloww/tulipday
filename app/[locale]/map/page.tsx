import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "var(--color-surface)" }}>
      <div className="flex flex-col items-center gap-3">
        <span className="text-4xl animate-pulse">🌷</span>
        <p className="text-sm font-medium" style={{ color: "var(--color-text-3)" }}>Loading map…</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  return <MapView />;
}
