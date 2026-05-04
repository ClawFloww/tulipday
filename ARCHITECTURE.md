# TulipDay — Architectuur

Mobiel-first Next.js applicatie voor bollenvelden en routes in de Bollenstreek. Ondersteunt 6 talen, live bloemstatus via crowdsourcing, weer-integratie, en iOS/Android via Capacitor.

---

## 1. Folderstructuur

```
tulipday/
├── app/                        # Next.js 14 App Router
│   ├── layout.tsx              # Root layout: fonts, anti-FOUC thema-script
│   ├── page.tsx                # Splash screen (taalenselectie)
│   ├── globals.css             # CSS design tokens, theming, utility classes
│   ├── [locale]/               # Alle gelocaliseerde pagina's
│   │   ├── layout.tsx          # Locale layout: BottomNavigation + PageTransition
│   │   ├── home/               # Home feed (locaties, routes, weer)
│   │   ├── map/                # Kaartweergave (dynamic import, SSR disabled)
│   │   ├── routes/             # Routesoverzicht + [slug] detailpagina
│   │   ├── route/custom/       # Gedeelde aangepaste routes
│   │   ├── discover/           # Swipe-kaarten discovery
│   │   ├── location/[slug]/    # Locatiedetailpagina
│   │   ├── saved/              # Opgeslagen items (sessie-gebaseerd)
│   │   ├── settings/           # App-instellingen
│   │   ├── weather/            # Weerdetailpagina
│   │   ├── onboarding/         # Onboarding flow bij eerste gebruik
│   │   ├── premium/            # Premium pagina + Stripe checkout
│   │   ├── corso/              # Live bloemencorso tracking
│   │   ├── bloom-demo/         # Bloemstatus demo
│   │   ├── active-route/       # Route-navigatie in uitvoering
│   │   ├── fietsroutes/        # Knooppuntenroutes
│   │   └── error.tsx           # Error boundary
│   ├── admin/                  # Admin panel (wachtwoord-beschermd, geen [locale])
│   │   ├── page.tsx            # Volledig admin UI: CRUD + fotomodernisering
│   │   ├── actions.ts          # Next.js server actions voor database CRUD
│   │   └── photo-actions.ts    # Fotomodernisering server actions
│   └── api/                    # Next.js API routes
│       ├── corso/photos/       # Corso foto upload + ophalen
│       ├── premium/checkout/   # Stripe checkout sessie aanmaken
│       ├── premium/webhook/    # Stripe webhook verwerking
│       └── push/               # Web Push registratie + versturen
├── components/                 # Herbruikbare React components
│   ├── BottomNavigation.tsx    # 5-tabs navigatiebalk (globaal)
│   ├── FilterChips.tsx         # Filterknoppen
│   ├── SwipeCard.tsx           # Tinder-style swipe cards
│   ├── ui/                     # Generieke UI-bouwstenen
│   ├── bloom/                  # Bloemstatus-gerelateerde components
│   ├── corso/                  # Bloemencorso components
│   ├── map/                    # Kaart components (MapLibre GL)
│   ├── routes/                 # Route-specifieke components
│   └── weather/                # Weer components
├── hooks/                      # Custom React hooks
├── lib/                        # Gedeelde utilities, data, clients
├── messages/                   # i18n vertalingen (nl, en, de, fr, es, zh)
├── i18n/                       # next-intl configuratie
├── middleware.ts               # i18n routing middleware
├── supabase/migrations/        # 35 incrementele database migrations
├── public/                     # Statische bestanden
├── icons/                      # Custom SVG icons
└── constants/                  # Gedeelde constanten
```

---

## 2. React Components

### Navigatie & Layout

| Component | Verantwoordelijkheid | Gebruikt in |
|-----------|---------------------|-------------|
| `BottomNavigation.tsx` | 5-tab navigatie onderaan (Ontdek, Routes, Velden, Opgeslagen, Profiel). Detecteert actieve tab via `usePathname()`. Spring-animaties via Framer Motion. | `app/[locale]/layout.tsx` |
| `components/ui/AppBar.tsx` | Header met terugknop en optionele acties | Diverse detailpagina's |
| `components/ui/PageTransition.tsx` | Fade-in animatie bij pagina-overgang | `app/[locale]/layout.tsx` |
| `components/ui/AppTour.tsx` | Onboarding tour (Joyride-stijl) | `app/[locale]/home/` |

