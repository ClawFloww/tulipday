---
name: app-store-submission
description: Use this skill when preparing to submit an iOS app to the Apple App Store, especially Capacitor or hybrid apps. Covers App Store Connect setup, code signing and provisioning profiles, TestFlight workflow, App Store review guidelines (with focus on 2.1 minimum functionality, 4.0 design, 4.3 spam, and 5.1 privacy which commonly trip hybrid apps), required metadata, screenshot specifications, age ratings, the privacy nutrition label, app tracking transparency disclosures, and the submission and review process. Trigger whenever the user mentions App Store, App Store Connect, TestFlight, app review, app rejection, IPA build, provisioning profiles, or shipping to iOS users.
---

# App Store Submission Guide

The App Store review process is the highest-stakes phase of mobile development. A rejection costs days. This skill covers the full pipeline from a working app to "Ready for Sale" status.

## ⚠️ Xcode 26 / iOS 26 SDK requirement (effective April 28, 2026)

Apple now **rejects every submission** to App Store Connect that was built with an older toolchain. This applies to first submissions and all updates.

- Build with **Xcode 26 or later** using the **iOS 26 SDK**
- Older Xcode (Xcode 16 / iOS 18 SDK) uploads are blocked at the App Store Connect level
- Capacitor itself is fully compatible — no Capacitor-side migration needed
- Action: install Xcode 26 locally, or use a cloud build service (Capgo Build, Capawesome Cloud, EAS macOS runners) that's already on the new stack
- If using GitHub Actions or another CI: pin the runner to `macos-15` or later with Xcode 26 selected via `sudo xcode-select -s /Applications/Xcode_26.app`

This is Apple's normal annual cutoff but enforcement is real and immediate — the build will simply fail upload.

## Prerequisites

Before starting submission:
- [ ] Apple Developer Program membership ($99/year, paid and active)
- [ ] **Xcode 26 or later installed and selected** (see warning above)
- [ ] App ID created in Apple Developer portal
- [ ] App Store Connect record created
- [ ] App builds and runs on a real iOS device in Release configuration
- [ ] All required `Info.plist` permission strings are present (in English AND any localizations)
- [ ] App icon at 1024×1024 (no alpha, no rounded corners, sRGB or P3)

## App ID and bundle identifier

Pattern: reverse domain notation. Examples:
- `com.floww.tulipday`
- `nl.companyname.appname`

Once set, **you cannot change the bundle ID** without creating a new app record. Choose carefully.

Register in Apple Developer portal → Identifiers → App IDs. Enable any capabilities you'll need:
- Push Notifications
- Associated Domains (for universal links)
- Sign in with Apple (mandatory if you offer any other social login)
- In-App Purchase (if monetizing)

## Signing and provisioning

For Capacitor apps, signing happens in Xcode. The cleanest setup:

1. **Automatic signing** (recommended for most apps):
   - Xcode → target → Signing & Capabilities → check "Automatically manage signing"
   - Select your team
   - Xcode generates and manages certificates and profiles

2. **Manual signing** (for CI/CD or team setups):
   - Create Distribution Certificate in Apple Developer portal
   - Create App Store Provisioning Profile
   - Download and install both
   - Reference in Xcode build settings

For CI/CD specifically, use Fastlane Match — see `mobile-cicd-fastlane` skill.

## Building for the App Store

In Xcode:
1. Select "Any iOS Device" as the destination (not a simulator)
2. Product → Archive
3. Once archived, the Organizer opens
4. Click "Distribute App" → "App Store Connect" → "Upload"
5. Follow prompts, sign with distribution cert
6. Build appears in App Store Connect after ~10-30 min of processing

Common errors at this stage:
- **Missing Push Notifications entitlement**: add capability in Xcode
- **Provisioning profile doesn't match**: regenerate in dev portal, re-download in Xcode
- **Invalid Swift support**: clean build folder, rebuild
- **Asset catalog errors**: regenerate icons with `@capacitor/assets` from a clean 1024x1024

## App Store Connect record

