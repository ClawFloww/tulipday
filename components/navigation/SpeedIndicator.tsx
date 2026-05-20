"use client";

// Snelheidsbubble linksonder, Google Maps-stijl. Toont huidige snelheid in
// km/u op basis van pos.coords.speed (m/s). GPS levert speed ~0 als de
// gebruiker stilstaat — dan tonen we 0 i.p.v. de bubble verbergen, zodat de
// indicator niet pulserend in/uit ploft bij elk verkeerslicht.

interface Props {
  speedMps: number | null; // meters per seconde, of null als GPS geen waarde levert
}

export default function SpeedIndicator({ speedMps }: Props) {
  // GPS geeft null bij geen fix, NaN bij geen snelheidsdata
  const kmh = speedMps !== null && Number.isFinite(speedMps)
    ? Math.max(0, Math.round(speedMps * 3.6))
    : null;

  if (kmh === null) return null;

  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl shadow-xl"
      style={{
        backgroundColor: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        minWidth: "64px",
        padding: "8px 4px",
      }}
    >
      <span
        className="text-2xl font-extrabold leading-none"
        style={{ color: "var(--color-text)" }}
      >
        {kmh}
      </span>
      <span
        className="text-[10px] font-bold uppercase tracking-wide mt-0.5"
        style={{ color: "var(--color-text-3)" }}
      >
        km/u
      </span>
    </div>
  );
}
