# Privacybeleid TulipDay — CONCEPT v1.1

> **Status: concept, nog niet live.** Gebaseerd op wat de code op 21 november 2026 werkelijk doet.
> Laat dit nalezen (bij voorkeur door een jurist) voordat het in de app en op tulipday.online komt.
>
> **Nog in te vullen of te beslissen** (gemarkeerd met ⚠️ in de tekst):
> 1. Bedrijfsgegevens: handelsnaam, adres, KvK-nummer (§1).
> 2. Eén contactadres kiezen: de app gebruikt nu zowel `info@tulipday.online` als `hello@tulipday.online`.
> 3. Supabase-regio bevestigen (Supabase-dashboard → Project Settings → General → Region). Dit concept gaat uit van een EU-regio.
> 4. Bewaartermijnen (§7): er bestaat nu **geen enkele automatische opschoning**. De termijnen hieronder zijn voorstellen; ze moeten nog gebouwd worden óf de tekst moet worden aangepast.
> 5. Resend en In-App Purchase (RevenueCat) staan erin omdat ze gepland zijn. Haal ze weg als ze bij publicatie nog niet live zijn.
> 6. De Gebruiksvoorwaarden bevatten ook onjuistheden (§3 "betalingen via App Store/Google Play", §5 "locatiedata wordt nooit gedeeld"). Die moeten in dezelfde ronde mee.

---

**Laatst bijgewerkt:** ⚠️ [datum van publicatie] · versie 1.1

## 1. Wie zijn wij?

TulipDay is een app en website (tulipday.online) waarmee je bollenvelden, bloeistatussen en routes in de Bollenstreek ontdekt.

Verwerkingsverantwoordelijke: ⚠️ [handelsnaam], [adres], [postcode en plaats], KvK-nummer [nummer].
Contact over privacy: ⚠️ [info@tulipday.online of hello@tulipday.online].

## 2. Kort samengevat

- Je kunt TulipDay gebruiken **zonder je naam of e-mailadres op te geven**. De app maakt dan op de achtergrond een anoniem account aan.
- Wil je je opgeslagen plekken en seizoenspas op meerdere apparaten, dan kun je inloggen met je e-mailadres of met Apple.
- Je locatie gebruiken we alleen op je toestel en om kaarten, routes en weer te tonen; we slaan je locatie **niet** op onze servers op.
- We gebruiken **geen advertenties, geen tracking-cookies** en verkopen nooit gegevens.
- Je kunt je account en gegevens op elk moment zelf verwijderen in de app (Instellingen → Account → Account verwijderen).

## 3. Welke gegevens verwerken we, waarvoor en op welke grondslag?

| Gegevens | Waarvoor | Grondslag (AVG art. 6) |
|---|---|---|
| **Anonieme account-ID** (een willekeurige code) en technische inloggegevens zoals IP-adres en tijdstip | Je opgeslagen plekken en seizoenspas aan jou koppelen, misbruik voorkomen | Uitvoering van de overeenkomst; gerechtvaardigd belang (beveiliging) |
| **E-mailadres** (alleen als je inlogt met e-mail) | Je een inlogcode sturen en je account herkennen | Uitvoering van de overeenkomst |
| **Apple-ID-gegevens** (alleen bij Inloggen met Apple): een Apple-gebruikers-ID en je e-mailadres of een anoniem doorstuuradres van Apple | Inloggen | Uitvoering van de overeenkomst |
| **Opgeslagen plekken en routes** | Je favorieten tonen, ook op andere apparaten | Uitvoering van de overeenkomst |
| **Seizoenspas-gegevens**: wat je kocht, wanneer, het bedrag en een transactiecode van de betaaldienst | Je premium-functies activeren, terugbetalingen verwerken, boekhouding | Uitvoering van de overeenkomst; wettelijke verplichting (fiscale bewaarplicht) |
| **Foto's en bijschriften die je uploadt**, met de locatie waarbij je ze plaatst | Tonen aan andere gebruikers na controle; bloeistatus bijhouden | Toestemming (je vinkt dit aan bij uploaden) |
| **IP-adres bij foto's voor het Bloemencorso** | Misbruik en spam voorkomen | Gerechtvaardigd belang |
| **Gebruiksstatistieken**: welke schermen en functies worden gebruikt, gekoppeld aan een willekeurige sessiecode (geen naam of e-mail), plus anonieme statistieken via Vercel Analytics en Speed Insights (zonder cookies) | De app verbeteren en fouten opsporen | Gerechtvaardigd belang |
| **Pushmeldingen** (als je ze aanzet): een technisch adres van je toestel en je taal | Je bloei-meldingen sturen | Toestemming |
| **Je locatie** (als je dat toestaat) | Velden in de buurt, routes, navigatie en het weer op jouw plek tonen | Toestemming (via de toestemmingsvraag van je telefoon of browser) |

Wat **alleen op je toestel** blijft en niet naar onze servers gaat: je laatst bekende locatie (maximaal 5 minuten gebruikt), je planner-voorkeuren, je zelf getekende routes (tenzij je ze deelt), taal, thema en of je de rondleiding al hebt gezien.

**Foto's:** bij het uploaden verwijdert de app de verborgen gegevens uit de foto (EXIF), waaronder de GPS-locatie van je camera.

**Gedeelde routes:** als je een eigen route deelt, slaan we die route op zodat iedereen met de link hem kan bekijken.

## 4. Je locatie

Je locatie wordt alleen gebruikt als je daar toestemming voor geeft, en alleen op het moment dat je een functie gebruikt (bijvoorbeeld "In de buurt", navigatie of het weer). We slaan je locatie niet op onze servers op.

