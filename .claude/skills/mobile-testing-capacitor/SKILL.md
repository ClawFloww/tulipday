---
name: mobile-testing-capacitor
description: Use this skill when setting up or writing tests for a Capacitor-based mobile app. Covers unit testing the web code with Vitest or Jest, component testing with React Testing Library, end-to-end testing of the WebView UI with Playwright, native end-to-end testing across iOS and Android with Maestro, mocking Capacitor plugins for tests, testing offline behavior and conditional rendering, device farm services like BrowserStack and Firebase Test Lab, and the testing pyramid strategy for hybrid apps. Trigger whenever the user mentions tests, testing, e2e, integration tests, unit tests, Maestro, Detox, Playwright, mocking native plugins, or "how do I test this on a real device".
---

# Testing Capacitor Mobile Apps

Testing strategy for Capacitor apps differs from pure-web testing because:
1. Native plugins don't work in browser-based test runners
2. The native shell behavior (back button, deep links, lifecycle) only appears on device
3. Offline behavior needs real network conditions
4. Visual quirks (safe areas, keyboard) are platform-specific

The pyramid for hybrid apps:

```
        /\
       /  \   E2E on device (Maestro) — 5-15 tests
      /────\
     /      \  E2E in WebView (Playwright) — 30-50 tests
    /────────\
   /          \  Component / integration (Vitest + RTL) — 100-300 tests
  /────────────\
 / unit (Vitest) \ — 500+ tests
/──────────────────\
```

Aim for fast feedback at the bottom, broad coverage in the middle, critical-path validation at the top.

## Unit tests with Vitest

For Next.js 14 + Capacitor, Vitest is faster and easier than Jest. Setup:

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

`test/setup.ts`:
```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Capacitor globally
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
    convertFileSrc: (url: string) => url,
  },
}));
```

## Mocking Capacitor plugins

Most plugins need per-test or per-suite mocks. Create reusable mocks:

`test/mocks/capacitor.ts`:
```typescript
import { vi } from 'vitest';

export const mockGeolocation = {
  getCurrentPosition: vi.fn().mockResolvedValue({
    coords: { latitude: 52.2716, longitude: 4.5535, accuracy: 10 },
    timestamp: Date.now(),
  }),
  watchPosition: vi.fn(),
};

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: mockGeolocation,
}));

export const mockPreferences = {
  store: new Map<string, string>(),
  get: vi.fn(async ({ key }: { key: string }) => ({
    value: mockPreferences.store.get(key) ?? null,
  })),
  set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
    mockPreferences.store.set(key, value);
  }),
  remove: vi.fn(async ({ key }: { key: string }) => {
    mockPreferences.store.delete(key);
  }),
  clear: vi.fn(async () => {
    mockPreferences.store.clear();
  }),
};

vi.mock('@capacitor/preferences', () => ({
  Preferences: mockPreferences,
}));
```

Reset state between tests:
```typescript
beforeEach(() => {
  mockPreferences.store.clear();
  vi.clearAllMocks();
});
```

## Component testing with React Testing Library

Test user-facing behavior, not implementation:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocationCard } from '@/components/LocationCard';
import { mockGeolocation } from '@/test/mocks/capacitor';

