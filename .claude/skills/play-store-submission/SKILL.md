---
name: play-store-submission
description: Use this skill when preparing to submit an Android app to the Google Play Store, especially Capacitor or hybrid apps. Covers Google Play Console setup, app signing via Play App Signing, the Data Safety form (different from iOS privacy nutrition label), Play Integrity API, internal/closed/open/production testing tracks, AAB (Android App Bundle) requirements, target API level requirements, content rating via IARC, and the policy areas that hybrid apps commonly fail (especially WebView-only restrictions and permissions disclosure). Trigger whenever the user mentions Play Store, Google Play Console, AAB, APK, app signing, internal testing, Play Integrity, target API, or shipping to Android users.
---

# Google Play Store Submission Guide

Play Store review is generally faster than App Store but has its own gotchas, especially around target API levels, the data safety form, and policy violations that hit hybrid apps differently.

## Prerequisites

- [ ] Google Play Console account ($25 one-time fee, paid and active)
- [ ] App ID created and locked in (cannot change after publish)
- [ ] App builds as a signed AAB in Release configuration
- [ ] Target SDK meets Google's current requirement (API 35 / Android 15 as of late 2025, API 36 / Android 16 coming Aug 2026)
- [ ] Privacy policy URL deployed and reachable

## Target API level requirement

This is the most frequent policy violation for older apps. Google requires apps to target a recent Android API level:

- **New apps in 2026**: must target API 35 (Android 15) or higher
- **Updates to existing apps in 2026**: must target API 35 or higher
- **August 2026**: requirement bumps to API 36 (Android 16)

In `android/app/build.gradle`:
```gradle
android {
    compileSdk 35
    defaultConfig {
        minSdk 23  // Android 6.0 — Capacitor 8 minimum
        targetSdk 35
    }
}
```

Capacitor 8 ships with appropriate defaults but if your project was upgraded from older versions, double-check.

## App signing: use Play App Signing

Google strongly recommends (and for new apps, requires) Play App Signing. The flow:
1. You generate an **upload key** locally
2. You sign your AAB with the upload key
3. Play Console re-signs with the **app signing key** they hold
4. The app signing key is used for actual installation

This means:
- You can lose your upload key without losing the app
- Google can do per-device APK optimization
- Your signing key is in Google's HSM, not on your laptop

To set up:
1. In Play Console → Setup → App integrity → App signing
2. Generate an upload key on your machine:
   ```bash
   keytool -genkey -v -keystore tulipday-upload.keystore \
     -alias tulipday-upload -keyalg RSA -keysize 2048 -validity 25000
   ```
3. Sign your first AAB with this key
4. Upload — Play takes over from there

**Back up the upload keystore** somewhere safe (password manager, encrypted disk). If you lose it AND can't recover, you need to reset the upload key (manual process with Google).

## Building an AAB

AAB (Android App Bundle) is required for new apps since 2021. It's NOT the same as an APK — it's a bundle that Play splits into per-device APKs.

Build via Android Studio:
1. Build → Generate Signed Bundle / APK
2. Choose Android App Bundle
3. Select keystore (your upload key)
4. Build variant: `release`
5. Output: `android/app/release/app-release.aab`

Or via Gradle CLI:
```bash
cd android
./gradlew bundleRelease
```

For Capacitor specifically, run `npx cap sync android` first to ensure web assets are up to date.

## Creating the Play Console app record

Play Console → All apps → Create app.

Fields:
- **App name** (50 chars, shown on Play Store)
- **Default language** — e.g. Dutch (Netherlands) for NL-first
- **App or game**: App
- **Free or paid**: Free (you can monetize via IAP later)
- **Declarations**: confirm developer program policies, US export laws

## The Data Safety form

This is the Play equivalent of iOS's privacy nutrition label, but more detailed and has its own logic.

Located at: App content → Data safety.

You declare:

