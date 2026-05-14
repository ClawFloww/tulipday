---
name: capacitor-store-assets
description: Use this skill when generating, optimizing, or validating store assets for a Capacitor app — icons, splash screens, screenshots, feature graphics, app previews, and store listing visuals for both Apple App Store and Google Play Store. Covers the @capacitor/assets tool for automated generation from source files, the exact pixel dimensions required for each store and device class, screenshot generation strategies (real-device, simulator-based, design-tool-based), how to make screenshots that actually convert, iPad and tablet variants, Apple's strict 1024×1024 icon rules (no alpha, no rounded corners), Google's adaptive icon system, and dark mode variants. Trigger whenever the user mentions app icon, splash screen, launch screen, screenshots, store assets, feature graphic, app preview video, capacitor-assets, asset generation, or "what sizes do I need for the store".
---

# Capacitor Store Assets

Both Apple and Google reject submissions for asset problems more than for any other technical reason. The rules are precise, the tooling is finicky, and there's no in-IDE preview that warns you if you've got it wrong.

The good news: **a single source-of-truth design** (one icon at 1024×1024, one splash at 2732×2732, plus screenshots) can generate every required size automatically via `@capacitor/assets`.

## The full asset inventory

For a Capacitor app shipping to both stores, you need:

**App icons (generated automatically):**
- iOS: 18 sizes (20pt, 29pt, 40pt, 60pt, 76pt, 83.5pt, 1024pt — each at @1x, @2x, @3x where applicable)
- Android: 5 density buckets (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) × adaptive icon (foreground + background) + legacy icon + Play Store icon at 512×512

**Splash screens (generated automatically):**
- iOS: storyboard-based, single 2732×2732 source recommended
- Android: legacy splash + Android 12+ splash screen API (centered logo + background color)

**Store listing assets (manual or semi-automated):**
- App Store icon: 1024×1024, no alpha, no rounded corners
- App Store screenshots: at least one set per device class (6.5", 5.5" required; 6.7" recommended; iPad 12.9" required if you support iPad)
- App Store app previews (videos): optional, 15-30 seconds, per device class
- Play Store icon: 512×512, with alpha allowed
- Play Store feature graphic: 1024×500
- Play Store screenshots: 2-8 per device type (phone required; tablet if you support it)

## @capacitor/assets workflow

This tool generates all device-specific icons and splashes from source files. Install:

```bash
npm install --save-dev @capacitor/assets
```

Source files go in an `assets/` folder at the project root:

```
assets/
├── icon.png             # 1024×1024, full color, no transparency
├── icon-foreground.png  # 1024×1024, transparent background, content in middle 432×432 area
├── icon-background.png  # 1024×1024, solid color or simple pattern
├── splash.png           # 2732×2732, design content centered in middle 1200×1200 area
└── splash-dark.png      # Same as above but for dark mode
```

Generate:

```bash
npx @capacitor/assets generate --iconBackgroundColor "#E8102A" --iconBackgroundColorDark "#1a0508"
```

For TulipDay specifically: `--iconBackgroundColor "#E8102A"` matches the brand red. The tool writes:
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- `ios/App/App/Assets.xcassets/Splash.imageset/`
- `android/app/src/main/res/mipmap-*/`
- `android/app/src/main/res/drawable*/`

Re-run after every brand change. Commit the generated files (yes, even though they're derived — store builds depend on them).

## App Store icon rules (strict — common rejection cause)

The 1024×1024 marketing icon used in the App Store:

- **No alpha channel.** Must be opaque PNG. Even a single transparent pixel triggers rejection.
- **No rounded corners.** The store rounds them for you. Submit a sharp-cornered square.
- **No drop shadows or glows** extending beyond the icon bounds.
- **Color profile sRGB or P3.** Not CMYK.
- **PNG format**, not JPEG.

Validate before upload:

```bash
# Check for alpha
sips -g hasAlpha icon-1024.png
# Should output: hasAlpha: no

# Check color profile
sips -g profile icon-1024.png
# Should output: sRGB IEC61966-2.1 (or Display P3)
```

If `@capacitor/assets` generates an icon with alpha (some source files keep it), strip it:

```bash
sips -s format png --deleteColorManagement icon-1024.png --out icon-1024-clean.png
# Or in ImageMagick:
magick icon-1024.png -alpha remove -alpha off icon-1024-clean.png
```

## Android adaptive icons (required for API 26+, which is everyone now)

Adaptive icons consist of two layers — a foreground and background — that the system masks into different shapes per OEM (circle on Pixel, squircle on Samsung, etc.).

**Foreground design constraints:**
- Total canvas: 432×432 dp
- Safe zone (content must fit inside): center 264×264 dp
- The outer 84 dp on each side gets masked or parallax-shifted by the launcher

Treat the foreground like a logo on a transparent sticker. Don't put critical content near the edges.

**Background design:**
- Total canvas: 432×432 dp
- Solid color works fine
- Simple gradient or pattern OK
- Avoid detailed imagery — it gets cropped weirdly by some masks

For TulipDay: foreground = white tulip silhouette, background = `#E8102A`. Test in Android Studio's adaptive icon previewer to verify all four mask shapes look correct.

## Splash screens

iOS splash screens are now storyboard-based (the LaunchScreen.storyboard file). `@capacitor/assets` writes a simple storyboard that centers your `splash.png`. For most apps this is enough. Avoid putting text in the splash — it doesn't localize automatically.

Android 12+ uses the new splash screen API. Configuration in `android/app/src/main/res/values/styles.xml`:

```xml
<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
    <item name="windowSplashScreenBackground">@color/splash_background</item>
    <item name="windowSplashScreenAnimatedIcon">@drawable/splash_icon</item>
    <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
</style>
```

The icon shows inside a circular reveal; design accordingly. Older Android versions fall back to the legacy splash drawable.

## Screenshot strategy

This is where most apps under-invest. Store screenshots are the **single biggest conversion factor** for store listing performance — more than the icon, more than the description.

**Three approaches:**

**Approach 1: Real device screenshots, lightly framed.** Quick to produce, looks authentic, but feels generic.

**Approach 2: Simulator screenshots, then composite in Figma/Sketch.** Add a phone frame, a headline, a colored background. This is the standard professional look.

**Approach 3: Fully designed marketing screenshots (no actual screen).** Polished pitch decks. Highest conversion but Apple sometimes rejects these under guideline 2.3.10 ("Screenshots should show your app in use, not merely the title art").

The compliant sweet spot: **real screen content + headline + colored background**. The screen itself must be of the actual app.

**Required device sizes for iOS submission (one set must be provided):**

| Device | Resolution | Required? |
|--------|------------|-----------|
| iPhone 6.7" (15 Pro Max, 14 Pro Max) | 1290×2796 | Recommended |
| iPhone 6.5" (11 Pro Max, XS Max) | 1242×2688 | Required (or 6.7") |
| iPhone 5.5" (8 Plus) | 1242×2208 | Required |
| iPad Pro 12.9" 6th gen | 2048×2732 | Required if iPad supported |
| iPad Pro 12.9" 2nd gen | 2048×2732 | Required if iPad supported |