### Home & Discovery

| Component | Verantwoordelijkheid | Gebruikt in |
|-----------|---------------------|-------------|
| `app/[locale]/home/page.tsx` | Feed met aanbevolen locaties, routes, en weerskaart. Filtert op onboarding-voorkeuren. | Direct als pagina |
| `app/[locale]/discover/page.tsx` | Swipe-kaarten (batch van 20). Gefilterd op bloemstatus, afstand, categorie. | Direct als pagina |
| `components/SwipeCard.tsx` | Individuele swipe-kaart. Accepteer/afwijzen met drag-gesture. | `discover/page.tsx` |

### Locaties

| Component | Verantwoordelijkheid | Gebruikt in |
|-----------|---------------------|-------------|
| `app/[locale]/location/[slug]/` | Locatiedetail: foto-galerij, bloemstatus, openingstijden, routebeschrijving-link. | Directe navigatie |
| `components/ui/LocationCard.tsx` | Kaartje voor een locatie in lijstweergave: foto, categorie-badge, bloemstatus. | `home/`, `discover/`, `map/` |
| `components/ui/LocationPhotoGallery.tsx` | Foto-galerij met upload-mogelijkheid. Beheert upload-flow via Supabase Storage. | Locatiedetail |
| `components/ui/PhotoUploadSheet.tsx` | Bottom sheet voor foto uploaden: camera/galerij keuze, bijsnijden, comprimeren, uploaden. | `LocationPhotoGallery` |
| `components/ui/PremiumGate.tsx` | Blokkeert premium features: toont upgrade-prompt. Gratis limiet: 10 locaties. | Diverse pagina's |

### Routes

| Component | Verantwoordelijkheid | Gebruikt in |
|-----------|---------------------|-------------|
| `app/[locale]/routes/page.tsx` | Routeoverzicht met filters (type, featured). Premium gate na 2 routes. | Direct als pagina |
| `app/[locale]/routes/[slug]/RouteDetailClient.tsx` | Routedetail: cover, kaart, stops, bezienswaardigheden onderweg. Haalt nabije locaties op (1 km buffer). | `routes/[slug]/page.tsx` |
| `components/routes/RouteListScreen.tsx` | Lijst-weergave van routes met filteropties. | `routes/page.tsx` |
| `components/ui/RouteCard.tsx` | Kaartje voor een route: cover, afstand, duur, type-icoon. | `home/`, `routes/` |
| `components/routes/RouteFilters.tsx` | Filter-UI voor routetype. | `routes/page.tsx` |
| `components/routes/ActiveRouteMap.tsx` | Kaart tijdens actieve navigatie met live GPS. | `active-route/` |
| `components/routes/RouteBloomScore.tsx` | Visualiseert bloom-score van een route. | Routedetail |
| `components/routes/RouteMapPreview.tsx` | Statische kaartpreview voor een route. | `RouteCard` |
| `components/map/RouteMiniMap.tsx` | Kleine kaart in RouteCard. | `RouteCard` |
| `app/[locale]/route/custom/[shareId]/` | Gedeelde route (geen account vereist): toont waypoints + navigatieopties. | Directe navigatie via share-link |

### Kaart

| Component | Verantwoordelijkheid | Gebruikt in |
|-----------|---------------------|-------------|
| `components/map/MapView.tsx` | Volledige kaartweergave (MapLibre GL). Markers voor alle locatiecategorieën. Geclusterd op zoom. Filterpaneel. | `map/page.tsx` (SSR disabled) |
| `RouteInteractiveMap` (in `RouteDetailClient.tsx`) | Kaart met routelijn + genummerde stops + locatiemarkers. Klikbare markers openen info-sheet. | Geïntegreerd in `RouteDetailClient` |

### Weer

| Component | Verantwoordelijkheid | Gebruikt in |
|-----------|---------------------|-------------|
| `components/weather/WeatherCard.tsx` | Grote weerskaart: temperatuur, wind, neerslag, fiets- en wandelscore. | `home/`, `weather/` |
| `components/weather/WeatherCompact.tsx` | Compacte weersindicator voor in overzichten. | `routes/page.tsx` |
| `components/weather/WeatherForecast.tsx` | 7-daagse voorspelling als horizontale strip. Markeert beste fietsdag. | `weather/page.tsx` |
| `components/weather/WeatherBanner.tsx` | Kleine banner met huidig weer + score. | `home/` |
| `components/weather/LocationPermissionCard.tsx` | Kaart die GPS-toestemming vraagt voor lokale weersdata. | `home/` |

