---
name: capacitor-performance
description: Use this skill when optimizing the performance of a Capacitor-based mobile app, especially Next.js or React apps wrapped via Capacitor. Covers WebView startup time, bundle size optimization for hybrid apps, image and asset optimization for mobile, lazy loading strategies, memory management in WKWebView and Android WebView, smooth scrolling and 60fps animations in WebViews, and the specific tradeoffs of running a web bundle inside a native shell. Trigger whenever the user mentions slow startup, janky scrolling, large bundle sizes, slow image loading, or generally "the app feels weby/slow" in a Capacitor context.
---

# Capacitor Performance Optimization

Hybrid apps have a performance ceiling that you hit fast if you treat them like a website. The WebView is more constrained than mobile Safari/Chrome: less aggressive caching, no shared service workers across origins, and a hard memory budget that the OS will kill you for exceeding.

## The startup budget

Cold start target: **under 2 seconds to interactive**. Above 3 seconds, users notice. Above 5 seconds, App Store reviewers may flag it.

The cold-start sequence:
1. OS launches native shell (~200-400ms, mostly fixed)
2. WebView initializes (~150-300ms)
3. HTML/CSS/JS load from bundled assets (~100-500ms depending on bundle size)
4. JS executes, framework hydrates (~200-1500ms — this is where you have leverage)
5. First meaningful paint
6. App ready → hide splash screen

You control steps 3-5. Focus there.

## Bundle size targets

For Capacitor + Next.js, target these initial JS bundle sizes (gzipped):
- **Excellent**: under 150 KB
- **Acceptable**: 150-300 KB
- **Concerning**: 300-500 KB
- **Bad**: over 500 KB

Use `@next/bundle-analyzer` to see what's heavy:

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
module.exports = withBundleAnalyzer({
  output: 'export',
  // ...
});
```

Run with `ANALYZE=true npm run build`.

## Common bundle bloat sources

1. **Moment.js** → replace with `date-fns` (tree-shakable) or `dayjs` (2KB)
2. **Lodash full import** → use `lodash-es` with named imports, or just write the helper yourself
3. **Icon libraries imported wholesale** → use per-icon imports: `import { Heart } from 'lucide-react'` not `import * as Icons`
4. **Multiple chart libraries** → pick one (recharts OR chart.js OR d3, not multiple)
5. **Polyfills you don't need** → modern WebViews support ES2020+, drop legacy polyfills
6. **Source maps in production bundle** → keep them external, not inline

## Code splitting strategy

In Next.js 14 with static export, use dynamic imports for routes/features that aren't on the critical path:

```typescript
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const PhotoGallery = dynamic(() => import('@/components/PhotoGallery'), {
  ssr: false,
});
```

Rule of thumb: anything not visible in the first viewport on first launch → dynamic import.

## Image optimization for mobile

Next.js `<Image>` doesn't work the same in static export — the optimizer needs a server. For Capacitor:

**Option A: Pre-optimize at build time**
- Use `next-export-optimize-images` or similar
- Generates WebP/AVIF variants during `next build`
- Embeds them in the bundle

**Option B: Use a CDN with on-demand resizing**
- Cloudinary, imgix, Vercel Image Optimization API (with `loader` config)
- Loads faster after first visit (cached) but needs network

For TulipDay-style apps with lots of field/flower photos: **Option B with aggressive cache headers** is best. Network is fine for tourists in cities; offline is for the field itself.

Image best practices in WebView:
- Always specify `width` and `height` (prevents layout shift, which is expensive in WebView)
- Use `loading="lazy"` for below-fold images
- Use `decoding="async"`
- WebP everywhere, AVIF where supported (iOS 16+, Android 12+ Chrome WebView)
- Maximum 2x device pixel ratio — don't ship 3x or 4x assets, the file size cost outweighs the quality gain on phone screens

## Memory management

WebViews get killed by the OS more aggressively than native apps. Symptoms: app reloads when user returns from background, blank screen, or crashes.

Watch for:
- **Memory leaks from event listeners** — always cleanup in `useEffect` returns
- **Large images held in memory** — release `URL.createObjectURL()` with `URL.revokeObjectURL()`
- **Long lists without virtualization** — use `react-virtuoso` or `@tanstack/react-virtual` for any list over 50 items
- **Cached fetch responses growing unbounded** — set TTLs on your cache layer

Monitor in development:
- iOS Safari Inspector → Memory tab while running on simulator
- Chrome DevTools → Memory tab via `chrome://inspect`

