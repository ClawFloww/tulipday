---
name: gdpr-mobile-compliance
description: Use this skill when implementing GDPR/AVG compliance for a mobile app, especially apps serving EU/Dutch users. Covers consent flows that satisfy both AVG and ePrivacy directive (the "Cookiewet" for WebView-based hybrid apps), App Tracking Transparency on iOS, data subject rights (access, rectification, erasure, portability), legal basis selection, data processing agreements with subprocessors (Supabase, Firebase, Sentry, etc.), privacy policy structure under AVG Article 13/14, the difference between consent and legitimate interest, and the Digital Services Act obligations for apps. Trigger whenever the user mentions GDPR, AVG, privacy policy, consent banner, cookie consent, ATT, Autoriteit Persoonsgegevens, data deletion, "recht op vergetelheid", or compliance for EU users.
---

# GDPR/AVG Compliance for Mobile Apps

For apps serving Dutch and EU users, AVG compliance is mandatory — not aspirational. The Autoriteit Persoonsgegevens (AP) actively enforces and has issued multi-million-euro fines. This skill covers what's required, not just best practice.

## Core principles to internalize

1. **Data minimization**: collect only what you need for the stated purpose
2. **Purpose limitation**: don't reuse data for purposes the user didn't agree to
3. **Lawful basis**: every processing activity needs one of six legal bases
4. **Transparency**: tell users what, why, how, and who
5. **User control**: users can access, correct, delete their data
6. **Accountability**: you must be able to demonstrate compliance, not just claim it

## The six lawful bases (Article 6)

| Basis | When to use | Example for tourist app |
|-------|-------------|--------------------------|
| Consent | When you can't justify any other basis | Marketing emails, analytics tracking |
| Contract | Necessary to deliver a service the user requested | Storing user account for the app to function |
| Legal obligation | Required by law | Keeping financial records 7 years |
| Vital interests | Life or death | Almost never applicable |
| Public task | Government function | Not applicable to private apps |
| Legitimate interest | Your interest, balanced against user rights | Crash reporting, security logs |

**Mistake to avoid**: using consent for everything. Consent must be freely given, specific, informed, unambiguous, and revocable. If users can't realistically say no (e.g. "consent to all this or you can't use the app"), it's not valid consent.

For TulipDay-style app:
- **Contract**: account, location-based features the user explicitly enabled
- **Legitimate interest**: crash reporting (with opt-out), basic functional analytics
- **Consent**: marketing, personalized ads, tracking analytics, photo storage beyond app function

## The consent banner / cookie banner question

The "Cookiewet" (Dutch implementation of ePrivacy directive) applies to apps too — not just websites. ANY storage of information on the user's device that isn't strictly necessary requires consent. This includes:
- Analytics cookies/storage (unless privacy-preserving)
- Marketing identifiers
- Third-party SDKs that store IDs

Strictly necessary (no consent needed):
- Auth tokens (so the user stays logged in)
- App functional state (preferences, language)
- Security cookies

For Capacitor/WebView hybrid apps, the storage is still subject to the rules — you can't escape via "it's an app, not a website".

### Compliant consent banner requirements

Per AP guidance:
1. **Granular**: separate toggles for each purpose (analytics, marketing, etc.). NOT just "Accept all".
2. **Equally prominent reject**: "Reject all" must be as visible as "Accept all". A small grey link is non-compliant.
3. **No pre-ticked boxes**: defaults must be off.
4. **No cookie wall**: can't refuse service for refusing consent (with narrow exceptions for paywalls/PURs).
5. **Revocable**: easy access to change consent later. Settings screen with one tap.
6. **Logged**: keep proof of when, what, and how each user consented.

In practice, this looks like a modal on first launch with:
- Plain explanation of what data, why
- Per-category toggles (Functional [always on], Analytics, Marketing)
- "Accept selected" and "Reject all" buttons of equal weight
- Link to full privacy policy

## App Tracking Transparency (iOS) and consent

ATT and AVG consent are separate but overlapping requirements:
- **ATT**: Apple's technical mechanism, required for any cross-app tracking
- **AVG consent**: legal requirement for processing non-functional data

For a fully compliant app, you typically need BOTH:
1. AVG consent banner first (user gives or refuses consent)
2. ATT prompt only if the user consented to relevant categories

