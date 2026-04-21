// Juridische documenten voor TulipDay — versie-gecontroleerde constanten
// NL-teksten voor locale "nl", EN voor alle overige locales

export const TERMS_VERSION = "1.0";
export const TERMS_DATE    = "20 april 2026";

export const GEBRUIKSVOORWAARDEN = `1. Wie zijn wij?
TulipDay is een mobiele applicatie voor het ontdekken van bollenvelden en fietsroutes in de Bollenstreek, Nederland.

2. Gebruik van de app
TulipDay is beschikbaar als gratis app met optionele betaalde functies. Je mag de app gebruiken voor persoonlijke, niet-commerciële doeleinden.
Het is niet toegestaan om de app te gebruiken voor illegale activiteiten, inhoud te uploaden die inbreuk maakt op rechten van derden, de app te reverse-engineeren of bots te gebruiken om data te verzamelen.

3. Betaalde functies
Bepaalde functies zijn alleen beschikbaar via een betaald abonnement of eenmalige aankoop. Betalingen verlopen via de App Store of Google Play.

4. Door gebruikers geplaatste inhoud
Door foto's of updates te uploaden behoud je het auteursrecht, maar geef je TulipDay toestemming deze te tonen in de app. Je garandeert dat de inhoud geen rechten van derden schendt.

5. Locatiedata
Locatiedata wordt alleen lokaal op je apparaat opgeslagen en nooit gedeeld met derden.

6. Kaart- en routedata
TulipDay gebruikt OpenStreetMap-data (ODbL licentie).
Zie: openstreetmap.org/copyright

7. Aansprakelijkheid
TulipDay is niet aansprakelijk voor onjuiste bloeistatus-informatie, schade door routes, technische storingen of inhoud van andere gebruikers.

8. Toepasselijk recht
Nederlands recht is van toepassing. Contact: info@tulipday.nl`;

export const PRIVACYBELEID = `1. Welke gegevens verzamelen wij?
- Locatiedata (optioneel): alleen lokaal op je apparaat, max 15 minuten.
- Geüploade foto's en bloeistatus-updates: opgeslagen op Supabase (EU).
- Appvoorkeuren: alleen lokaal op je apparaat.
- Wij verzamelen geen naam, e-mail of betalingsgegevens.

2. Waarom verwerken wij jouw gegevens?
Uitsluitend voor de kernfunctionaliteit van de app: routes, bollenvelden, weer en gedeelde foto's.

3. Delen met derden
Wij delen geen persoonsgegevens voor commerciële doeleinden. Wij gebruiken Supabase (EU), Open-Meteo en OpenStreetMap.

4. Jouw rechten (AVG)
Je hebt recht op inzage, verwijdering, bezwaar en dataportabiliteit.
Verzoeken via: info@tulipday.nl (reactie binnen 30 dagen).

5. Bewaartermijnen
- Locatiedata: max 15 minuten.
- Foto's: tot verwijderingsverzoek of 2 jaar na upload.
- Bloeistatus-updates: max 7 dagen.

6. Cookies en tracking
TulipDay gebruikt geen tracking-cookies en deelt geen data met advertentienetwerken.

7. Contact en klachten
Vragen of klachten? Mail naar info@tulipday.nl of dien een klacht in bij de Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).`;

// ── Engelse versies (voor alle niet-NL locales) ───────────────────────────────

export const TERMS_OF_USE = `1. Who are we?
TulipDay is a mobile application for discovering flower fields and cycling routes in the Bollenstreek region of the Netherlands.

2. Use of the app
TulipDay is available as a free app with optional paid features. You may use the app for personal, non-commercial purposes.
You may not use the app for illegal activities, upload content that infringes third-party rights, reverse-engineer the app, or use bots to collect data.

3. Paid features
Certain features are only available via a paid subscription or one-time purchase. Payments are processed through the App Store or Google Play.

4. User-generated content
By uploading photos or updates you retain copyright, but grant TulipDay permission to display them in the app. You guarantee the content does not infringe third-party rights.

5. Location data
Location data is stored only locally on your device and is never shared with third parties.

6. Map and route data
TulipDay uses OpenStreetMap data (ODbL licence).
See: openstreetmap.org/copyright

7. Liability
TulipDay is not liable for incorrect bloom-status information, damage caused by routes, technical failures, or content uploaded by other users.

8. Applicable law
Dutch law applies. Contact: info@tulipday.nl`;

export const PRIVACY_POLICY = `1. What data do we collect?
- Location data (optional): stored only locally on your device, for max 15 minutes.
- Uploaded photos and bloom-status updates: stored on Supabase (EU servers).
- App preferences: stored only locally on your device.
- We do not collect your name, email address, or payment details.

2. Why do we process your data?
Solely to provide the core functionality of the app: routes, flower fields, weather, and shared photos.

3. Sharing with third parties
We do not share personal data for commercial purposes. We use Supabase (EU), Open-Meteo, and OpenStreetMap.

4. Your rights (GDPR)
You have the right to access, deletion, objection, and data portability.
Requests via: info@tulipday.nl (response within 30 days).

5. Retention periods
- Location data: max 15 minutes.
- Photos: until deletion request or 2 years after upload.
- Bloom-status updates: max 7 days.

6. Cookies and tracking
TulipDay does not use tracking cookies and does not share data with advertising networks.

7. Contact and complaints
Questions or complaints? Email info@tulipday.nl or file a complaint with the Dutch Data Protection Authority (autoriteitpersoonsgegevens.nl).`;

// ── Hulpfunctie: geef juiste versie op basis van locale ──────────────────────

export function getLegalDocs(locale: string) {
  const isNl = locale === "nl";
  return {
    termsContent:   isNl ? GEBRUIKSVOORWAARDEN : TERMS_OF_USE,
    privacyContent: isNl ? PRIVACYBELEID       : PRIVACY_POLICY,
  };
}