Create at appstoreconnect.apple.com → My Apps → "+".

Required fields:
- **Platform**: iOS
- **Name**: TulipDay (this appears on the App Store, max 30 chars)
- **Primary Language**: e.g. Dutch (NL) for a Dutch-first app
- **Bundle ID**: matches your Xcode project
- **SKU**: internal identifier, never seen by users (e.g. `tulipday-ios-001`)
- **User Access**: who on your team can see this app

## Required metadata for submission

### App Information tab
- **Subtitle** (30 chars) — shown under app name, key for conversion
- **Category** — Primary required, Secondary optional. Travel for TulipDay.
- **Content Rights** — declare if you have rights to all content
- **Age Rating** — answer the questionnaire honestly

### Version Information tab
- **Promotional Text** (170 chars) — can change without resubmission, use for seasonal updates ("Tulip season 2026 is here!")
- **Description** (4000 chars) — markdown not supported, but line breaks work
- **Keywords** (100 chars, comma-separated) — crucial for ASO, no spaces wasted
- **Support URL** — required, must work
- **Marketing URL** — optional
- **Version Number** — must match your Xcode build version

### Screenshots
Required sizes (as of 2026):
- **iPhone 6.9"** (1320×2868) — iPhone 16 Pro Max
- **iPhone 6.5"** (1284×2778 or 1242×2688) — older Pro Max devices
- **iPad 13"** (2064×2752) — if you support iPad

If you only provide 6.9" screenshots, the App Store auto-scales for smaller devices. Provide both 6.9" and 6.5" for best display.

Each device class needs 1-10 screenshots. Best practice: 3-5 with text overlays explaining features ("Discover hidden tulip fields", "Plan your day with smart routes", etc.).

Use a tool like Screenshots Studio, Previewed, or AppLaunchpad — manually placing UI shots in device frames takes forever.

### App Preview videos (optional but recommended)
- 15-30 seconds
- Captured on-device (Xcode → Window → Devices → record screen)
- Shows actual app, not marketing animation
- Adds 20-40% conversion lift per Apple's data

## The privacy nutrition label

Filled in App Store Connect → App Privacy. Required for every app.

For TulipDay (with auth, maps, push, photos, analytics), expect to declare:
- **Contact Info** — Email Address (linked to identity, for auth)
- **Location** — Precise/Coarse Location (linked to identity if user has account, NOT linked if anonymous, used for App Functionality)
- **Identifiers** — User ID, Device ID (Device ID is tracking unless used only for analytics)
- **Usage Data** — Product Interaction (for analytics)
- **Diagnostics** — Crash Data, Performance Data (for Sentry-type tools)

The "Used to Track You" toggle requires the App Tracking Transparency (ATT) prompt — see `gdpr-mobile-compliance` skill. Be conservative: if in doubt about whether something is "tracking" per Apple's definition, declare it and prompt.

## App Tracking Transparency

If you collect any identifier that could be used to track the user across apps/websites (most analytics SDKs, advertising IDs), you MUST:
1. Show the ATT prompt before collecting
2. Use the exact iOS system prompt
3. Customize the explanation string in `Info.plist`:

```xml
<key>NSUserTrackingUsageDescription</key>
<string>We use this to understand how visitors use the app so we can improve recommendations for flower fields and routes.</string>
```

Implement via `@capacitor-community/app-tracking-transparency` or similar. Without ATT, your app gets rejected under guideline 5.1.2.

## The review guidelines that trip up hybrid apps

### 4.2 Minimum Functionality
"Your app should include features, content, and UI that elevate it beyond a repackaged website."

For Capacitor apps, reviewers check:
- Does the app have native features (push, camera, location, offline)?
- Is the UI tailored for mobile, or does it look like a desktop site shrunk down?
- Are there iOS-specific UI patterns (safe areas, native nav, haptics)?

**Hybrid apps that look like websites get rejected.** The skills `capacitor-mobile` and `capacitor-performance` cover making the app feel native.

### 4.3 Spam
Includes "Apps that are simply web clippings... or do not provide native iOS functionality."

