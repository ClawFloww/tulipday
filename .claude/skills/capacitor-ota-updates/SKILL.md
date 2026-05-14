---
name: capacitor-ota-updates
description: Use this skill when implementing over-the-air (OTA) live updates for a Capacitor mobile app, so JavaScript and asset changes can be deployed without going through App Store or Play Store review. Covers the major providers (Capgo, Capawesome Cloud, Appflow), what's allowed and forbidden under Apple's App Store Review Guideline 3.3.2 and Google Play's policies, semantic versioning for OTA updates, rollback strategies, staged rollouts, encrypted delivery, channel-based releases (beta/staging/production), and the boundary between web-asset updates (allowed) and native code changes (must go through store review). Trigger whenever the user mentions OTA updates, live updates, hot updates, Capgo, Capawesome, Appflow, "ship without resubmitting", emergency bug fix, or wanting to bypass store review for small changes.
---

# Capacitor OTA (Over-The-Air) Live Updates

One of the biggest practical advantages of Capacitor over native development is that the UI is web code, which means **you can update it without going through store review**. This is the single highest-leverage capability for a hybrid mobile app: a JavaScript bug discovered Monday morning can be fixed and deployed by Monday afternoon, instead of waiting 1-7 days for App Store review.

## What's allowed and what isn't

Apple App Store Review Guideline 3.3.2 explicitly permits over-the-air updates to **interpreted code** (your JS bundle and web assets) as long as:

- The updates do not change the **primary purpose** of the app
- The updates do not provide **store, storefront, or payment processing** that bypasses Apple
- The downloaded code does not introduce new features that weren't in the reviewed binary

Google Play is more permissive but has similar abuse-prevention rules.

**Allowed via OTA:**
- JavaScript bundle updates (bug fixes, copy changes, layout tweaks)
- HTML, CSS, image assets, fonts
- React component logic, state management changes
- Adding new screens that use APIs the native shell already exposes
- Tuning algorithms (recommendation logic, sorting, filtering)

**NOT allowed via OTA — requires store resubmission:**
- New native plugins or native code changes
- Changes to permissions or `Info.plist` / `AndroidManifest.xml`
- New URL schemes, deep link patterns, or universal link domains
- Changes to in-app purchase products
- Anything that would change the privacy nutrition label or Data Safety form
- New features that materially alter the app's purpose

**The grey zone**: enabling/disabling features behind flags is fine if both states were considered during review. Adding entirely new feature flags for unreviewed features is risky.

## Choosing a provider

| Provider | Strength | Weakness |
|----------|----------|----------|
| **Capgo** | Open source server option, encrypted updates, EU-hostable, generous free tier, channels and rollback built in | Smaller team, less polished dashboard than Appflow |
| **Capawesome Cloud** | Modern API, good docs, integrates well with Capacitor 6/7/8, EU regions | Newer product, smaller community |
| **Appflow (Ionic)** | First-party Ionic product, mature, polished dashboard | Expensive ($499/mo+ for production tier), US-hosted |
| **Self-hosted Capgo** | Full data control, AVG-friendly | You operate the infrastructure |

**Recommendation for TulipDay (Dutch market, AVG-conscious)**: Capgo on the EU region, or self-host the Capgo backend on a Dutch VPS. The encrypted updates feature is particularly relevant — it means the update payload is signed and encrypted in transit and at rest.

## Capgo setup (representative example)

Install the plugin:

```bash
npm install @capgo/capacitor-updater
npx cap sync
```

Initialize the updater in your app shell:

```typescript
// app/ota.client.ts
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { App } from "@capacitor/app";

export async function initOTA() {
  // Notify Capgo that the new bundle started successfully
  // If this is not called within a few seconds of bundle install,
  // Capgo auto-rolls back on next launch
  await CapacitorUpdater.notifyAppReady();

  App.addListener("appStateChange", async ({ isActive }) => {
    if (isActive) {
      // Check for new updates when app foregrounds
      const latest = await CapacitorUpdater.getLatest();
      if (latest.url) {
        const bundle = await CapacitorUpdater.download({
          url: latest.url,
          version: latest.version,
        });
        // Apply on next app restart, or immediately if user opts in
        await CapacitorUpdater.next({ id: bundle.id });
      }
    }
  });
}
```

The `notifyAppReady()` call is the safety mechanism: if a new bundle crashes on startup, the plugin detects that the app never reported "ready" and automatically rolls back to the previous working bundle. This is critical — you can ship breaking updates and the user never sees them.

## Versioning strategy

Use **semantic versioning** for the JS bundle, separately from the native shell version:

```
Native shell version: 1.4.0 (in Info.plist / build.gradle, store-reviewed)
JS bundle versions:   1.4.0, 1.4.1, 1.4.2, 1.4.3 (OTA-shipped patches)
                      1.5.0 (next native shell release)
```

Pattern: the **major.minor** of the JS bundle must match the native shell. The **patch** number floats freely via OTA. When you ship native changes, both bump together and go through store review.

Why this matters: if your native shell exposes a plugin method `bloomStatus.getDetailed()`, your JS bundle can only call it once that plugin version is installed via store. The major.minor pairing makes this contract explicit.

## Channels

Capgo and Capawesome both support channels — separate update streams. Typical setup:

