# CLAUDE.md — TulipDay

Instructies voor Claude Code. Lees dit bestand volledig voordat je iets wijzigt.

---

## Projectcontext

**TulipDay** is een Nederlandse, mobiel-first Progressive Web App voor het ontdekken van bollenvelden en routes in de Bollenstreek. Doelgroep: toeristen en locals die de zeven kerndorpen rond Lisse/Keukenhof verkennen in het voorjaar. Kernervaring: swipe-based veldontdekking met real-time bloeistatus en een AI-dagplanner.

**Zeven kerndorpen:** Noordwijk · Noordwijkerhout · Hillegom · Lisse · Sassenheim · Voorhout · De Zilk

- **Framework**: Next.js 14 (App Router), TypeScript strict mode
- **Database**: Supabase (PostgreSQL + Storage + Realtime)
- **Kaarten**: MapLibre GL (OSM-based, geen Google Maps)
- **Routing**: BRouter (veldpaden) + OSRM (wegnavigatie)
- **Stijl**: Tailwind CSS + CSS custom properties voor theming
- **Mobile**: Capacitor voor iOS/Android builds
- **Talen**: 6 (nl, en, de, fr, es, zh) via next-intl
- **Betalingen**: Stripe voor premium

Zie `ARCHITECTURE.md` voor een volledig overzicht van de codebase.

---

## Brand

- **Primaire kleur**: `#E8102A` — tulpenrood. Dit is rood, **nooit roze (`#E8527A` is fout)**. Gebruik altijd `bg-tulip-500` of `var(--color-primary)`.
- **Logo**: glanzende rode tulp op rode afgeronde achtergrond, witte "TulipDay" tekst. Gebruik geen generieke bloemen-emoji als plaatshouder.
- **Toon**: vriendelijk, toegankelijk, Nederlands. Alle UI-copy in het Nederlands.
- **Dark mode**: volledig ondersteund via `.dark` class op `<html>`. Gebruik altijd CSS vars (`var(--color-surface)`, `var(--color-text)`) voor achtergrond en tekst, nooit hardcoded licht/donker kleuren.

---

## Wat er gebouwd is

### Core UI
- `SwipeCard` — gesture-based veldontdekking (drag threshold, card stack animaties)
- `bloomStatus` utilities — types: `'peak'` | `'starting'` | `'past_peak'` | `'not_yet'`
- `FilterChips` — filterbalk voor veldtype, dorp, bloeistatus
- `BottomNavigation` — tabs: Kaart / Plan / Velden / Saved / Profiel

### Data (Supabase)
- **185+ locaties** in de `locations` tabel (bollenvelden, attracties, horeca, parkeren)
- **Routes** in de `routes` tabel met BRouter-gesnapped `geometry_points` (`[lat, lng][]`)
- **UGC foto-upload** systeem — gebruikers kunnen veldfotos uploaden
- Bloeistatus wordt real-time bijgehouden via de community

### Planner-module (`app/[locale]/plan/`)
- **PlannerFlow** — 5-staps geanimeerde vragenflow: Groep → Tijd → Vervoer → Vibes → Tempo
- **Scoring-engine** (`lib/planner/scoring.ts`) — profiel-gebaseerd, `matchScore` per locatie
- **Route-optimizer** (`lib/planner/routeOptimizer.ts`) — village-clustering + nearest-neighbor TSP + 2-opt
- **Results-pagina** (`app/[locale]/plan/results/page.tsx`) — tijdblokken, "Waarom voor jou"-chips
- **Opslag**: `PlannerProfile` in `localStorage` onder `PLANNER_PROFILE_KEY`
- **Snelheidsprofielen (min/km):** `walking: 12, cycling: 4, car: 2`
- **Tijdsbudgetten (min):** `2h: 120, half: 240, full: 420`

### Navigatie-module (`app/[locale]/navigate/`)
- GPS-navigatie via `watchPosition` met afslagen (OSRM turn-by-turn)
- Aanrijdroute: grijze lijn van GPS-positie naar eerste stop
- Bloeistatus melden onderweg

### Route-module (`app/[locale]/routes/`)
- Preset routes uit Supabase, BRouter-geometrie
- `geometry_points` opgeslagen als `[lat, lng][]`, omgezet naar `[lng, lat][]` voor MapLibre
- Migratiescript: `scripts/migrate-routes-brouter.ts`