If the user refuses AVG consent, **don't** show the ATT prompt — that would be misleading.

```typescript
// Pseudo-code for the consent flow
async function initializeConsentFlow() {
  const consent = await getOrPromptAvgConsent();

  if (consent.analytics && Capacitor.getPlatform() === 'ios') {
    // Only request ATT if user consented to analytics that may track
    await AppTrackingTransparency.requestPermission();
  }

  initializeSdksBasedOnConsent(consent);
}
```

## Privacy policy required content (Article 13/14)

Your privacy policy must include, at minimum:

1. **Controller identity** — company name, address, KvK number, contact
2. **DPO contact** — if you have one (most small apps don't legally need one, but having a privacy contact email is required)
3. **Purposes of processing** — what you do with the data
4. **Legal basis for each purpose**
5. **Recipients of data** — who you share with (named subprocessors)
6. **International transfers** — if data leaves EU/EEA, what safeguards (SCCs, adequacy decisions)
7. **Retention periods** — how long you keep what
8. **Data subject rights** — access, rectification, erasure, portability, objection, restriction
9. **Right to withdraw consent** — and how
10. **Right to lodge a complaint** — with Autoriteit Persoonsgegevens
11. **Whether providing data is mandatory** — and consequences of not providing
12. **Automated decision-making** — if any, including profiling

For a Dutch app, write it in Dutch (primary audience language). Bilingual is fine if you also have English-speaking users.

## Subprocessor management

Every third-party service that processes user data on your behalf is a "subprocessor" and you need:

1. **DPA (Data Processing Agreement)** — signed with each. Most major providers offer standard DPAs you accept online.
2. **Listed in your privacy policy** — named, with what data they process
3. **Verified location and safeguards** — if outside EU, SCCs (Standard Contractual Clauses) needed

Common subprocessors for a tourist app and where to find their DPA:

| Service | DPA | Data residency options |
|---------|-----|------------------------|
| Supabase | dashboard → settings → DPA | EU regions available |
| Firebase | console → privacy & security | EU multi-region available |
| Sentry | sentry.io/legal/dpa/ | EU instance: sentry.io/eu |
| PostHog | posthog.com/dpa | EU Cloud option |
| Cloudflare | dashboard → legal | global, with SCCs |
| Unsplash | unsplash.com/terms | US, SCCs apply |
| Mapbox | mapbox.com/legal/dpa | global, EU option |

For Supabase specifically: choose an EU region (eu-west, eu-central) for new projects. Migration after the fact is painful.

## Schrems II and US transfers

If any subprocessor sends data to the US (Firebase, Sentry US, etc.), you're under heightened scrutiny since the Schrems II ruling. The EU-US Data Privacy Framework (operational since July 2023) provides a legal basis if the US provider is certified under it.

Check certification at dataprivacyframework.gov/list. Most major providers are certified but verify before listing.

Even with DPF, you must:
- Disclose the transfer in your privacy policy
- Have SCCs as backup
- Document a TIA (Transfer Impact Assessment) — for small apps, this can be brief

## Data subject rights — implementing them

Users have the right to:
- **Access** — receive a copy of all data you have on them (Article 15)
- **Rectification** — correct inaccurate data (Article 16)
- **Erasure / "right to be forgotten"** — delete their data (Article 17)
- **Portability** — get data in a machine-readable format (Article 20)
- **Objection** — stop processing for direct marketing, etc. (Article 21)
- **Restriction** — temporarily limit processing (Article 18)

You must respond within **30 days** (extendable by 60 in complex cases).

Implementation in the app:

### In-app delete account (REQUIRED for App Store + best practice)

Settings → Account → Delete Account. Must:
- Be reachable without contacting support
- Delete the user's data within a reasonable time (immediate for most, up to 30 days for backups)
- Send confirmation
- Not just deactivate — actually delete

Code:
```typescript
async function deleteAccount() {
  await confirmDialog('Permanently delete your account and all data?');
  await supabase.functions.invoke('delete-user-data', {
    body: { userId: currentUser.id }
  });
  await supabase.auth.signOut();
  // Server-side function cascades the deletion across tables
}
```

### Data export

Settings → Privacy → Download my data. Generate a JSON or ZIP with all user data:
- Account info
- Saved favorites, routes
- Uploaded photos (or links)
- Activity log

Server-side function generates and emails the download link.

## Children and apps

If your app is "directed at children" or knowingly used by children under 16 (NL specifically), you face stricter rules:
- Consent must be from parent
- Cannot use legitimate interest for marketing to children
- No targeted advertising to children

Tourist apps generally aren't directed at children, but if you have content that appeals to families and might attract under-16 users, address it in your terms (minimum age 16, parental consent for under 16 in NL).

## Digital Services Act (DSA) obligations

As of 2024-2025, DSA applies to most online services. For a small app:
- **Point of contact** for users and authorities (single email is fine)
- **Transparency report** if you have user-generated content (annual)
- **Notice and action mechanism** for illegal content reports (if UGC)
- **Trader information** if you facilitate sales (not applicable to tourist info apps)

For TulipDay-style app without UGC, DSA obligations are minimal: just the contact point.

## Cookie consent in WebViews — implementation

For Capacitor apps, the WebView is your app — there's no separate "browser cookie banner". You build the consent UI as part of the app. Store consent state in `@capacitor/preferences` or your DB.

```typescript
interface ConsentState {
  functional: true; // always true
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
  version: number; // increment when policy changes, re-prompt
}

async function getConsent(): Promise<ConsentState> {
  const stored = await Preferences.get({ key: 'consent' });
  if (!stored.value) return null;
  const parsed = JSON.parse(stored.value);
  if (parsed.version < CURRENT_POLICY_VERSION) return null; // re-prompt
  return parsed;
}

async function recordConsent(state: ConsentState) {
  await Preferences.set({
    key: 'consent',
    value: JSON.stringify({
      ...state,
      timestamp: Date.now(),
      version: CURRENT_POLICY_VERSION,
    }),
  });
  // Also log server-side for accountability
  await logConsentEvent(state);
}
```

Initialize SDKs conditionally:
```typescript
const consent = await getConsent();
if (consent?.analytics) {
  initializePostHog();
  initializeSentryWithPII();
}
if (consent?.marketing) {
  initializeMarketingSDK();
}
// Functional always
initializeAuthAndCore();
```

## Photos and user-generated content

If users upload photos in your app:
- Consent for upload is implicit in the action, but...
- Privacy policy must cover photo storage and processing
- Provide a way to delete uploaded photos
- If photos contain other people (groups, etc.), the uploader is responsible for their consent — but you should remind them
- EXIF data often contains location — strip on upload unless the user opts in to keep it

## Audit trail

You must be able to demonstrate compliance. Keep records of:
- Each user's consent (what, when, version of policy)
- Data processing register (Article 30 — required if >250 employees, but small companies still need it if processing isn't occasional)
- Subprocessor list with DPA signed dates
- Data breach log (Article 33 — must notify AP within 72 hours of becoming aware)

For a small app, a Notion doc or simple admin dashboard is fine. Don't over-engineer, but don't skip.

## Privacy by design — checklist for new features

Before shipping any new feature involving user data:

- [ ] What data does this collect?
- [ ] Why? Is it strictly necessary?
- [ ] What's the legal basis?
- [ ] Does the privacy policy already cover this?
- [ ] Are subprocessors disclosed?
- [ ] Can users opt out?
- [ ] How long is data retained?
- [ ] Is data deletion handled when user deletes account?
- [ ] Are children specially considered?
- [ ] Is the consent UI compliant if consent is the basis?

## Common Dutch-specific gotchas

1. **Translations matter**: privacy policy and consent UI in Dutch for NL audience
2. **AP guidance is stricter than EU minimum**: pre-ticked boxes have been actively prosecuted
3. **"Toestemming" wording**: use the standard Dutch wording — "Ik geef toestemming voor..." not creative alternatives that might be seen as misleading
4. **Contact details required**: NL companies need to disclose KvK number, real address, not just email

## Resources

- AP guidance: autoriteitpersoonsgegevens.nl
- EU GDPR text: gdpr-info.eu
- EDPB guidelines: edpb.europa.eu
- Privacy policy generator (starting point only, customize): iubenda.com, termsfeed.com — never ship a generic template as-is
