---
name: capacitor-mobile
description: Use this skill whenever working with Capacitor-based mobile apps, especially Next.js or React apps wrapped via @capacitor/ios or @capacitor/android. Covers the native bridge, WebView quirks (iOS WKWebView and Android WebView), platform-specific code paths, Capacitor plugin development and consumption, safe-area handling, the cap sync workflow, and debugging native shells from Xcode and Android Studio. Trigger whenever the user mentions Capacitor, capacitor.config.ts, cap sync, cap run, WebView behavior, native plugins, Capacitor 6/7/8, or hybrid mobile development with Next.js or React.
---

# Capacitor Mobile Development

This skill covers building production-quality mobile apps with Capacitor (v6, v7, v8) where the UI is a Next.js or React web app running inside a native WebView shell. The goal is to make the app feel native despite the hybrid architecture.

## Core mental model

Capacitor has two halves that you must keep in mind constantly:

1. **The web layer** — your Next.js/React code, running in WKWebView (iOS) or Android WebView. This is what users see.
2. **The native layer** — Swift/Kotlin code in the `ios/` and `android/` folders, exposing native APIs (camera, geolocation, push, filesystem) via the Capacitor bridge.

The bridge is async. Every call from web to native is a Promise. Every call from native to web is an event listener. There is no synchronous native API access. Designs that assume sync access (e.g. reading filesystem during render) will break.

## The cap sync workflow

The build pipeline is fixed and breaks subtly if steps are skipped:

```
next build (with output: 'export' or static export)
  → static files in out/ or dist/
  → cap sync copies them into ios/App/App/public and android/app/src/main/assets/public
  → cap copy is faster but only copies web assets, not native plugin changes
  → cap update updates native dependencies (Pods, Gradle)
```

After ANY plugin install (`npm install @capacitor/camera`), you MUST run `npx cap sync` — `cap copy` is not enough because plugins need native registration. After only web changes, `cap copy` suffices and is much faster.

For Next.js specifically: `next build` alone is not enough. You need `output: 'export'` in `next.config.js` for Capacitor, or a static export adapter. Server components and API routes don't work inside the WebView shell — they need to point to a remote backend.

## Platform detection and conditional code

Use Capacitor's platform detection, never UA sniffing:

```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  // iOS or Android native shell
}
if (Capacitor.getPlatform() === 'ios') { /* ... */ }
if (Capacitor.getPlatform() === 'android') { /* ... */ }
if (Capacitor.getPlatform() === 'web') { /* PWA / dev */ }
```

For Next.js dev workflow, the same code runs in browser during `next dev` — guard native plugin calls with `isNativePlatform()` or you'll get "plugin not implemented on web" errors.

## Safe-area handling (iOS notch, Android cutouts)

This is the single biggest "looks weby" giveaway. Always use safe-area insets:

```css
/* In your global CSS */
:root {
  --safe-area-inset-top: env(safe-area-inset-top);
  --safe-area-inset-bottom: env(safe-area-inset-bottom);
  --safe-area-inset-left: env(safe-area-inset-left);
  --safe-area-inset-right: env(safe-area-inset-right);
}

.app-header {
  padding-top: calc(1rem + var(--safe-area-inset-top));
}
.bottom-nav {
  padding-bottom: calc(0.5rem + var(--safe-area-inset-bottom));
}
```

In `capacitor.config.ts`, you also need:
```typescript
ios: {
  contentInset: 'always', // or 'never' if you handle insets manually in CSS
},
```

For Android edge-to-edge (required for Android 15+), enable in `android/app/src/main/res/values/styles.xml` and handle insets in CSS.

## Status bar and splash screen

Two plugins you almost certainly need: `@capacitor/status-bar` and `@capacitor/splash-screen`.

```typescript
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

// Match status bar to your app theme
await StatusBar.setStyle({ style: Style.Dark }); // dark icons on light bg
await StatusBar.setBackgroundColor({ color: '#E8102A' }); // Android only

// Hide splash after app is ready (not on first paint!)
await SplashScreen.hide({ fadeOutDuration: 300 });
```