### Bloemstatus (Bloom)

| Component | Verantwoordelijkheid | Gebruikt in |
|-----------|---------------------|-------------|
| `components/ui/BloomBadge.tsx` | Kleurgecodeerde badge (vroeg/bloeiend/piek/eindigend). | Locatiekaarten |
| `components/bloom/BloomStatusBadge.tsx` | Uitgebreide statusbadge met icoon en label. | Locatiedetail |
| `components/bloom/BloomStatusPrompt.tsx` | Vraagt gebruiker om bloemstatus bij te dragen na locatiebezoek. | Locatiedetail |
| `components/bloom/BloomStatusFollowUp.tsx` | Vervolgvraag na bijdrage. | `BloomStatusPrompt` |
| `components/bloom/ContributorReward.tsx` | Bedankt-animatie na bijdrage. | `BloomStatusPrompt` |
| `components/bloom/NotificationPreferences.tsx` | Opt-in voor bloom-alerts via Web Push. | `settings/` |

### Bloemencorso

| Component | Verantwoordelijkheid | Gebruikt in |
|-----------|---------------------|-------------|
| `components/corso/CorsoLiveBanner.tsx` | Live timing banner: actief op 3e zaterdag april. | `home/`, `corso/` |
| `components/corso/CorsoFeed.tsx` | Real-time feed van goedgekeurde corsofoto's. | `corso/page.tsx` |
| `components/corso/CorsoPhotoUpload.tsx` | Upload-interface voor corsofoto's met stop-selectie. | `corso/page.tsx` |
| `components/corso/CorsoMap.tsx` | Kaart met corsostops en livepositie. | `corso/page.tsx` |
| `components/corso/CorsoPhotoModal.tsx` | Volledig scherm fotomodal voor corsofeed. | `CorsoFeed` |

### Admin

| Component | Verantwoordelijkheid | Gebruikt in |
|-----------|---------------------|-------------|
| `app/admin/page.tsx` | Monolitisch admin-paneel: locaties CRUD, routes CRUD, fotomodernisering (goedkeuren/afwijzen), bloom-statusbeheer, analytics. Wachtwoord-beschermd. | `/admin` |

---

## 3. Data Flow

### Primaire databronnen

```
Open-Meteo API ──► useWeather hook ──► WeatherCard, WeatherForecast
GPS/Browser   ──► useUserLocation hook ──► Home feed, MapView, weather
Supabase DB   ──► supabase client ──► Alle pagina's (locations, routes)
Supabase RT   ──► useLiveBloomSync ──► Real-time bloom updates
tulipFields.ts ──► (in-memory) ──► Discover, bollenvelden kaart
```

### Supabase data flow

```
Supabase (PostgreSQL + Storage + Realtime)
    │
    ├── supabase.ts (lazy singleton client, browser-side)
    │       │
    │       ├── page.tsx / Client components
    │       │   └── .from("locations").select(...)
    │       │   └── .from("routes").select(...)
    │       │   └── .from("saved_items").insert/delete(...)
    │       │
    │       └── hooks/
    │           ├── useWeather.ts (Open-Meteo, geen Supabase)
    │           ├── useLiveBloomSync.ts (Supabase Realtime channel)
    │           └── useCorsoPhotos.ts (Supabase Realtime)
    │
    └── supabase-admin-client.ts (service role, server-only)
            └── app/admin/actions.ts (server actions: CRUD, moderation)
```

### Locatie-data flow (voorbeeld: Home feed)

```
1. useUserLocation() → GPS coördinaten (of fallback Lisse)
2. supabase.from("locations").select(*)
     .eq("is_active", true)
     .order("bloom_status") → alle actieve locaties
3. Filtering client-side op:
   - onboarding voorkeur (opgeslagen in localStorage)
   - categorie
   - bloemstatus
4. Renderen als <LocationCard> of <SwipeCard>
5. Klik → router.push(`/${locale}/location/${slug}`)
```

### Session-based opgeslagen items

