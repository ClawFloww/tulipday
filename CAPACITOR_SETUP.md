# Capacitor Setup — Native Builds

## Prerequisites
- Xcode 15+ (iOS builds)
- Android Studio (Android builds)
- Apple Developer account ✅
- Google Play Console account ✅

## First-time setup
```bash
npm run build          # generates out/ folder
npx cap add ios        # add iOS platform
npx cap add android    # add Android platform
npx cap sync           # sync web assets to native
```

## iOS build
```bash
npm run cap:ios        # opens Xcode
```
In Xcode: select your team, set bundle ID to nl.tulipday.app, build & archive.

## Android build
```bash
npm run cap:android    # opens Android Studio
```
In Android Studio: Build → Generate Signed Bundle/APK → upload to Play Console.

## Daily workflow
```bash
npm run build:mobile   # rebuild + sync to native
```
