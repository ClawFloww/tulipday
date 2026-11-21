import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

// Haptische feedback voor belangrijke acties. Alleen in de native app;
// op het web doen deze functies niets. Fouten (bijv. toestel zonder
// trilmotor) worden genegeerd — feedback is nooit kritiek.

const enabled = () => Capacitor.isNativePlatform();

/** Lichte tik — primaire knoppen, selecties. */
export function tap(): void {
  if (enabled()) Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

/** Gelukt — opslaan, aankoop, inloggen. */
export function success(): void {
  if (enabled()) Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
}

/** Waarschuwing — fout of destructieve actie. */
export function warning(): void {
  if (enabled()) Haptics.notification({ type: NotificationType.Warning }).catch(() => undefined);
}