```
getOrCreateSessionId()          ← localStorage "tulipday_session_id"
    │
    ▼
supabase.from("saved_items")
    .insert({ session_id, item_type, item_id })
    │
    ▼
saved/page.tsx haalt op via .eq("session_id", sessionId)
```

### Weer data flow

```
useUserLocation() → coördinaten
    │
    ▼
useWeather(lat, lng)
    ├── Checkt localStorage cache (30 min TTL)
    ├── GET Open-Meteo API (gratis, geen key)
    │   └── buildApiUrl(lat, lng) → Amsterdam timezone
    ├── parseOpenMeteo() → current + 7-day forecast
    └── calcCyclingScore() + calcWalkingScore() → scores 0-100
```

### Bloom crowdsourcing flow

```
Gebruiker bezoekt locatie
    │
    ▼
BloomStatusPrompt vraagt naar bloemstatus
    │
    ▼
Upload foto via PhotoUploadSheet
    ├── Browser compress (browser-image-compression)
    ├── Optional: react-image-crop
    └── Supabase Storage "location-photos" bucket
            │
            ▼
    location_photos tabel (status: "pending")
            │
            ▼
    Admin goedkeuring (admin/page.tsx)
            │
            ▼
    6+ bloom_confirmed foto's → auto-update locations.bloom_status = "peak"
            │
            ▼
    useLiveBloomSync() → Supabase Realtime → alle clients bijgewerkt
```

---

## 4. Externe dependencies

| Package | Versie | Doel |
|---------|--------|------|
| `next` | 14.2.35 | App Router, server components, server actions |
| `react` / `react-dom` | ^18 | UI framework |
| `next-intl` | ^4.8.3 | i18n routing + vertalingen (6 talen) |
| `@supabase/supabase-js` | ^2.100.0 | Database, Storage, Realtime, Auth |
| `maplibre-gl` | ^5.21.1 | Open-source kaarten (OSM-based, geen Google) |
| `framer-motion` | ^12.38.0 | Animaties (swipe, spring, fade) |
| `stripe` + `@stripe/stripe-js` | ^22 / ^9 | Betaalsysteem voor premium |
| `lucide-react` | ^1.6.0 | Iconen (tree-shakeable) |
| `react-image-crop` | ^11.0.10 | Client-side foto bijsnijden |
| `browser-image-compression` | ^2.0.2 | Client-side comprimeren voor upload |
| `web-push` | ^3.6.7 | Web Push notificaties (server-side) |
| `@capacitor/core` + plugins | ^8.3.0 | iOS/Android hybrid app build |
| `tailwindcss` | ^3 | Utility-first CSS |
| Open-Meteo API | — | Gratis weerdata, geen API key nodig |
| Overpass API | — | OpenStreetMap queries voor routes |
| OSRM | — | Routeberekening (duur, afstand) |
| Unsplash API | — | Stockfoto's als fallback |

---

## 5. Technische schuld & inconsistenties

### Dubbele navigatiecomponents
`components/BottomNavigation.tsx` en `components/ui/BottomNav.tsx` bestaan naast elkaar. Beide implementeren een navigatiebalk. Onduidelijk welke de authoritative versie is; `app/[locale]/layout.tsx` importeert `BottomNavigation.tsx`.

### Locatie-ophaling gedupliceerd in kaart
`MapView.tsx` en `RouteDetailClient.tsx` bevatten allebei eigen Supabase-queries voor locaties met vergelijkbare bounding-box logica. Er is geen gedeelde hook of utility voor dit patroon.

### Admin zonder authenticatie
Het admin-paneel (`/admin`) gebruikt een eenvoudig wachtwoord (env-var `ADMIN_PASSWORD`). Geen OAuth, geen sessietokens, geen CSRF-bescherming. Bij een gelekt wachtwoord is er geen tweede verdedigingslaag.

### tulipFields.ts als in-memory database
`lib/tulipFields.ts` bevat 174 bollenvelden hardcoded in TypeScript. Deze data overlapt grotendeels met de `locations`-tabel in Supabase. Er zijn twee bronnen van waarheid voor bollenvelden: de hardcoded lijst (voor de Discover/swipe-functionaliteit) en de Supabase-tabel (voor de kaart en locatiedetails).

### Gemengde client/server-grens in admin
`app/admin/page.tsx` is een client component (`"use client"`) van 1482 regels die rechtstreeks server actions aanroept. De combinatie van enorme componentomvang, gemixte data-fetching patterns, en directe mutaties maakt dit bestand moeilijk te onderhouden en testen.

