---
name: mobile-analytics-crash
description: Use this skill when adding analytics, crash reporting, or error monitoring to a Capacitor-based mobile app. Covers Sentry for crash reporting and performance monitoring (including dSYM upload for iOS and ProGuard mapping for Android), PostHog or Mixpanel for product analytics, consent-aware initialization that respects AVG/GDPR, distinguishing crashes that happen in the WebView (JavaScript errors) from native crashes (iOS or Android shell crashes), source map upload for readable stack traces, session replay considerations, and the privacy implications of analytics in EU markets. Trigger whenever the user mentions Sentry, crash reporting, error monitoring, analytics, PostHog, Mixpanel, Firebase Analytics, dSYM, source maps, user tracking, or "why did the app crash for that user".
---

# Mobile Analytics and Crash Reporting

For a hybrid Capacitor app, observability is harder than for a pure web app because crashes can happen in three layers:

1. **JavaScript layer** (your Next.js/React code in the WebView) — most common, usually recoverable
2. **WebView layer** (the WKWebView on iOS or WebView on Android itself crashing) — rare but catastrophic
3. **Native shell layer** (the Capacitor app code or a native plugin crashing) — kills the app entirely, no JS error handler can catch it

A web-only Sentry setup catches layer 1 but misses layers 2 and 3. For real production observability you need both the JS SDK and the native SDK reporting to the same project.

## Choosing tools

**Crash reporting**: Sentry is the strongest choice for Capacitor because it has first-class web + iOS + Android SDKs that share a project, plus an official Capacitor plugin (`@sentry/capacitor`) that wires both sides together. Alternatives: Bugsnag (similar feature set, less Capacitor docs), Firebase Crashlytics (excellent for native crashes but no JS support — bad fit for a hybrid app where most crashes are JS-side).