If your app is just `WebView(yoursite.com)` with no native features, expect rejection. Capacitor with location, push, offline, and camera passes; pure URL-wrappers fail.

### 5.1.1 Data Collection and Storage
- Privacy policy URL required, even for simple apps
- All permission strings must explain WHY you need them (not "We need your location" but "TulipDay uses your location to show nearby flower fields and calculate walking routes")
- Permissions must be requested at point of use, not at launch

### 5.1.5 Location Services
If the app uses background location: you need a specific use case, declare it, and the review will be stricter. For a tourist app, foreground-only is usually fine — request "When In Use" not "Always".

### 4.5.4 Push Notifications
Push must be optional and have a clear opt-out. Don't request push permission at launch — request when contextually relevant ("Get notified when tulips bloom near your favorites?").

## Submitting for review

1. Build uploaded and processed in App Store Connect
2. Version metadata complete
3. Privacy details complete
4. Screenshots uploaded
5. Submit for review

Review time as of 2026: typically 24-48 hours for new apps, often under 24 for updates. Holiday seasons (Dec, Chinese New Year) are slower.

## Handling rejections

If rejected, you get a message in App Store Connect with the guideline cited. Common rejections for hybrid apps:

| Code | Issue | Fix |
|------|-------|-----|
| 2.1 | App crashes or has bugs | Run on real device, check crash logs |
| 2.3.10 | Misleading metadata (screenshots show features that aren't there) | Update screenshots OR add the features |
| 4.0 | Design issues | Usually safe areas, mobile-tailored UI |
| 4.3 | Spam / repackaged web | Add native features, mobile-first UI |
| 5.1.1 | Missing or inadequate privacy policy | Update policy, ensure all data uses disclosed |
| 5.1.2 | Tracking without ATT | Implement ATT prompt |

**You can reply to the reviewer** in App Store Connect. Be polite, explain what changed, provide a video if helpful. Reviewers are humans and often reasonable.

If you disagree with a rejection: use the "Request a Call" or "Submit Resolution Center reply" features. App Review Board exists for formal appeals but is slow.

## TestFlight for beta testing

Before submitting to production:
1. Upload build to App Store Connect (same as production submission)
2. After processing, go to TestFlight tab
3. Add Internal Testers (your team, up to 100, no review needed)
4. Add External Testers (up to 10,000, requires brief Apple review of the build, usually <24h)
5. External Testers get invited via email or public link

External TestFlight links are shareable and a great pre-launch tool: `https://testflight.apple.com/join/XXXXXXXX`.

Test builds expire after 90 days. Production builds don't.

## Versioning strategy

- **Version** (e.g. 1.2.0): user-visible, semantic versioning
- **Build** (e.g. 145): internal, must increment with every upload to App Store Connect

Capacitor sets these in `ios/App/App/Info.plist` (`CFBundleShortVersionString` and `CFBundleVersion`). For CI, automate the bump.

## Localization

For a Dutch app:
- App Store listing in Dutch (primary)
- Optional: add English (US) listing for tourists searching in English
- Permission strings in both languages
- The app itself: only Dutch is required, but English helps tourist discovery

In App Store Connect, add the English (US) localization, translate the description and keywords. Apple's review may happen by a non-Dutch reviewer — having English metadata helps.

## Pre-submission checklist

- [ ] App icon 1024×1024, no alpha, in App Store Connect
- [ ] Screenshots for all required device sizes
- [ ] App description, keywords, support URL filled
- [ ] Privacy nutrition label completed honestly
- [ ] Privacy policy URL working
- [ ] All `Info.plist` permission strings present and clear
- [ ] ATT prompt implemented if tracking
- [ ] App tested on real device in Release config
- [ ] No HTTP URLs (or ATS exceptions declared)
- [ ] Universal links AASA file deployed (if applicable)
- [ ] Push notifications work end-to-end (if applicable)
- [ ] Sign in with Apple implemented (if any social login offered)
- [ ] Account deletion functionality in-app (required since 2022)
- [ ] Build number incremented from last upload
