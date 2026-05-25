// Minimale layout voor het Partner Portal. Bewust geen swipe-UI, bottom
// navigation of taal-switcher: dit is een operationele tool die op één tab
// op een telefoon gebruikt wordt door ondernemers die snel iets willen
// bijwerken. We honoreren wel de globale dark-mode-klasse en gebruiken
// Inter voor de body-tekst.

import { Toaster } from "react-hot-toast";

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen font-sans"
      style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
    >
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,
          style: {
            background: "var(--color-surface-2)",
            color:      "var(--color-text)",
            border:     "1px solid var(--color-border)",
            fontSize:   "13px",
            fontWeight: 600,
          },
          success: { iconTheme: { primary: "#2D7D46", secondary: "#fff" } },
          error:   { iconTheme: { primary: "#E8102A", secondary: "#fff" } },
        }}
      />
    </div>
  );
}