1. **Does your app collect or share any user data?**
2. **For each data type** (Location, Personal info, Financial info, Health, Messages, Photos, etc.):
   - Is it collected?
   - Is it shared with third parties?
   - Is collection optional?
   - Is data encrypted in transit?
   - Can users request deletion?
   - Why is it collected (purposes from a fixed list)?

For TulipDay-style app, typical declaration:

| Data type | Collected | Shared | Optional | Encrypted | Deletion | Purpose |
|-----------|-----------|--------|----------|-----------|----------|---------|
| Email address | Yes (auth) | No | Yes | Yes | Yes | Account management |
| Location (approx) | Yes | No | Yes | Yes | Yes | App functionality |
| Photos | Yes (if user uploads) | No | Yes | Yes | Yes | App functionality |
| Crash logs | Yes | Yes (Sentry) | No | Yes | Yes | Analytics, app functionality |
| App interactions | Yes | Yes (analytics provider) | Yes | Yes | Yes | Analytics |
| Device IDs | Yes (for push) | Yes (FCM) | Yes | Yes | Yes | Communications |

**Be honest.** Google audits this against permissions you request and SDKs you include. A mismatch leads to suspension.

## Content rating (IARC)

App content → Content rating questionnaire. You answer questions about your app's content; IARC generates ratings for different regions (PEGI for EU, ESRB for US, etc.).

For tourist apps with no user-generated content, expect "Everyone / PEGI 3".

If your app has UGC (reviews, photos uploaded by users), you must answer accordingly and may need to implement content moderation.

## Privacy policy

Mandatory for all apps. URL goes in:
- Play Console → App content → Privacy policy
- The app itself (settings → privacy)

Must cover:
- What data you collect
- Why
- Who you share with
- How users can delete their data
- Contact info for privacy inquiries
- Specific to GDPR/AVG: legal basis, retention periods, data subject rights

See `gdpr-mobile-compliance` skill for details.

## Required app information

### Main store listing
- **App name** (50 chars)
- **Short description** (80 chars) — appears in search results
- **Full description** (4000 chars) — markdown-ish: line breaks work, bold via `<b>` tags
- **App icon** (512×512 PNG, 32-bit with alpha)
- **Feature graphic** (1024×500 PNG/JPG) — appears at top of listing
- **Phone screenshots** (2-8, 16:9 or 9:16 ratio, 320-3840px per side)
- **Tablet screenshots** (optional but boost discoverability)
- **App category** (e.g. Travel & Local)
- **Tags** (up to 5, helps categorization)

### Store listing assets
- Feature graphic is more visually important on Play than App Store screenshots — invest in a polished one
- Screenshots should have text overlays explaining features
- Consider a YouTube video link (max 30 seconds, hosted on YouTube)

## Testing tracks

Play has four tracks, in order:

1. **Internal testing** — up to 100 testers, no review delay, instant. Use for daily QA.
2. **Closed testing** — up to ~2000 testers (or open to a Google Group), light review, hours.
3. **Open testing** — public beta, anyone with the link can join, light review.
4. **Production** — full release, full review (~few hours typically, can take days).

For new apps, Google now requires **12+ testers in a closed test for 14+ days** before production release. This is a significant change as of late 2023 and catches new developers off guard.

Workflow:
1. Set up Internal testing first with team
2. Move to Closed testing with 12+ external testers (recruit via TestFlight-style email list)
3. Run for 14 days, fixing bugs
4. Promote to Production

## Play Integrity API

Replaces SafetyNet (which is deprecated). Used to verify the app is genuine and running on a legitimate Android device, not a modded or emulator instance.

Required if you:
- Have a backend that needs to trust the client
- Do payments
- Distribute paid content

Not required for:
- Simple tourist apps with public-ish content
- Apps without sensitive backend operations

For TulipDay, Play Integrity is optional but recommended if you have backend rate limits to enforce.

Integration via `@capacitor-community/play-integrity` or similar plugin.