describe('LocationCard', () => {
  it('shows bloom status when location is in season', () => {
    render(<LocationCard location={{
      id: '1',
      name: 'Keukenhof',
      bloomStatus: 'peak',
    }} />);

    expect(screen.getByText(/peak bloom/i)).toBeInTheDocument();
  });

  it('opens directions when "Navigate" tapped', async () => {
    const onNavigate = vi.fn();
    render(<LocationCard location={mockLocation} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: /navigate/i }));

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith(mockLocation.id);
    });
  });
});
```

For Dutch UI, queries by text need Dutch:
```typescript
expect(screen.getByText(/in bloei/i)).toBeInTheDocument();
expect(screen.getByRole('button', { name: /navigeer/i }));
```

Or use `data-testid` for language-independent selection:
```typescript
expect(screen.getByTestId('bloom-status-badge')).toHaveTextContent(/in bloei/);
```

## E2E in WebView with Playwright

Playwright tests your web app exactly as the WebView renders it. Fast, runs in CI, but doesn't catch native-specific issues.

Setup:
```bash
npm install -D @playwright/test
npx playwright install chromium webkit
```

`playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'iphone-15-pro',
      use: { ...devices['iPhone 15 Pro'] },
    },
    {
      name: 'pixel-7',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
```

Sample test:
```typescript
import { test, expect } from '@playwright/test';

test('user can swipe through locations', async ({ page }) => {
  await page.goto('/');

  // Wait for swipe deck to load
  await expect(page.getByTestId('swipe-card')).toBeVisible();

  // Simulate swipe right (like)
  const card = page.getByTestId('swipe-card').first();
  await card.dragTo(page.locator('body'), {
    sourcePosition: { x: 200, y: 300 },
    targetPosition: { x: 600, y: 300 },
  });

  // Expect next card visible
  await expect(page.getByTestId('swipe-card')).toBeVisible();

  // Expect liked location in favorites
  await page.getByRole('button', { name: /favorieten/i }).click();
  await expect(page.getByTestId('favorite-list')).toContainText(/Keukenhof/i);
});
```

Mock Capacitor in Playwright by stubbing `window.Capacitor`:
```typescript
await page.addInitScript(() => {
  (window as any).Capacitor = {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
    Plugins: {
      Geolocation: {
        getCurrentPosition: () => Promise.resolve({
          coords: { latitude: 52.27, longitude: 4.55 },
        }),
      },
    },
  };
});
```

## E2E on real devices with Maestro

For native-shell behavior (back button, deep links, push notifications, real WebView quirks), use Maestro. It works on both iOS simulator and real devices, and is much simpler than Detox.

Install:
```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Tests are YAML files — readable, no code required for basics:

`.maestro/flows/swipe-flow.yaml`:
```yaml
appId: com.floww.tulipday
---
- launchApp
- assertVisible: "Welkom"
- tapOn: "Begin"
- assertVisible:
    id: "swipe-card"
- swipe:
    from:
      id: "swipe-card"
    direction: RIGHT
- assertVisible:
    id: "swipe-card"
- tapOn:
    id: "tab-favorites"
- assertVisible: "Keukenhof"
```

Run:
```bash
maestro test .maestro/flows/swipe-flow.yaml
```

Maestro Cloud (paid) runs flows on real device farms. Useful but not required for small apps.

## Testing offline behavior

In Playwright:
```typescript
test('shows cached data when offline', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByText(/Keukenhof/i)).toBeVisible();

  // Go offline
  await context.setOffline(true);

  await page.reload();

  // Cached data still shows
  await expect(page.getByText(/Keukenhof/i)).toBeVisible();
  // Offline indicator visible
  await expect(page.getByTestId('offline-banner')).toBeVisible();
});
```

In Maestro on iOS simulator, use the Network Link Conditioner via shell:
```yaml
- runScript: |
    xcrun simctl status_bar booted override --cellularBars 0 --wifiBars 0
```

## Testing deep links

Critical to test since they're easy to break.

Maestro:
```yaml
- launchApp:
    arguments:
      "url": "https://tulipday.nl/locations/keukenhof"
- assertVisible: "Keukenhof"
- assertNotVisible: "Welcome"  # didn't land on home
```

Manual on iOS:
```bash
xcrun simctl openurl booted "https://tulipday.nl/locations/keukenhof"
```

Manual on Android:
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://tulipday.nl/locations/keukenhof" \
  com.floww.tulipday
```

## Testing push notifications

Push is hard to test in CI. Strategies:

1. **Manual testing** with Firebase Console (Android) and Apple Push Notification service tools
2. **Mock notification payloads** in unit tests for the handler logic
3. **Integration test** with a test-mode of your push provider that doesn't actually send

For Capacitor, test the foreground listener logic separately from delivery:
```typescript
import { PushNotifications } from '@capacitor/push-notifications';

it('navigates to location when push tapped', async () => {
  const mockPush = vi.fn();
  PushNotifications.addListener('pushNotificationActionPerformed' as any, mockPush);

  // Simulate the listener firing
  await mockPush({
    notification: {
      data: { locationId: 'keukenhof' },
    },
  });

  expect(mockRouter.push).toHaveBeenCalledWith('/locations/keukenhof');
});
```

## Visual regression testing

For UI-heavy apps, visual diffs catch what assertions miss. Playwright has built-in screenshots:

```typescript
test('home screen visual', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('home.png', {
    maxDiffPixels: 100,
  });
});
```

First run generates the baseline. Subsequent runs compare. Diff threshold tunable.

For cross-platform visual testing across real devices, BrowserStack App Live or Sauce Labs are options. Paid but powerful.

## Device farm testing

For broad device coverage without owning every model:

1. **Firebase Test Lab** — runs your AAB on real Google-hosted devices. Free tier limited but useful for smoke testing.
2. **BrowserStack App Live / Automate** — wide device range, expensive
3. **AWS Device Farm** — pay per device-minute

Use cases:
- Pre-release smoke test on diverse Android devices (the fragmentation problem)
- Specific device bug reproduction (e.g. "crashes on Samsung A52")
- Performance testing on lower-end devices

## CI integration

GitHub Actions example:
```yaml
name: Test
on: [push, pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit

  e2e-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

Native E2E (Maestro on real devices) usually runs on a self-hosted runner with a Mac mini for iOS, or on Maestro Cloud / BrowserStack.

## What NOT to test

- Don't test Capacitor's internals or third-party libraries — assume they work, test your integration
- Don't snapshot test every component — fragile, low signal
- Don't aim for 100% coverage — focus on critical paths and edge cases
- Don't write tests for trivial render checks — they break with every UI tweak and add no value

## Critical paths to always have E2E coverage for

For a tourist app like TulipDay:
- [ ] Onboarding flow (first launch → permissions → first content)
- [ ] Location discovery (search/swipe/filter)
- [ ] Map view with location selection
- [ ] Save to favorites
- [ ] Route generation
- [ ] Offline cache → online sync
- [ ] Account creation, login, logout, delete account
- [ ] Push notification tap → correct deep link

## Test data and fixtures

Centralize test data:
```typescript
// test/fixtures/locations.ts
export const keukenhofLocation = {
  id: 'keukenhof',
  name: 'Keukenhof',
  village: 'Lisse',
  lat: 52.2716,
  lng: 4.5469,
  bloomStatus: 'peak',
};
```

Use the same fixtures across unit, component, and E2E tests where possible.

## Debugging flaky tests

Common causes:
- Async race conditions — use `waitFor`, not `setTimeout`
- Animation timing — disable animations in test mode
- Network timing — mock fetch consistently
- Date/time dependencies — use `vi.setSystemTime` to freeze

Don't `setTimeout` your way out of flakiness — find the root cause.