Om kaarten, routes en weer te tonen stuurt je toestel wel coördinaten of een kaartgebied rechtstreeks naar de diensten in §5 (bijvoorbeeld Open-Meteo voor het weer en BRouter/OSRM voor routes). Die diensten krijgen daarbij ook je IP-adres te zien. Je kunt locatietoegang altijd intrekken in de instellingen van je telefoon; de app blijft dan werken met Lisse als startpunt.

## 5. Met wie delen we gegevens?

We verkopen geen gegevens en delen niets met adverteerders. We werken met deze partijen:

**Verwerkers** (werken in onze opdracht, met een verwerkersovereenkomst):
- **Supabase**: database, accounts en opslag van foto's. ⚠️ [EU-regio bevestigen]
- **Vercel**: hosting van de website en de server, plus cookieloze statistieken. Vercel is een Amerikaans bedrijf; servers in Frankfurt.
- ⚠️ **Resend**: verzending van inlogcodes per e-mail. *(alleen vermelden als dit live is)*

**Zelfstandige partijen** (verwerken gegevens onder hun eigen privacybeleid):
- **Stripe**: betalingen van de seizoenspas via de website. Je betaalgegevens (kaart, iDEAL) gaan rechtstreeks naar Stripe; wij zien ze nooit.
- **Apple** (App Store, Inloggen met Apple) en **Google** (Google Play): downloads en, ⚠️ via **RevenueCat**, aankopen in de app *(alleen vermelden als In-App Purchase live is)*.
- **Kaart-, route- en weerdiensten** die je toestel rechtstreeks benadert en die daarbij je IP-adres en het opgevraagde gebied of de coördinaten ontvangen:
  - **MapTiler** en **OpenFreeMap**: kaarttegels;
  - **BRouter**, **OSRM** en **FOSSGIS** (routing.openstreetmap.de): routes;
  - **Overpass API**: kaartgegevens van OpenStreetMap;
  - **Open-Meteo**: weer;
  - **Unsplash**: sfeerfoto's.
- **Google** (Street View en Google Maps) en **Apple Maps**: alleen als je zelf Street View opent of kiest om in die app te navigeren.
- **Pushdiensten** van Apple, Google of je browser: als je pushmeldingen aanzet.

**Doorgifte buiten de EU:** sommige partijen (zoals Vercel, Stripe, Apple, Google en Resend) zijn Amerikaanse bedrijven. Doorgifte gebeurt op basis van het EU-VS Data Privacy Framework of de standaardcontractbepalingen van de Europese Commissie.

## 6. Cookies en vergelijkbare technieken

TulipDay gebruikt **geen tracking- of advertentiecookies**. We bewaren wel functionele gegevens lokaal op je toestel (local storage), zoals je inlogsessie, taal, thema en favoriete instellingen. Die zijn nodig om de app te laten werken. Vercel Analytics werkt zonder cookies.

## 7. Hoe lang bewaren we gegevens?

⚠️ *Voorstel. Er draait nu nog geen automatische opschoning; die moet worden gebouwd voordat deze termijnen worden gepubliceerd.*

| Gegevens | Bewaartermijn |
|---|---|
| Account, e-mailadres, opgeslagen plekken | Tot je je account verwijdert |
| Anonieme accounts die niet meer gebruikt worden | ⚠️ 12 maanden na laatste gebruik |
| Aankoopgegevens seizoenspas | 7 jaar (fiscale bewaarplicht) |
| Foto's en bijschriften | Tot je om verwijdering vraagt, of uiterlijk 2 jaar na uploaden |
| IP-adressen bij corso-foto's | ⚠️ 3 maanden |
| Bloeistatus-meldingen | 7 dagen |
| Gebruiksstatistieken (sessiecode) | ⚠️ 13 maanden |
| Pushmelding-registratie | Tot je meldingen uitzet of je account verwijdert |
| Locatie op je toestel | Maximaal 5 minuten in het geheugen van de app |

## 8. Je rechten

Je hebt het recht om je gegevens in te zien, te laten corrigeren of verwijderen, de verwerking te laten beperken, bezwaar te maken en je gegevens mee te nemen (dataportabiliteit). Gaf je toestemming, dan kun je die altijd intrekken.

- **Account verwijderen:** kan direct in de app via Instellingen → Account → Account verwijderen. Je account, opgeslagen plekken en seizoenspas worden dan verwijderd. Gedeelde foto's blijven zonder koppeling aan jou zichtbaar; wil je die ook weg, mail ons dan.
- **Andere verzoeken:** mail naar ⚠️ [contactadres]. We reageren binnen 30 dagen.
- **Klacht:** ben je niet tevreden, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).

## 9. Kinderen

TulipDay is geschikt voor alle leeftijden. Voor het inloggen met een account en het uploaden van foto's moet je 16 jaar of ouder zijn, of toestemming hebben van een ouder of voogd.

## 10. Beveiliging

We versleutelen alle verbindingen (HTTPS). Toegang tot gegevens is per gebruiker afgeschermd: je kunt alleen je eigen opgeslagen plekken en aankopen zien. Alleen beheerders kunnen geüploade foto's controleren voordat ze zichtbaar worden.

## 11. Wijzigingen

Als we dit beleid wijzigen, passen we de datum en het versienummer bovenaan aan. Bij belangrijke wijzigingen laten we dat in de app weten.

---

*Partners (horeca en bollenkwekers) met een account voor het partnerportaal: wij verwerken je e-mailadres, je bedrijfsgegevens en de updates die je plaatst om het portaal te laten werken (uitvoering van de overeenkomst). Deze gegevens bewaren we zolang je partner bent.*