Splash screen config in `capacitor.config.ts`:
```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    launchAutoHide: false, // hide manually after app ready
    backgroundColor: '#E8102A',
    androidSplashResourceName: 'splash',
    showSpinner: false,
  },
}
```

Generate splash assets with `@capacitor/assets` — never hand-create the dozen-plus sizes.

## Keyboard handling

The WebView keyboard behavior differs from native and from web. Install `@capacitor/keyboard`:

```typescript
import { Keyboard } from '@capacitor/keyboard';

Keyboard.addListener('keyboardWillShow', (info) => {
  document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
});
Keyboard.addListener('keyboardWillHide', () => {
  document.body.style.setProperty('--keyboard-height', '0px');
});
```

iOS specific: set `KeyboardResize.Native` in config to avoid the WebView shrinking weirdly when keyboard opens.

## Back button (Android)

Android hardware back is a frequent miss. Without handling, it kills the app:

```typescript
import { App } from '@capacitor/app';

App.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) {
    window.history.back();
  } else {
    App.exitApp(); // or show confirm dialog
  }
});
```

In Next.js, integrate with the router so back triggers `router.back()`.

## Live reload during development

`npx cap run ios -l --external` runs your Next.js dev server and points the WebView at it. This is the fastest dev loop. For Next.js, ensure `next dev` binds to `0.0.0.0` not just localhost, and that your firewall allows the iOS simulator/device to reach it.

Add to `capacitor.config.ts` only during dev:
```typescript
server: {
  url: 'http://192.168.1.x:3000', // your dev machine IP
  cleartext: true, // Android needs this for HTTP
}
```

**Never ship with `server.url` set** — that points the production app at your dev machine.

## Network and CORS

The WebView loads from `capacitor://localhost` (iOS) or `https://localhost` (Android). API calls to your backend are cross-origin. Configure CORS on your backend to allow these origins:
- `capacitor://localhost`
- `ionic://localhost`
- `https://localhost`

For cookies (Supabase auth), set `credentials: 'include'` on fetch and use `SameSite=None; Secure` on the cookie. iOS WKWebView is stricter than Android here.

## Debugging

- **iOS**: Safari → Develop menu → [device/simulator] → your app's WebView. Full Web Inspector access.
- **Android**: `chrome://inspect` in desktop Chrome with USB debugging or emulator running.
- **Native crashes**: Xcode console for iOS, `adb logcat` or Android Studio's Logcat for Android. JS errors usually don't show here — only native crashes.

## Capacitor 8 specifics

If on v8 (current as of 2026), be aware:
- Minimum iOS 14, Android API 23 (Android 6.0)
- Swift 5.1+, Gradle 8+
- Some plugins from the v7 era need updates — check the changelog before bumping
- New `@capacitor/preferences` replaces the old Storage plugin

## Common pitfalls

1. **Forgetting `cap sync` after plugin install** → "plugin not implemented" runtime errors
2. **Server components in Next.js** → don't work; you need static export or remote backend
3. **localStorage assumptions** → works in WebView but isolated per platform; doesn't sync with web app
4. **Hardcoded HTTP URLs** → blocked by ATS on iOS; either use HTTPS or configure `NSAppTransportSecurity`
5. **Permissions not declared** → iOS needs `Info.plist` keys with usage descriptions in NL too if app is NL-only; Android needs `AndroidManifest.xml` entries
6. **Universal Links not working** → see the `mobile-deeplinks` skill, this needs server-side AASA/assetlinks files

## When to consult related skills

- Performance issues, bundle size, startup time → `capacitor-performance`
- Offline support, sync conflicts → `mobile-offline-sync`
- Deep links, universal links → `mobile-deeplinks`
- Store submission → `app-store-submission` / `play-store-submission`
- GDPR/AVG, consent flows → `gdpr-mobile-compliance`
- Automated builds → `mobile-cicd-fastlane`
- Crash reporting, analytics → `mobile-analytics-crash`