**Required for Android (Play Store):**
- Phone: 2-8 screenshots, 16:9 or 9:16, min 320px, max 3840px on long side
- 7" tablet: optional, 2-8 screenshots
- 10" tablet: optional, 2-8 screenshots
- TV / Wear OS: only if you target those form factors

## Localized screenshots

If you list the app in Dutch (for TulipDay, mandatory for the Bollenstreek market), provide Dutch screenshot text. The app's actual UI is Dutch, so this is just about the overlay text:

- "Ontdek bloembollenvelden in jouw buurt"
- "Plan je route door de Bollenstreek"
- "Real-time bloei-informatie"

In App Store Connect, screenshots are per-locale. You can have English screenshots for the English locale and Dutch for the `nl` locale.

## App preview videos (optional but high-value)

Apple supports 15-30 second videos that auto-play in the search results. Format:

- iPhone: 1080×1920 or 1920×1080 (portrait or landscape, match your app)
- iPad: 1200×1600 portrait or 1600×1200 landscape
- H.264 or HEVC, max 500 MB
- No music with copyright issues (use Apple's free library or Epidemic Sound)
- First 3 seconds matter most — they're the looping preview before tap

Record on device with screen recording (Control Center → Record), then edit in iMovie or Final Cut. Avoid showing the home indicator or status bar with notifications.

## Feature graphic (Play Store only)

1024×500 banner that displays at the top of your Play Store listing. Make it match your app aesthetic. For TulipDay: red background, tulip imagery, app name in white, optional Dutch tagline.

## Dark mode variants

iOS 13+ and Android 10+ support per-asset dark mode variants. `@capacitor/assets` handles this if you provide `splash-dark.png`. For icons, the App Store icon stays the same (no dark variant exists). Adaptive icon foreground can have a dark variant via `mipmap-night` folders — usually only needed if your foreground reads poorly on a dark wallpaper.

## Validating before submission

Apple Transporter (free Mac app) validates a complete build's assets and flags problems before you upload. Use it for every release.

Manual checklist before submission:

- [ ] 1024×1024 App Store icon has no alpha
- [ ] Adaptive icon foreground keeps critical content inside center 264×264
- [ ] All required device-class screenshots present in App Store Connect
- [ ] All screenshots use actual app UI (not just title art)
- [ ] Dutch screenshots for `nl-NL` locale, English for default
- [ ] Splash screens look correct in both light and dark mode on a real device
- [ ] No copyrighted imagery (stock photos, characters, logos) in any asset
- [ ] Feature graphic uploaded for Play Store
- [ ] App preview video doesn't contain UI that's no longer in the build

## Common pitfalls

**Pitfall 1: Alpha in App Store icon.** Trivially fixable, but the rejection email arrives 24+ hours later. Always validate.

**Pitfall 2: Adaptive icon foreground content too close to edges.** Looks fine on Pixel circle mask, gets cropped on Samsung's tighter squircle. Test all four mask shapes.

**Pitfall 3: Screenshots showing dev/staging environment.** Real test data, internal usernames, debug overlays. Apple reviewers notice.

**Pitfall 4: Different aspect ratios within one screenshot set.** All 6.5" screenshots must be exactly 1242×2688. Mixing in a 1290×2796 silently corrupts the upload.

**Pitfall 5: Forgetting to regenerate assets after a brand color change.** The icon is generated once, then the brand color changes, then nobody re-runs `@capacitor/assets generate`. Result: old red icon ships with new red app.
