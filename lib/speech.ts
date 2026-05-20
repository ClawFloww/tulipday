// Web Speech API wrapper voor turn-by-turn spraakinstructies.
// Werkt op moderne browsers + Capacitor (iOS WKWebView, Android WebView).
// On/off voorkeur staat in localStorage zodat de keuze tussen sessies behouden blijft.

const STORAGE_KEY = "tulipday_voice_enabled";

export function isVoiceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function getVoiceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  // Default OFF — gebruiker zet het bewust aan (geen verrassingen)
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setVoiceEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  if (!enabled) cancelSpeech();
}

/**
 * Spreek een instructie uit. No-op als spraak is uitgeschakeld of niet
 * ondersteund. Annuleert lopende utterances zodat opeenvolgende instructies
 * niet over elkaar heen spreken.
 *
 * @param text   De zin om uit te spreken (bv. "Sla linksaf op Lowell Street")
 * @param locale i18n-code; bepaalt taal voor de TTS engine
 */
export function speak(text: string, locale: string = "nl"): void {
  if (!isVoiceSupported() || !getVoiceEnabled()) return;
  if (!text.trim()) return;

  // Cancel lopende utterance — nieuwe instructie heeft voorrang
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang   = mapLocaleToBCP47(locale);
  utterance.rate   = 1.0;
  utterance.pitch  = 1.0;
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech(): void {
  if (!isVoiceSupported()) return;
  window.speechSynthesis.cancel();
}

// Mapt next-intl locale codes naar BCP47 tags die TTS engines verstaan
function mapLocaleToBCP47(locale: string): string {
  switch (locale) {
    case "nl": return "nl-NL";
    case "en": return "en-GB";
    case "de": return "de-DE";
    case "fr": return "fr-FR";
    case "es": return "es-ES";
    case "zh": return "zh-CN";
    default:   return "nl-NL";
  }
}