## Scroll performance

Janky scroll is the most common "feels weby" complaint. Fixes:

```css
/* Use these on scrollable containers */
.scroll-container {
  -webkit-overflow-scrolling: touch; /* iOS momentum scroll */
  overscroll-behavior: contain; /* prevent body scroll chaining */
  will-change: scroll-position; /* hint to compositor */
}

/* Avoid box-shadow on scrolling cards — repaints are expensive */
/* Use filter: drop-shadow() OR a static below-card pseudo element instead */

/* Use transform/opacity for animations, never top/left/width/height */
.card-enter {
  transform: translateY(0);
  opacity: 1;
  transition: transform 200ms, opacity 200ms;
}
```

For swipe interactions (like TulipDay's swipe cards): use `framer-motion` or `react-spring`, both of which use `transform` and `requestAnimationFrame` correctly. Don't roll your own swipe physics — getting it to feel native takes weeks.

## 60fps animation budget

You have 16.6ms per frame. In a WebView with a moderately busy app, realistically you have ~8-10ms for your animation work. Tools:

- **Chrome DevTools Performance tab** (via `chrome://inspect`) — record while interacting, look for long tasks
- **Safari Web Inspector Timelines** — same for iOS

Red flags:
- Layout/style recalc taking >5ms per frame
- JS execution >8ms per frame during animation
- Composite layers exceeding 50 (each is GPU memory)

## Font loading

Custom fonts are a startup-time killer if not handled right:

```css
@font-face {
  font-family: 'YourFont';
  src: url('/fonts/yourfont.woff2') format('woff2');
  font-display: swap; /* show fallback immediately */
  font-weight: 400;
}
```

For Capacitor specifically, bundle fonts as static assets — don't load from Google Fonts (extra network round trip, fails offline).

Use `<link rel="preload" as="font" type="font/woff2" crossorigin>` for fonts used above the fold.

## Native plugin call performance

Bridge calls are slow (1-5ms each, sometimes more on Android). Batch where possible:

```typescript
// Bad: 100 bridge calls
for (const item of items) {
  await Preferences.set({ key: item.id, value: item.data });
}

// Good: 1 bridge call
await Preferences.set({ key: 'all-items', value: JSON.stringify(items) });
```

For large data, use `@capacitor/filesystem` (one big file) over `@capacitor/preferences` (many small keys).

## Service worker caveat

Capacitor apps can use service workers, but with caveats:
- iOS WKWebView has limited support and frequent quirks
- Capacitor's localhost origin makes some patterns weird
- For offline support, prefer Capacitor's filesystem + a custom cache layer over service workers
- See the `mobile-offline-sync` skill for the recommended approach

## Measuring real-world performance

Don't rely on localhost — measure on actual devices:

1. **iOS**: Run via Xcode Release config, attach Instruments (Time Profiler, Energy Log)
2. **Android**: Build release APK, use Android Studio Profiler or `adb shell dumpsys gfxinfo`
3. **Real User Monitoring**: Sentry Performance, PostHog, or custom logging via web vitals

Track these metrics in production:
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- App cold start time (custom — from native launch to JS ready)

## Capacitor-specific config for performance

In `capacitor.config.ts`:

```typescript
{
  webDir: 'out', // or 'dist'
  ios: {
    scrollEnabled: true,
    backgroundColor: '#ffffff', // matches splash for no flash
    preferredContentMode: 'mobile',
    handleApplicationNotifications: false, // only if you don't need it
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: false, // security + perf
    webContentsDebuggingEnabled: false, // false in production!
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // hide ASAP after JS ready
      backgroundColor: '#E8102A',
    },
  },
}
```

## Checklist for shipping a fast Capacitor app

- [ ] Initial JS bundle < 300KB gzipped
- [ ] Hero images preloaded, others lazy
- [ ] Custom fonts subset and preloaded
- [ ] Long lists virtualized
- [ ] Splash screen hidden only when app is interactive
- [ ] Animations use transform/opacity
- [ ] No HTTP calls during cold start (use cached/bundled data)
- [ ] Service worker or filesystem cache for offline-first feel
- [ ] Tested on a 3-year-old Android device, not just iPhone simulator