---

## Codeconventies

### Bestandsnamen en mappen
- React components: `PascalCase.tsx` (`RouteCard.tsx`)
- Pagina's en layouts: lowercase (`page.tsx`, `layout.tsx`)
- Utility/lib bestanden: `camelCase.ts` (`bloomStatus.ts`)
- Mappen: `kebab-case` (`active-route/`, `bloom-demo/`)
- Supabase migrations: `YYYYMMDDHHMMSS_beschrijving.sql`

### Import volgorde (strikt aanhouden)
```tsx
// 1. React + Next.js
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// 2. Externe libraries
import maplibregl from "maplibre-gl";
import { Heart, MapPin } from "lucide-react";

// 3. Interne lib/utilities
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n-context";

// 4. Interne components
import { RouteCard } from "@/components/ui/RouteCard";

// 5. Types
import type { Route, Location } from "@/lib/types";
```

### TypeScript
- Strict mode is aan. Geen `any` tenzij onvermijdelijk (dan voeg een comment toe).
- Gebruik `type` voor simpele objectvormen, `interface` voor uitbreidbare contracten.
- Exports: named exports voor components en utilities, default export voor pagina's (`page.tsx`).
- Geen `as unknown as X` tenzij het werken met Supabase-responses dit vereist (bestaand patroon).

### React & Next.js
- Voeg `"use client"` toe bovenaan elk bestand dat browser-APIs, hooks, of event handlers gebruikt.
- Server components zijn de standaard; maak alleen client components als het echt nodig is.
- Gebruik `next/image` altijd voor `<img>` met bekende afmetingen.
- `dynamic(() => import(...), { ssr: false })` voor MapLibre en andere browser-only libraries.

### Styling
- **Tailwind first**: gebruik utility classes voor layout, spacing, typografie.
- **CSS vars voor thema-kleuren**: gebruik `style={{ color: "var(--color-text)" }}`, nooit hardcoded `#1A1A18`.
- Uitzondering: brand-kleuren via Tailwind tokens (`bg-tulip-500`, `text-forest-600`).
- Geen inline `style` voor wat ook met Tailwind kan.
- Animaties via Framer Motion (`framer-motion`) of Tailwind transitions — geen eigen CSS keyframes.

### Supabase queries
- Gebruik altijd de lazy singleton: `import { supabase } from "@/lib/supabase"`.
- Server actions in `app/admin/actions.ts` gebruiken `getAdminClient()` (service role) — nooit de publieke client in server actions.
- Voeg altijd `.eq("is_active", true)` toe bij queries op `locations` en `routes`.

### Coördinaten
- Supabase slaat `geometry_points` op als `[lat, lng][]`.
- MapLibre en GeoJSON verwachten `[lng, lat][]`. **Altijd omzetten bij het laden.**
- BRouter API: `lonlats=lng,lat|lng,lat` (longitude eerst).
- OSRM API: `lng,lat;lng,lat` (longitude eerst).

### i18n
- Gebruik altijd `const { t } = useT()` voor zichtbare tekst in de UI.
- Voeg nieuwe sleutels toe aan `messages/nl.json` (leading taal) én de andere 5 JSON-bestanden.
- Hardcoded Nederlandse tekst is toegestaan in admin (`/admin`) — dat paneel is niet vertaald.

### Iconen
- Gebruik uitsluitend `lucide-react`. Geen andere icon-libraries toevoegen.

---

## Toegestane libraries (reeds aanwezig)

| Library | Gebruik |
|---------|---------|
| `next` + `react` | Framework |
| `@supabase/supabase-js` | Database, storage, realtime |
| `maplibre-gl` | Kaarten |
| `framer-motion` | Animaties |
| `lucide-react` | Iconen |
| `next-intl` | Vertalingen |
| `stripe` + `@stripe/stripe-js` | Betalingen |
| `react-image-crop` | Foto bijsnijden |
| `browser-image-compression` | Foto comprimeren |
| `web-push` | Push notificaties |
| `@capacitor/*` | iOS/Android |
| `tailwindcss` | Styling |

**Voeg geen nieuwe dependencies toe zonder overleg.** Controleer altijd eerst of het probleem op te lossen is met bestaande libraries.

---

