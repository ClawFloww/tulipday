---
name: mobile-cicd-fastlane
description: Use this skill when setting up continuous integration and continuous deployment for a Capacitor or hybrid mobile app. Covers Fastlane for iOS and Android, GitHub Actions workflows for mobile builds, automated TestFlight and Play Store internal track uploads, code signing automation via Fastlane Match, version bumping, build number management, dSYM upload for Sentry, beta distribution, and the differences between building iOS in CI (needs macOS runner) and Android (any Linux runner). Trigger whenever the user mentions CI/CD, Fastlane, GitHub Actions, automated builds, TestFlight upload, Play Store upload, Match, certificates, build automation, or wants to stop manually building from Xcode/Android Studio.
---

# Mobile CI/CD with Fastlane

Manual builds from Xcode and Android Studio work for one developer with infinite patience. CI/CD is mandatory once you have:
- Multiple developers
- Frequent releases
- Need for reproducible builds
- Want to free up your local machine

For Capacitor apps, the pipeline has more steps than a pure-native app because you also build the web bundle first.

## Overall pipeline

```
git push (or tag)
  ↓
CI: install Node deps, build web (next build)
  ↓
CI: npx cap sync to copy assets to native projects
  ↓
[parallel]
  iOS lane: Fastlane on macOS runner → IPA → TestFlight
  Android lane: Fastlane on Linux runner → AAB → Play Internal track
  ↓
Notification (Slack, email)
```

## Why Fastlane

Fastlane wraps the painful parts of iOS and Android builds:
- Code signing (Match)
- Building (gym for iOS, gradle for Android)
- Uploading (pilot for TestFlight, supply for Play)
- Versioning (increment_version_number, increment_build_number)
- Screenshots (snapshot, screengrab)
- Metadata (deliver for App Store, supply for Play)

Alternative: GitHub Actions with raw `xcodebuild` and `gradle` commands. Doable but you reinvent Fastlane bit by bit. Fastlane is worth the learning curve.

## Installation

Per project, in your repo root:
```bash
cd ios && bundle init
echo 'gem "fastlane"' >> Gemfile
bundle install
bundle exec fastlane init  # walks through setup
```

Same for `android/`. Or use a single `fastlane/` directory at repo root managing both.

## Fastlane Match (code signing)

The single best thing Fastlane offers. Stores certificates and provisioning profiles in a private Git repo, encrypted. Any machine (CI included) can pull them on demand.

Setup:
```bash
fastlane match init
# Choose Git as storage, point to a private repo (e.g. github.com/floww/certs)
```

Then on first run:
```bash
fastlane match appstore  # generates App Store distribution cert + profile
fastlane match development  # generates dev cert + profile
```

In CI:
```ruby
# Fastfile
lane :build_ios do
  match(type: "appstore", readonly: true)
  build_app(
    workspace: "App.xcworkspace",
    scheme: "App",
    export_method: "app-store",
  )
end
```

`readonly: true` in CI prevents accidental regeneration of certificates.

## iOS Fastfile

`ios/fastlane/Fastfile`:

```ruby
default_platform(:ios)

platform :ios do
  before_all do
    setup_ci if ENV['CI']
  end

  desc "Build and upload to TestFlight"
  lane :beta do
    # Pull certificates from match repo
    match(type: "appstore", readonly: true)

    # Bump build number based on TestFlight latest
    increment_build_number(
      build_number: latest_testflight_build_number(
        app_identifier: "com.floww.tulipday"
      ) + 1
    )

    # Build the IPA
    build_app(
      workspace: "App.xcworkspace",
      scheme: "App",
      export_method: "app-store",
      output_directory: "build",
      clean: true,
    )

    # Upload to TestFlight
    upload_to_testflight(
      skip_waiting_for_build_processing: true,
      apple_id: ENV["APPLE_ID"],
      itc_provider: ENV["ITC_TEAM_ID"],
      changelog: "Internal beta build #{lane_context[SharedValues::BUILD_NUMBER]}",
    )

    # Upload dSYMs to Sentry for crash symbolication
    sentry_upload_dsym(
      auth_token: ENV["SENTRY_AUTH_TOKEN"],
      org_slug: "floww",
      project_slug: "tulipday-ios",
    )
  end

  desc "Build and submit to App Store"
  lane :release do
    match(type: "appstore", readonly: true)

    increment_build_number(
      build_number: latest_testflight_build_number + 1
    )

    build_app(
      workspace: "App.xcworkspace",
      scheme: "App",
      export_method: "app-store",
    )

    upload_to_app_store(
      submit_for_review: false,  # safer — review in App Store Connect first
      automatic_release: false,
      force: true,
    )
  end
end
```