- `production` — the bundle the App Store and Play Store builds point to by default
- `beta` — opt-in from settings, gets updates ~24 hours before production
- `staging` — internal team only, gets every commit to `main`
- `dev` — feature branch builds for QA

Channels are identified by an opaque key set in the app. Switch channels via:

```typescript
await CapacitorUpdater.setChannel({ channel: "beta" });
```

For TulipDay you probably want at minimum `production` and `staging`. Beta opens up later when you have engaged users willing to test.

## Staged rollouts

Don't ship an OTA update to 100% of users at once — same reasoning as native staged rollouts, but the consequences of an OTA failure are smaller because rollback is automatic.

Capgo rollout strategy:
1. Push to 1% of production users
2. Watch Sentry for new error patterns (give it 1-2 hours)
3. If clean, push to 10%
4. After another 2-4 hours, push to 50%
5. After 24 hours, push to 100%

For a small app you can compress this timeline. For a critical bug fix you can skip staging entirely — but only if the fix is small and reviewed.

## Rollback strategy

Three layers of rollback, in increasing severity:

**Layer 1: Auto-rollback on launch failure.** The `notifyAppReady()` mechanism. Happens automatically per-device, no action needed.

**Layer 2: Manual rollout halt.** In the Capgo dashboard, pause the rollout. New users won't get the bad bundle; users who already got it stay on it. Use when the bug is bad but not catastrophic.

**Layer 3: Promote previous bundle.** Re-promote version `1.4.2` to channel `production` after `1.4.3` shipped. Devices update **down** to the older version. Use for serious bugs that auto-rollback didn't catch (e.g., bug doesn't crash on startup but breaks core functionality).

## Build pipeline integration

Add an OTA bundle step to your CI after the regular Next.js build:

```yaml
# .github/workflows/ota-deploy.yml
- name: Build mobile bundle
  run: npm run build:mobile

- name: Sync Capacitor
  run: npx cap sync

- name: Upload OTA bundle to Capgo
  run: npx @capgo/cli upload --apikey ${{ secrets.CAPGO_API_KEY }} --channel staging

- name: Promote to production
  if: github.ref == 'refs/heads/main'
  run: npx @capgo/cli set --channel production --bundle ${{ env.NEW_VERSION }}
```

## Native shell version constraint

Bundles uploaded to Capgo include metadata about which native shell versions they support. Set this in the upload command:

```bash
npx @capgo/cli upload \
  --apikey $CAPGO_API_KEY \
  --channel production \
  --min-update-version 1.4.0 \
  --max-update-version 1.4.99
```

This prevents the OTA from being delivered to a 1.3.x native shell that doesn't have the plugins this bundle expects. The user with the old shell falls back to the latest compatible bundle, and gets a "please update from the store" prompt if you implement one.

## Privacy and AVG considerations

OTA mechanisms ping a server to check for updates. This counts as a network call to a third party. AVG considerations:

- The update server **does** see the user's IP address (network necessity)
- The update server **may** see install ID / version (used for staged rollout targeting)
- This is generally treated as **functional necessity** under AVG Article 6(1)(b) — providing the service — so no consent banner needed
- Disclose it in your privacy policy: "We use [Capgo/Capawesome] to deliver app updates. They process your IP address and app version to deliver the correct update version."
- If using self-hosted Capgo, this is even simpler — you're the only data processor

## Common pitfalls

**Pitfall 1: Shipping a native dependency change via OTA.** You add a `Capacitor.Filesystem.readSecure()` call in JS, but the native plugin doesn't support it on the user's installed version. The OTA installs fine, then the feature crashes. **Fix:** version-gate JS features by checking native shell version at runtime.

**Pitfall 2: Forgetting `notifyAppReady()`.** Every bundle gets auto-rolled-back even when working perfectly, because the plugin never gets the "ready" signal. **Fix:** call it as early as possible in app startup, ideally in the first effect of your root component.

**Pitfall 3: Apple rejection for "remote code execution".** Reviewers occasionally flag OTA-heavy apps under Guideline 2.5.2. **Mitigation:** in App Store Connect review notes, mention that you use Capgo for asset/JS updates only, never native changes, and link to the Capgo Apple compliance page.

**Pitfall 4: No rollback path.** You shipped a bundle that breaks `notifyAppReady()` itself (e.g., infinite loop before that call). Auto-rollback never triggers because the app technically didn't crash. **Fix:** call `notifyAppReady()` before any of your code runs, in the very first synchronous statement.

**Pitfall 5: Sentry version mismatch.** Your Sentry "release" field tracks the native shell version, but the crash actually happened in OTA bundle `1.4.7`. **Fix:** set `Sentry.setTag("ota_bundle", await CapacitorUpdater.current())` after init.

## Checklist for first OTA deployment

- [ ] Provider account set up (Capgo / Capawesome / Appflow)
- [ ] Plugin installed and `cap sync` run
- [ ] `notifyAppReady()` called on app startup
- [ ] Channels configured (at minimum: production, staging)
- [ ] Channel switching UI for internal testers
- [ ] CI uploads bundle on every merge to `main` to staging channel
- [ ] Manual promotion step required for production
- [ ] Min/max native version constraints set per bundle
- [ ] Staged rollout policy documented (e.g., 1% → 10% → 50% → 100%)
- [ ] Sentry tag for OTA bundle version
- [ ] Privacy policy mentions the OTA provider
- [ ] Test a deliberate broken bundle and verify auto-rollback works
