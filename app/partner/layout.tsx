// Minimale layout voor het Partner Portal. Bewust geen swipe-UI, bottom
// navigation of taal-switcher: dit is een operationele tool die op één tab
// op een telefoon gebruikt wordt door ondernemers die snel iets willen
// bijwerken. We honoreren wel de globale dark-mode-klasse en gebruiken
// Inter voor de body-tekst.

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
    </div>
  );
}
