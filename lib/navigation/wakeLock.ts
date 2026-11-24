// Houdt het scherm aan tijdens navigatie via de Screen Wake Lock API (web en
// WebView). Het systeem laat de lock los als de app naar de achtergrond gaat,
// dus bij terugkeer vragen we hem opnieuw aan. Geen ondersteuning → niets.

type Sentinel = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: "screen") => Promise<Sentinel> } };

/** Start de wake lock; geeft een functie terug die hem weer vrijgeeft. */
export function keepScreenOn(): () => void {
  const nav = navigator as WakeLockNavigator;
  if (!nav.wakeLock) return () => undefined;

  let sentinel: Sentinel | null = null;
  let stopped = false;

  const request = () => {
    if (stopped || document.visibilityState !== "visible") return;
    nav.wakeLock!.request("screen")
      .then((s) => { if (stopped) s.release().catch(() => undefined); else sentinel = s; })
      .catch(() => undefined); // bijv. batterijbesparing — navigatie werkt gewoon door
  };

  request();
  document.addEventListener("visibilitychange", request);
  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", request);
    sentinel?.release().catch(() => undefined);
    sentinel = null;
  };
}