### i18n voor admin ontbreekt
Het admin-paneel is volledig in hard-coded Engels/Nederlands zonder gebruik van het i18n-systeem. Niet kritiek (alleen intern), maar inconsistent met de rest van de app.

### Twee Supabase admin clients
`lib/supabase-admin.ts` en `lib/supabase-admin-client.ts` bestaan naast elkaar. Beide exporteren een admin Supabase client met service role key. Onduidelijk welke wanneer gebruikt moet worden.

### Geen error boundaries per pagina
Er is één `error.tsx` op locale-niveau. Individuele pagina's hebben geen eigen error recovery; een crash in een component gooit de hele locale-layout omver.

### Sessie-gebaseerde opgeslagen items zonder privacy
`saved_items` zijn gekoppeld aan een random session ID in localStorage. Bij het wissen van browserdata verliest de gebruiker al zijn opgeslagen items permanent. Er is geen account-herstel mogelijkheid.

### geometry_points als JSON-array in plaats van PostGIS
Route-geometrie is opgeslagen als een JSON-array van `[lat, lng]` pairs in een gewone `text`/`jsonb` kolom. PostGIS zou spatial queries, afstandsberekeningen en routing-queries mogelijk maken zonder client-side verwerking.

### Hardcoded API key in MapLibre style URL
De MapTiler API key staat hardcoded in `RouteDetailClient.tsx` (en vermoedelijk ook in `MapView.tsx`): `key=SeaEiJkthxx3KNUCV0aI`. Dit is zichtbaar in de client-side bundle en zou via een environment variable moeten lopen.

---

## 6. Complexiteitshotspots

### `app/admin/page.tsx` — 1482 regels
Het zwaarste bestand in de codebase. Bevat in één client component: wachtwoordverificatie, locaties CRUD, routes CRUD, fotomodernisering-workflow, bloom-status bulk-updates, en een analyticsoverzicht. Geen enkele logische sectie is gesplitst in subcomponents. Elke wijziging aan admin-functionaliteit vereist navigeren door dit monoliet.

**Suggestie**: Splitsen in `AdminLocations.tsx`, `AdminRoutes.tsx`, `AdminPhotoModeration.tsx`, `AdminBloom.tsx`.

### `app/[locale]/routes/[slug]/RouteDetailClient.tsx` — ~560 regels
Bevat een ingebedde `RouteInteractiveMap`-component, de parent `RouteDetailClient`-component, de locatie-sheet, en alle data-fetching. De ingebedde MapLibre-hook met `useEffect` heeft een complexe levenscyclus die moeilijk te isoleren is.

**Suggestie**: `RouteInteractiveMap` verplaatsen naar `components/map/RouteInteractiveMap.tsx`.

### `lib/tulipFields.ts` — ~365 regels
174 bollenvelden als hardcoded TypeScript-objecten. Bevat ook de Haversine-afstandsberekening, reliability-score logica, en filter-utilities. Mengeling van data en logica in één bestand. Elke update aan veldlocaties vereist een code-deploy.

**Suggestie**: Data migreren naar Supabase `locations`-tabel; utility-functies apart houden.

### `lib/weather.ts` — 305 regels
Bevat WMO-weercode mapping, score-berekeningen (cycling + walking), caps per weercode, API-response parsing, en dag-naam-formattering. Goed gestructureerd maar groot genoeg dat het baat zou hebben bij splitsen in `weather-scoring.ts` en `weather-api.ts`.

### `app/[locale]/home/page.tsx` — ~300 regels
Combineert: locatie-ophaling, route-ophaling, weer-integratie, onboarding-check, corso-banner logica, en filtering/sortering. Veel `useEffect`-chains en lokale state. Bij uitbreiding groeit dit snel naar een tweede monoliet.

### `components/map/MapView.tsx`
Bevat de volledige kaartlogica inclusief marker-rendering, clustering, filterpaneel, categorie-selectie, en locatie-ophaling. MapLibre's imperatieve API in combinatie met React state maakt dit inherent complex. Het bestand is moeilijk te testen en de grens tussen kaart-state en React-state is vaag.

---

*Gegenereerd op 2026-05-04 op basis van volledige codebase-inspectie.*