## Android Fastfile

`android/fastlane/Fastfile`:

```ruby
default_platform(:android)

platform :android do
  desc "Build and upload to Play Internal track"
  lane :beta do
    # Bump version code based on Play
    google_play_track_version_codes(
      track: 'internal',
      package_name: "com.floww.tulipday",
    )

    new_version_code = google_play_track_version_codes(
      track: 'internal',
      package_name: "com.floww.tulipday",
    ).first + 1

    # Update build.gradle
    increment_version_code(
      gradle_file_path: "app/build.gradle",
      version_code: new_version_code,
    )

    # Build the AAB
    gradle(
      task: "bundle",
      build_type: "Release",
      properties: {
        "android.injected.signing.store.file" => ENV["KEYSTORE_PATH"],
        "android.injected.signing.store.password" => ENV["KEYSTORE_PASSWORD"],
        "android.injected.signing.key.alias" => ENV["KEY_ALIAS"],
        "android.injected.signing.key.password" => ENV["KEY_PASSWORD"],
      },
    )

    # Upload to Play Internal track
    upload_to_play_store(
      track: 'internal',
      aab: 'app/build/outputs/bundle/release/app-release.aab',
      json_key: ENV["PLAY_JSON_KEY_PATH"],
      skip_upload_apk: true,
    )

    # Upload mapping file to Sentry for ProGuard symbolication
    sentry_upload_proguard(
      auth_token: ENV["SENTRY_AUTH_TOKEN"],
      org_slug: "floww",
      project_slug: "tulipday-android",
      mapping_paths: ["app/build/outputs/mapping/release/mapping.txt"],
    )
  end

  desc "Promote internal to production"
  lane :promote_to_production do
    upload_to_play_store(
      track: 'internal',
      track_promote_to: 'production',
      package_name: "com.floww.tulipday",
      json_key: ENV["PLAY_JSON_KEY_PATH"],
      skip_upload_apk: true,
      skip_upload_aab: true,
      skip_upload_metadata: true,
      skip_upload_changelogs: true,
      skip_upload_images: true,
      skip_upload_screenshots: true,
    )
  end
end
```

## Play Console service account

For Fastlane to upload to Play, you need a service account JSON key:

1. Play Console → Setup → API access
2. Create service account in Google Cloud Console (linked)
3. Grant the service account access to your app in Play Console
4. Download the JSON key
5. Store as a secret in CI

The service account needs at minimum "Release Manager" permissions.

## GitHub Actions workflow

`.github/workflows/mobile-deploy.yml`:

```yaml
name: Mobile Deploy

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to deploy'
        required: true
        type: choice
        options:
          - both
          - ios
          - android

jobs:
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build:mobile
      - uses: actions/upload-artifact@v4
        with:
          name: web-build
          path: out/

  deploy-ios:
    needs: build-web
    if: ${{ github.event.inputs.platform != 'android' }}
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - uses: actions/download-artifact@v4
        with:
          name: web-build
          path: out/
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          working-directory: ios
      - run: npm ci
      - run: npx cap sync ios
      - name: Fastlane beta
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_TOKEN }}
          FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          ITC_TEAM_ID: ${{ secrets.ITC_TEAM_ID }}
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
        working-directory: ios
        run: bundle exec fastlane beta

  deploy-android:
    needs: build-web
    if: ${{ github.event.inputs.platform != 'ios' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - uses: actions/download-artifact@v4
        with:
          name: web-build
          path: out/
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          working-directory: android
      - run: npm ci
      - run: npx cap sync android
      - name: Decode keystore
        env:
          KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: |
          echo "$KEYSTORE_BASE64" | base64 -d > android/app/release.keystore
      - name: Decode Play JSON key
        env:
          PLAY_JSON_KEY: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
        run: |
          echo "$PLAY_JSON_KEY" > android/play-key.json
      - name: Fastlane beta
        env:
          KEYSTORE_PATH: ${{ github.workspace }}/android/app/release.keystore
          KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
          PLAY_JSON_KEY_PATH: ${{ github.workspace }}/android/play-key.json
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
        working-directory: android
        run: bundle exec fastlane beta
```

## Required GitHub secrets

For iOS:
- `MATCH_PASSWORD` — encryption password for Match repo
- `MATCH_GIT_TOKEN` — GitHub PAT with read access to certs repo
- `APPLE_ID` — your Apple ID email
- `APPLE_APP_PASSWORD` — app-specific password from appleid.apple.com
- `ITC_TEAM_ID` — App Store Connect team ID
- `SENTRY_AUTH_TOKEN` — for dSYM upload

For Android:
- `ANDROID_KEYSTORE_BASE64` — `base64 -w 0 release.keystore`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `PLAY_SERVICE_ACCOUNT_JSON` — service account JSON content
- `SENTRY_AUTH_TOKEN`

## Versioning strategy

Two options:

**Tag-based**: every git tag `v1.2.3` triggers a build with that version. Clean, traceable, but slow.

**Auto-bump**: every push to main bumps build number, version stays manually managed. Fast for beta channels.

For TulipDay-style workflow:
- `main` → auto-deploy to internal/TestFlight on every merge
- `release/*` branches → deploy to production after manual approval

## Caching to speed up CI

iOS pod install and Android gradle download are slow. Cache them:

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ios/Pods
      ~/Library/Caches/CocoaPods
    key: pods-${{ hashFiles('ios/Podfile.lock') }}

- uses: actions/cache@v4
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
    key: gradle-${{ hashFiles('android/**/*.gradle*') }}
```

## Notifications

After successful deploy, notify the team:

```ruby
after_all do |lane|
  slack(
    message: "✅ TulipDay #{lane} deployed",
    success: true,
    slack_url: ENV["SLACK_WEBHOOK"],
  )
end

error do |lane, exception|
  slack(
    message: "❌ TulipDay #{lane} failed: #{exception.message}",
    success: false,
    slack_url: ENV["SLACK_WEBHOOK"],
  )
end
```

## Build performance tips

iOS builds in CI are SLOW (15-25 min typical). To speed up:
- Use macos-14 runners (faster than older ones)
- Cache Pods and DerivedData
- Skip dSYM upload on PR builds, only on release
- Don't run tests in the deploy lane — have a separate test lane

Android builds are faster (5-10 min) but still:
- Use `--parallel` and `--build-cache` in Gradle
- Cache `~/.gradle`
- Don't ship debug symbols to release if not needed

## When NOT to use CI/CD

- Solo dev, single platform, weekly releases → manual is fine, save the setup time
- Pre-launch with rapidly changing config → CI catches you in setup hell

Set it up after the first 2-3 manual releases when you know the moving parts.

## Local Fastlane usage

You don't HAVE to run Fastlane only in CI. Local commands:
```bash
cd ios
bundle exec fastlane beta  # build and upload from your Mac
```

Useful for ad-hoc beta releases without waiting for CI.
