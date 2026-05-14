---
name: mobile-deeplinks
description: Use this skill when implementing deep links, universal links (iOS), or app links (Android) in a Capacitor or hybrid mobile app. Covers AASA (apple-app-site-association) files, Android assetlinks.json, custom URL schemes, the @capacitor/app plugin for handling incoming URLs, routing deep links into Next.js or React Router, and fallback web behavior. Trigger whenever the user mentions deep linking, universal links, app links, "open from web in app", shareable URLs, marketing campaign attribution, or QR codes that open the app.
---

# Deep Links and Universal Links

For tourist apps especially, deep links are critical: someone shares a flower field URL on WhatsApp, the recipient should land directly in the app on that field, not in a browser. This is one of the highest-impact features for engagement.

## The three link types

1. **Custom URL scheme** (`tulipday://`) — works from anywhere but no fallback, looks unprofessional
2. **iOS Universal Links** (`https://tulipday.nl/...`) — opens app if installed, falls back to web
3. **Android App Links** (`https://tulipday.nl/...`) — same idea, Android equivalent

**Always implement universal/app links.** Custom schemes are a legacy fallback at best.

## How universal links work

User taps `https://tulipday.nl/locations/keukenhof-tulip-field-3`:

- iOS: checks if any installed app claims the `tulipday.nl` domain via AASA → opens app and passes URL
- Android: checks `assetlinks.json` for the domain → opens app or shows chooser

If app not installed → opens in browser → your web app shows the same content (or a "Get the app" prompt).

This requires three things to align:
1. Server: hosts a verification file at a specific URL
2. App: declares it can handle the domain
3. Code: handles incoming URLs at runtime

## iOS setup: apple-app-site-association

Host at **both** `https://tulipday.nl/.well-known/apple-app-site-association` and `https://tulipday.nl/apple-app-site-association`. Must be served as `application/json` (no `.json` extension) over HTTPS with a valid cert.

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["TEAM_ID.com.floww.tulipday"],
        "components": [
          {
            "/": "/locations/*",
            "comment": "Matches location detail pages"
          },
          {
            "/": "/routes/*"
          },
          {
            "/": "/share/*"
          }
        ]
      }
    ]
  }
}
```

Find your `TEAM_ID` in Apple Developer portal → Membership.

Critical gotchas:
- **No redirects** on the AASA URL. iOS rejects redirects, even HTTPS-to-HTTPS.
- **No `Content-Type: text/html`** — must be `application/json` (or `application/pkcs7-mime` for signed versions).
- **File must be under 128KB**.
- **Apple's CDN caches aggressively**. After publishing, validation can take hours.

Test the file:
```bash
curl -v https://tulipday.nl/.well-known/apple-app-site-association
# Should return 200, Content-Type: application/json
```

Use Apple's [AASA Validator](https://branch.io/resources/aasa-validator/) (third-party but reliable).

## Xcode setup for iOS

In Xcode → Signing & Capabilities → add **Associated Domains** capability → add:
```
applinks:tulipday.nl
applinks:www.tulipday.nl
```

For development testing without the AASA file (e.g., on staging):
```
applinks:staging.tulipday.nl?mode=developer
```

Then in Settings → Developer → Universal Links → enable for your app.

## Android setup: assetlinks.json

Host at `https://tulipday.nl/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.floww.tulipday",
    "sha256_cert_fingerprints": [
      "AB:CD:EF:..."
    ]
  }
}]
```

Get the SHA-256 fingerprint of your signing certificate:
```bash
# For your release keystore
keytool -list -v -keystore your-release-key.keystore -alias your-alias

# For Play App Signing (recommended) — get it from Play Console:
# Setup → App integrity → App signing key certificate
```

**Include all fingerprints**: upload key, Play App Signing key, and debug key if you want links to work in debug builds.

## AndroidManifest setup

In `android/app/src/main/AndroidManifest.xml`, in your main activity:

```xml
<activity ...>
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" />
    <data android:scheme="http" />
    <data android:host="tulipday.nl" />
    <data android:host="www.tulipday.nl" />
  </intent-filter>
