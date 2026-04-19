# TulipDay — Release Checklist

## Elke release: build & sync

```bash
npm run release:ios      # Next build → cap sync → opent Xcode
npm run release:android  # Next build → cap sync → opent Android Studio
```

---

## iOS — App Store (eerste keer)

### 1. Apple Developer account
- Ga naar [developer.apple.com](https://developer.apple.com) → inloggen met Apple ID
- Koop membership (€99/jaar) als je die nog niet hebt
- Maak een **App ID** aan: `nl.tulipday.app`

### 2. Xcode signing
1. Open `ios/App/App.xcworkspace` in Xcode (niet `.xcodeproj`)
2. Klik op **App** in de Project Navigator
3. Tab **Signing & Capabilities**
4. Vink **Automatically manage signing** aan
5. Kies je **Team** (Apple Developer account)
6. Xcode maakt automatisch een provisioning profile aan

### 3. App Store Connect
1. Ga naar [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **My Apps → +** → New App
   - Platform: iOS
   - Name: `TulipDay`
   - Bundle ID: `nl.tulipday.app`
   - SKU: `tulipday-nl-001`
   - Primary language: Dutch

### 4. App informatie invullen (zie teksten onderaan)

### 5. Archiveer & upload vanuit Xcode
1. Kies schema: **App (Any iOS Device)**
2. Menu: **Product → Archive**
3. In het Organizer venster: **Distribute App → App Store Connect → Upload**
4. Wacht ~10 minuten, dan verschijnt de build in App Store Connect

### 6. Testflight (optioneel, aangeraden)
- Voeg jezelf toe als internal tester in App Store Connect
- Testflight build duurt ~30 min om te verwerken
- Test op echte iPhone

### 7. Submit voor review
- Vul alle vereiste velden in (screenshots, beschrijving, privacy URL)
- Submit → duurt typisch 24-48 uur

---

## Android — Google Play (eerste keer)

### 1. Google Play Developer account
- Ga naar [play.google.com/console](https://play.google.com/console)
- Eenmalige registratiefee: $25

### 2. App aanmaken in Play Console
- **Create app** → App name: `TulipDay`
- Default language: Dutch
- App category: Travel & Local

### 3. Signed APK / AAB bouwen in Android Studio
1. Open `android/` folder in Android Studio
2. **Build → Generate Signed Bundle / APK**
3. Kies **Android App Bundle (.aab)** (vereist door Google Play)
4. Maak een **keystore** aan (bewaar dit bestand veilig!):
   - Key alias: `tulipday`
   - Bewaar wachtwoord op een veilige plek
5. Build type: **Release**

### 4. Upload naar Play Console
- **Production → Releases → Create new release**
- Upload de `.aab` file
- Vul release notes in

### 5. Store listing invullen (zie teksten onderaan)

### 6. Content rating, pricing, distribution
- Beantwoord de content rating vragen (geen geweld, geen 18+ → PEGI 3)
- Pricing: Gratis
- Distribution: Alle landen (of selecteer specifiek Nederland, België, Duitsland)

---

## Store listing teksten

### App naam
```
TulipDay
```

### Ondertitel (iOS, max 30 tekens)
```
Ontdek bloeiende bollenvelden
```

### Beschrijving (NL)
```
Ontdek de mooiste bloeiende bollenvelden in de Bollenstreek. TulipDay laat je in één oogopslag zien welke velden nu in volle bloei staan, bijna bloeien of al uitgebloeid zijn.

✦ SWIPE-KAARTEN — Veeg rechts voor velden die je wil bezoeken, links voor overslaan. Net als Tinder, maar dan voor tulpenvelden.

✦ INTERACTIEVE KAART — Bekijk alle velden op een kaart met bloom-status filters. Clusters zoomen automatisch in bij aanraken.

✦ ECHTE FOTO'S — Bekijk en upload foto's van actieve bezoekers. Bloei-bevestigingen helpen de statussen actueel te houden.

✦ ROUTES — Volg samengestelde dagroutes langs de mooiste velden in de regio.

✦ NAVIGATIE — Eén tik voor routebeschrijving via Google Maps.

✦ MEERDERE TALEN — Nederlands, Engels, Duits, Frans, Spaans en Chinees.

Perfect voor toeristen én locals tijdens het tulpenseizoen (maart–mei).
```

### Beschrijving (EN)
```
Discover the most beautiful blooming bulb fields in the Dutch Bollenstreek flower region. TulipDay shows you at a glance which fields are in full bloom, almost blooming, or already past their peak.

✦ SWIPE CARDS — Swipe right for fields you want to visit, left to skip. Like Tinder, but for tulip fields.

✦ INTERACTIVE MAP — View all fields on a map with bloom status filters and automatic clustering.

✦ REAL PHOTOS — Browse and upload photos from active visitors. Bloom confirmations keep statuses up to date.

✦ ROUTES — Follow curated day routes along the most beautiful fields in the region.

✦ NAVIGATION — One tap to get directions via Google Maps.

✦ MULTI-LANGUAGE — Dutch, English, German, French, Spanish, and Chinese.

Perfect for tourists and locals during tulip season (March–May).
```

### Keywords (iOS, komma-gescheiden, max 100 tekens)
```
tulpen,bollenvelden,bloei,bollenstreek,keukenhof,lisse,tulip,bloemen,flower fields
```

### Privacy Policy URL
> Maak een simpele pagina aan op bijv. `tulipday.app/privacy` of gebruik Termly/iubenda.
> De app verzamelt: anonieme session-ID, locatie (alleen in-app), vrijwillig geüploade foto's.

### Support URL
> Bijv. `tulipday.app/support` of een e-mailadres

---

## Screenshot vereisten

### iPhone (vereist: 6.9" = iPhone 16 Pro Max)
Maak screenshots in de Simulator of op een echte iPhone 16 Pro Max:
1. Discover swipe-kaarten (met een mooi veld bovenaan)
2. Kaartpagina met clusters
3. Locatie detail met foto's
4. Routes overzicht

### iPad (optioneel maar aangeraden)
Als je iPad wil ondersteunen: 12.9" screenshots

### Android (vereist: min 2 screenshots)
- Dezelfde schermen als iOS
- Formaat: min 1080×1920 px

---

## App Store categorieën

- **Primary**: Travel
- **Secondary**: Reference

---

## Leeftijdsgrens
- **iOS**: 4+
- **Android / PEGI**: 3

---

## Na de eerste release: versie ophogen

```bash
# iOS: in Xcode → Project → Version + Build ophogen
# Android: in android/app/build.gradle
#   versionCode 2      ← altijd +1 bij elke upload
#   versionName "1.1"  ← semantische versie
```