**Product analytics**: PostHog or Mixpanel both work well. PostHog has the advantage of being self-hostable (better for AVG compliance if you don't want US data transfers) and includes session replay + feature flags + experiments in one product. Mixpanel is more polished for funnels and retention specifically. Avoid Firebase Analytics if EU compliance matters — its data flows to Google in the US with limited controls.

**Recommendation for a Dutch/EU app like TulipDay**: Sentry (EU region) + PostHog EU Cloud or self-hosted. Both can be configured to keep data in Frankfurt.

## Sentry setup for Capacitor

Install both the JS SDK and the Capacitor wrapper:

```bash
npm install @sentry/capacitor @sentry/react
npx cap sync
```

Initialize early, before any other code in the app shell:

```typescript
// app/sentry.client.ts
import * as Sentry from "@sentry/capacitor";
import * as SentryReact from "@sentry/react";

Sentry.init(
  {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN!,
    // EU region — set in Sentry project settings, DSN reflects this
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? "production",
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    dist: process.env.NEXT_PUBLIC_BUILD_NUMBER,
    tracesSampleRate: 0.1, // 10% for performance traces
    // CRITICAL: do not enable until consent is granted (see below)
    enabled: false,
    integrations: [
      SentryReact.browserTracingIntegration(),
      // Session replay is GREAT for debugging but a CONSENT MINEFIELD
      // Only enable behind explicit opt-in, and configure heavy masking
      // SentryReact.replayIntegration({
      //   maskAllText: true,
      //   blockAllMedia: true,
      // }),
    ],
  },
  SentryReact.init,
);

export function enableSentry() {
  Sentry.getCurrentHub().getClient()?.getOptions().enabled = true;
}
```

The `release` and `dist` fields are essential for source map and dSYM matching. Use the Capacitor version number for `release` and the build number for `dist`:

- iOS: `CFBundleShortVersionString` (release) and `CFBundleVersion` (dist)
- Android: `versionName` (release) and `versionCode` (dist)

## Source maps (for readable JS stack traces)

Without source maps, every JS error in production looks like `main.a8f2.js:1:43221`. With source maps, you see your actual source file and line.

For a Next.js build wrapped by Capacitor, configure source map upload via the Sentry Webpack plugin in `next.config.js`:

```javascript
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = { /* your config */ };

module.exports = withSentryConfig(nextConfig, {
  org: "your-org",
  project: "tulipday-mobile",
  authToken: process.env.SENTRY_AUTH_TOKEN, // CI only, never commit
  release: { name: process.env.NEXT_PUBLIC_APP_VERSION },
  sourcemaps: {
    deleteSourcemapsAfterUpload: true, // never ship source maps in the bundle
  },
});
```

After `npm run build:mobile`, the maps are uploaded but stripped from disk before `cap sync` copies the build into `ios/` and `android/`. This means production users get small bundles and Sentry still has the maps server-side.

## dSYM upload (for readable iOS native stack traces)

iOS native crashes produce stack traces with hex addresses unless you upload dSYM files (debug symbols) to Sentry. Without dSYMs, you see `0x10042bea4` instead of `MyPlugin.swift:42`.

Two options:

**Option 1: Sentry Fastlane plugin (recommended)** — integrates with CI. See the `mobile-cicd-fastlane` skill.

**Option 2: Manual upload** after each Xcode archive:

```bash
# From the project root after archiving
sentry-cli upload-dif \
  --org your-org \
  --project tulipday-mobile \
  ~/Library/Developer/Xcode/Archives/<date>/<archive>.xcarchive/dSYMs/
```

Run this every time you upload a build to TestFlight. The Sentry CLI deduplicates so re-running is safe.

## ProGuard mapping upload (for readable Android native stack traces)

If you enable R8/ProGuard for the Android build (recommended for size), native crash traces are obfuscated. Upload the mapping file after each release build:

```bash
sentry-cli upload-proguard \
  --org your-org \
  --project tulipday-mobile \
  --android-manifest android/app/build/intermediates/merged_manifests/release/AndroidManifest.xml \
  android/app/build/outputs/mapping/release/mapping.txt
```

## Tagging crashes with WebView vs native context

Add a Sentry tag so you can filter by layer in the dashboard:

```typescript
import { Capacitor } from "@capacitor/core";

Sentry.setTag("platform.native", Capacitor.isNativePlatform());
Sentry.setTag("platform.os", Capacitor.getPlatform()); // ios | android | web
Sentry.setContext("webview", {
  userAgent: navigator.userAgent,
});
```

This is invaluable when an issue affects only iOS WKWebView 18.2 users (real example — these things happen).

## Consent-aware initialization (AVG required)

Under AVG and the ePrivacy directive, analytics and non-essential crash reporting require **prior explicit consent** for EU users. You cannot initialize Sentry or PostHog with full tracking until the user has accepted.

```typescript
// Initialize with enabled: false (see snippet above)
// Then after consent banner accept:

import { enableSentry } from "./sentry.client";
import posthog from "posthog-js";

export function applyConsent(consent: ConsentState) {
  if (consent.crashReporting) {
    enableSentry();
  }
  if (consent.analytics) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "https://eu.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false, // do manual page tracking with consent-aware routing
      disable_session_recording: !consent.sessionReplay,
    });
  }
}
```

For the **crash-reporting-only-no-PII** case, some legal interpretations allow this under legitimate interest without explicit consent, **but only if**:
- No IP addresses are stored (Sentry: set `sendDefaultPii: false`)
- No user identifiers attached (`Sentry.setUser(null)`)
- No breadcrumbs containing PII
- Documented in your privacy policy

Most EU lawyers treat this as a gray zone. The safe default is: require consent for any third-party telemetry. See the `gdpr-mobile-compliance` skill.

## PostHog for product analytics

```typescript
import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "https://eu.i.posthog.com", // EU region
  person_profiles: "identified_only",
  autocapture: false, // be explicit about what you track
  capture_pageview: false,
});

// Track key events explicitly
posthog.capture("field_swiped", {
  field_id: fieldId,
  direction: "right",
  bloom_status: status,
});
```

For TulipDay specifically, useful events to track (with consent):
- `field_viewed`, `field_swiped`, `field_saved`
- `route_started`, `route_completed`
- `filter_applied` (which filters drive engagement)
- `bloom_status_checked` (validates the core feature value)

Avoid PII in event properties. Use a PostHog `distinct_id` based on a randomly generated install ID, not the user's email.

## Distinguishing JS errors from native crashes in practice

In the Sentry dashboard, you'll see two categories of issues:

| Layer | How it appears in Sentry | Example |
|-------|-------------------------|---------|
| JavaScript | `TypeError`, `ReferenceError`, with JS stack trace | `Cannot read property 'fields' of undefined` |
| Native iOS | `EXC_BAD_ACCESS`, `SIGSEGV`, with Swift/ObjC stack | Plugin crashed accessing CoreLocation |
| Native Android | `NullPointerException`, `OutOfMemoryError`, with Java/Kotlin stack | Plugin crashed in CameraX |

JS errors are the bulk for hybrid apps. Native crashes are rarer but more severe — they kill the app with no chance of graceful recovery.

## Performance monitoring

Sentry's performance monitoring works in Capacitor but be aware of two things:

1. **Sample rate matters for cost** — `tracesSampleRate: 0.1` (10%) is the typical starting point. At 1.0 you'll burn through the quota fast on a popular app.
2. **WebView startup is the metric that matters** — track time from `appstart` (native) to first contentful paint (JS). The Sentry Capacitor plugin auto-instruments this.

## Common pitfalls

**Pitfall 1: Forgetting to upload dSYMs.** First TestFlight crash report comes in, the trace is unreadable, you upload dSYMs retroactively, but the existing reports stay broken. Always upload during CI, every build.

**Pitfall 2: Shipping source maps in the bundle.** This leaks your source code to anyone who unpacks the IPA/AAB. The `deleteSourcemapsAfterUpload: true` setting prevents this.

**Pitfall 3: Initializing analytics before consent.** Any AVG audit catches this immediately. Always gate behind explicit consent.

**Pitfall 4: Using Firebase Analytics in an EU-targeted app.** The data goes to Google US, you need a data transfer impact assessment, and the AP has flagged this configuration in past investigations. Use PostHog EU or self-host.

**Pitfall 5: Session replay without heavy masking.** Replay records what the user sees, which on a tourist app might include real names in their saved trips, payment details, etc. If you enable replay, set `maskAllText: true` and `blockAllMedia: true` as baseline.

## Quick checklist before launch

- [ ] Sentry initialized for JS, iOS native, and Android native
- [ ] Source maps upload configured in CI
- [ ] dSYMs upload configured in CI (or manual after each archive)
- [ ] ProGuard mapping upload configured in CI
- [ ] All telemetry gated behind consent
- [ ] Sentry region set to EU (project settings) for Dutch users
- [ ] PostHog (or chosen analytics) on EU endpoint
- [ ] Privacy policy lists Sentry and PostHog as subprocessors with DPA links
- [ ] Test crash button hidden behind dev flag (don't ship it)
- [ ] Native crash tested by deliberately triggering one (e.g., force-cast in a plugin)