## Policy areas that hit hybrid apps

### Webview/spam content (Inappropriate Content)
Same rationale as Apple's 4.3. Apps that are pure WebView wrappers over a website get rejected. Mitigations:
- Real native features: push, location, camera, offline
- Mobile-optimized UI, not desktop-shrunk
- Compelling app-specific value (you can do something in the app you can't do on the website)

### Permissions and APIs (Permissions policy)
Each permission you request must:
- Be necessary for a user-facing feature
- Be requested at point of use (not at launch)
- Have a justification in your data safety form

Common permission disclosure issues:
- **Background location**: needs explicit purpose + prominent in-app disclosure dialog before requesting
- **Storage**: `WRITE_EXTERNAL_STORAGE` is restricted; use scoped storage or `MediaStore`
- **Phone state**: don't request unless you actually need it
- **All files access** (`MANAGE_EXTERNAL_STORAGE`): requires special declaration, almost never approved

### Health, finance, government apps
Extra category-specific policies. Tourist apps are generally outside these, but if you add a feature like "trip insurance" or "ticket purchasing", you cross into finance territory.

## Submission process

1. Build signed AAB
2. Upload to a testing track (Internal first)
3. Verify it installs and works on test devices
4. Complete all sections marked with red exclamation in left sidebar:
   - Main store listing
   - Store settings
   - App access (if there's a login, provide test credentials)
   - Ads (declare if you have ads — usually no)
   - Content rating
   - Target audience
   - News apps (if applicable)
   - COVID-19 contact tracing (declare no)
   - Data safety
   - Government apps (declare no)
   - Financial features (declare no)
5. Promote build through tracks (Internal → Closed → Production)
6. Submit Production release

## App access (for review)

If your app requires login, you MUST provide test credentials in Play Console → App content → App access. Otherwise reviewers can't get past login and your app gets rejected.

Example entry:
```
Username: reviewer@tulipday.nl
Password: ReviewTest2026!
```

Create a dedicated test account, not a real one.

## Localization

For Dutch app:
- Default store listing in Dutch (NL)
- Add English (US) translation for tourist discoverability
- App itself only needs Dutch but English helps

Play auto-translates if you don't provide manual translation, but the quality is poor — always translate manually.

## Handling rejections

Play rejections come via email with a policy code. Common ones:

- **Permissions policy** — usually means you request a permission without clear in-app justification
- **Spam (Inappropriate Content > Spam)** — WebView-only style apps
- **Misleading claims (Deceptive Behavior)** — screenshots show features not in app
- **Data safety mismatch** — declared data practices don't match SDK behavior
- **Privacy policy issues** — broken link, missing required disclosures
- **Target API level** — app targets too old

You can appeal in Play Console → Policy → App content → contact form. Response in 1-3 business days typically.

**Three policy strikes within 12 months can suspend your developer account.** Take rejections seriously, don't just resubmit hoping for a different reviewer.

## Versioning

In `android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 23      // integer, must increment every upload
    versionName "1.2.0" // user-visible, semver
}
```

Increment `versionCode` for every AAB upload to Play, even to test tracks.

## Pre-submission checklist

- [ ] AAB built and signed with upload key (Play App Signing enabled)
- [ ] Target SDK meets current requirement (35+ in 2026)
- [ ] Min SDK reasonable (23 for Capacitor 8)
- [ ] App icon 512×512 in Play Console
- [ ] Feature graphic 1024×500 created
- [ ] 2-8 phone screenshots uploaded
- [ ] Short and full description in Dutch (+ English if going international)
- [ ] Privacy policy URL working
- [ ] Data safety form completed honestly
- [ ] Content rating completed
- [ ] All permissions justified and requested at point of use
- [ ] App access credentials provided if login required
- [ ] At least 12 testers signed up in closed track for 14+ days (for new apps)
- [ ] versionCode incremented from previous upload
- [ ] Tested on real Android devices, not just emulator