</activity>
```

`autoVerify="true"` is what triggers the assetlinks.json check. Without it, links open in a chooser instead of going directly to your app.

Verify after install:
```bash
adb shell pm get-app-links com.floww.tulipday
# Should show "verified" for your domain
```

## Capacitor config

In `capacitor.config.ts`:
```typescript
{
  appId: 'com.floww.tulipday',
  appName: 'TulipDay',
  ios: {
    scheme: 'tulipday', // for the custom scheme fallback
  },
  android: {
    intentFilters: [
      // Capacitor 6+ supports declaring filters here
      // but Manifest is still the source of truth
    ],
  },
}
```

## Runtime handling

Use `@capacitor/app` to listen for incoming URLs:

```typescript
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { useRouter } from 'next/router'; // or wherever your router lives

// In a top-level component or app init
useEffect(() => {
  const handler = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    const url = new URL(event.url);

    // Strip the origin, get the path
    const path = url.pathname + url.search;

    // Route into your app
    router.push(path);
  });

  // Also check launch URL (app cold-started via link)
  App.getLaunchUrl().then(result => {
    if (result?.url) {
      const url = new URL(result.url);
      router.push(url.pathname + url.search);
    }
  });

  return () => { handler.then(h => h.remove()); };
}, []);
```

In Next.js with static export, you don't have file-based routing in the traditional sense. Use the router's `push` to navigate to the right page, with the path matching your route structure.

## URL design

Design URLs that work as both web URLs and deep link targets:

```
https://tulipday.nl/                           → home
https://tulipday.nl/locations/[slug]           → location detail
https://tulipday.nl/routes/[slug]              → route detail
https://tulipday.nl/villages/[slug]            → village page
https://tulipday.nl/share/route/[token]        → shareable user route
```

Use slugs, not numeric IDs, for shareability and SEO.

## Web fallback

When the user doesn't have the app and taps a link:
- Browser opens the URL
- Your web app loads the same route
- Show a "Get the app" smart banner

For iOS, use Apple's Smart App Banner meta tag (only works in mobile Safari):
```html
<meta name="apple-itunes-app" content="app-id=123456789, app-argument=https://tulipday.nl/locations/keukenhof">
```

For broader support, build your own banner that detects mobile UA and shows install prompts.

## QR codes

For physical signage in the Bollenstreek (info boards at villages, posters at Keukenhof), QR codes pointing to universal link URLs work perfectly:
- QR encodes `https://tulipday.nl/locations/keukenhof-field-3`
- User scans with camera app
- iOS/Android open in app if installed, browser otherwise

Use a QR generator that adds error correction (level Q or H) so weather-damaged signs still scan.

## Attribution and analytics

To track which link a user came from, append UTM params to your links:
```
https://tulipday.nl/locations/keukenhof?utm_source=qr&utm_medium=poster&utm_campaign=keukenhof-2026
```

Capture these in the `appUrlOpen` handler and send to your analytics. See `mobile-analytics-crash` skill.

## Testing checklist

- [ ] AASA file returns 200, correct content-type, no redirects
- [ ] assetlinks.json returns 200, correct fingerprints
- [ ] Test cold start: kill app, tap link, app opens to right screen
- [ ] Test warm start: app in background, tap link, app comes to foreground at right screen
- [ ] Test in messaging apps (WhatsApp, iMessage, Telegram) — some strip universal links
- [ ] Test in Notes app (iOS) — known to bypass universal links
- [ ] Test QR scan from camera app on both platforms
- [ ] Test fallback when app not installed
- [ ] Verify `pm get-app-links` shows "verified" on Android

## Common pitfalls

1. **AASA cached by Apple** — changes can take 24+ hours to propagate. Force refresh by deleting and reinstalling the app.
2. **Universal links broken after redirect** — your domain MUST serve the AASA directly, no redirect from `www` to apex or vice versa for that path.
3. **Debug builds don't verify** — Android requires signed builds with the fingerprint in assetlinks.json to auto-verify.
4. **WhatsApp opens in WebView** — long-press the link and choose "Open in browser" to test, or use a deep linking service like Branch/AppsFlyer to handle these cases.
5. **Next.js router not ready** — the `appUrlOpen` listener may fire before the router is mounted. Queue the URL and process when router is ready.