## Regels voor Claude

### Scope
- **Wijzig nooit meer bestanden dan strikt nodig voor de taak.** Een bugfix in één component vereist geen refactor van aangrenzende bestanden.
- **Geen refactors buiten de gevraagde scope.** Als je iets opvalt, benoem het — maar pas het niet aan tenzij gevraagd.
- **Geen speculatieve abstracties.** Maak geen helpers, hooks, of utilities "voor later gebruik". Code voor de taak die er nu is.

### Hergebruik
- Controleer altijd `lib/types.ts` voor bestaande types voordat je nieuwe aanmaakt.
- Controleer `lib/` op bestaande utilities (weer, bloom, sessie, routing) voor je iets nieuws schrijft.
- Gebruik de `useT()` hook voor tekst — voeg geen eigen vertalingslogica toe.

### Bij twijfel
- **Vraag eerst, code daarna.** Als een taak meerdere aanpakken heeft met verschillende trade-offs, leg de opties voor voordat je begint.
- Meld het als een wijziging raakt aan bekende technische schuld (zie `ARCHITECTURE.md` §5).

### Altijd doen
- Bloeistatus tonen op kaart- en swipe-elementen.
- ODbL-licentie respecteren bij elke OSM-datagebruik; `© OpenStreetMap contributors` attributie weergeven bij routedata.
- TypeScript strict — geen `any`, geen `ts-ignore`.
- Mobile-first: test op ~390px viewport.

### Nooit doen
- API keys hardcoden in code of commits.
- `#E8527A` (roze) gebruiken als merkkleur.
- ANWB / RouteYou / Komoot-data kopiëren (geen licentie).
- Nieuwe npm-dependencies toevoegen zonder overleg.

### Commits en deployment
- Commit en push **altijd direct** na het afronden van een taak. Vercel deployt automatisch vanuit `main`.
- Commit messages in het **Nederlands**, conventional commits formaat:

```
feat: voeg bezienswaardigheden-sectie toe aan routedetail
fix: herstel geometrie fotografen-route
chore: verwijder ongebruikte routes zonder GPX-bron
refactor: verplaats locatie-fetch naar parent component
```

- Staged bestanden: voeg specifieke bestanden toe (`git add pad/naar/bestand`), nooit `git add -A` of `git add .`.

---

## Acceptance criteria planner

- Vragenflow afrondbaar binnen 30 seconden (5 stappen).
- Route gegenereerd in <2s na vragenflow.
- Geen 2 opeenvolgende stops in ver uiteen gelegen dorpen bij `transport=walking`.
- Bij `vibes=['bloemen']`: `flower_field` met `peak` bloom krijgt hoogste score.
- Totale reistijd + bezoektijd ≤ gekozen tijdsbudget.
- Geen TypeScript errors, geen ESLint warnings.

---

## Commando's

```bash
# Ontwikkeling
npm run dev                # Start lokale dev server op :3000

# Build
npm run build              # Productie build (web)
npm run build:mobile       # Capacitor build (iOS/Android)

# Lint & typecheck
npm run lint               # ESLint
npx tsc --noEmit           # TypeScript typecheck zonder build

# Mobile
npm run cap:ios            # Open Xcode
npm run cap:android        # Open Android Studio
npm run cap:sync           # Sync web assets naar native

# Scripts
npx tsx --env-file=.env.local scripts/migrate-routes-brouter.ts --live
```

Er zijn **geen geautomatiseerde tests**. Controleer wijzigingen handmatig in de browser.

---

## Supabase migrations

Nieuwe database-wijzigingen gaan altijd via een migratiebestand:

```
supabase/migrations/YYYYMMDDHHMMSS_beschrijving.sql
```

- Gebruik oplopende nummers binnen dezelfde dag: `20260505000000_`, `20260505000001_`, ...
- Gebruik `ON CONFLICT (slug) DO NOTHING` alleen bij initiële seed-inserts. Gebruik `UPDATE` als je bestaande rijen wilt overschrijven.
- Voer migrations uit in de Supabase SQL Editor, niet via de CLI (project heeft geen lokale Supabase setup).
- **Na aanmaken**: kopieer de SQL naar het klembord (`pbcopy`) en geef een seintje.

---

## Omgevingsvariabelen (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_MAPTILER_KEY=...
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```
