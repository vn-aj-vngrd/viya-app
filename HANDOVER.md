# Viya UI/UX overhaul handover

## Goal
Premium, minimalist, iOS-native Liquid-Glass-inspired redesign of the whole Viya Expo app (`apps/native`), adapted for Android. Reference: `../aqd/DESIGN.md` (restraint, glass only on compact controls, opaque flat content, 44pt targets, haptics, shared components).

## Done
- Foundation: `apps/native/src/components/ui` (GlassSurface, PressableScale, GlassIconButton, Primary/SecondaryButton, Chip, Card, SectionHeader, ListGroup/ListRow, CollapsingScreen/ScreenHeader, SheetHeader, EmptyState, LoadingState, FeedbackProvider/useFeedback, AppText, tokens, useUITheme). `expo-glass-effect` and `expo-blur` installed. Light/dark tokens wired through `global.css`. DESIGN.md has a "UI Foundation" section.
- Tab bar is the native `NativeTabs` bar (Liquid Glass, minimize on scroll); nav/back buttons are glass.
- Restyled on the primitives: auth, onboarding, layouts, modal/not-found, home, trips list, profile, vault/moments tabs, date picker, Viya chat (glass composer, bubbles), trip creation and dashboard, itinerary/places/travel mode, budget/bookings/readiness/risks, vault/moments/notes/companions/recap.

## Validation (final run)
- `npx tsc --noEmit` (apps/native): 0 errors.
- `ultracite check apps`: only error is generated `expo-env.d.ts` formatting (not ours).
- `bun test apps/native`: 126 pass, 7 fail (6 are source-text contract tests in trips/bookings that already failed before the redesign; the exact baseline of the 7th was not verified).
- NOTHING was run on a device or simulator. Glass needs a dev build (not Expo Go). All visuals are unverified.

## Known issues / next steps
1. Build a dev client (`bun run ios`) and visually QA every screen in light, dark, Reduce Transparency, and Android.
2. Fix or update the failing contract tests (strings like "No scheduled items yet", "Open Maps", `NextTimelineItemSummary`): either restore the copy/identifiers or update the tests.
3. Auth sheet title/description still use HeroUI classNames (`BottomSheet.Title` lacks `asChild`); verify bottom sheet background styling takes effect.
4. Profile still uses Feather icons; `trip-status-pill.tsx` colors not tokenised.
5. SheetHeader close label is generic "Close" (old per-sheet labels gone).
6. Nothing is committed; review the diff (`git diff --stat`) before committing.

## iOS simulator run (added later)
- Installed iOS 27.2 simulator runtime (`xcodebuild -downloadPlatform iOS`); `Simulator.app` is missing on this machine so `expo run:ios` fails ("Can't determine id of Simulator app"). Workaround: `simctl create/boot` a device, `xcodebuild -workspace apps/native/ios/Viya.xcworkspace -scheme Viya -destination id=<udid> build`, `simctl install` + `launch com.vnajvngrd.viya`, Metro via `npx expo start --dev-client`; screenshots via `simctl io <udid> screenshot`.
- Local workarounds needed for Xcode 27 / iOS 27 (in generated `apps/native/ios` and node_modules, NOT yet in app config, so `expo prebuild` would wipe them):
  1. Podfile: floor Pods deployment target at 15.1 in post_install; platform 17.0 (Clerk needs iOS 17).
  2. `node_modules/.bun/expo-modules-jsi@56.0.7/.../JavaScriptRuntime.swift:242`: replaced the `set == nil ? nil : setter` ternary with an if/else (Swift "C function pointer" error).
  3. iOS 27 traps apps without UIScene lifecycle: added `SceneDelegate` in AppDelegate.swift and `UIApplicationSceneManifest` in Info.plist.
  To persist: move (1) and (3) into a config plugin / expo-build-properties, and patch (2) with `patch-package` or wait for an expo-modules-jsi release.
- Verified on simulator: app launches; redesigned auth carousel renders (glass-free opaque bubbles, accent user bubbles, ink progress segments, composer). Signed-in screens (tabs, trips, profile, chat) still NOT visually checked: they need a Clerk login.

## Running on Van's iPhone 17 Pro Max (UDID 00008150-001A25042213C01C)
- Xcode now has Van's Apple ID. Build: `cd apps/native/ios && xcodebuild -workspace Viya.xcworkspace -scheme Viya -configuration Debug -destination id=<udid> -derivedDataPath <dir> DEVELOPMENT_TEAM=355RN23UY7 -allowProvisioningUpdates build`; then `xcrun devicectl device install app --device <udid> <dir>/Build/Products/Debug-iphoneos/Viya.app`.
- Metro must be running (`npx expo start --dev-client` in apps/native, port 8081). The app has no dev-client launcher (expo-dev-client was installed after prebuild; re-run prebuild to get it), so launch with the Metro host: `xcrun devicectl device process launch --terminate-existing --device <udid> com.vnajvngrd.viya -- -RCT_jsLocation <mac-lan-ip>:8081`.
- Capture: `xcrun devicectl device capture screenshot --device <udid> --destination x.png`.
- Verified on device (dark mode): welcome carousel, chat/recap cards render. Signed-in screens not yet checked.
- `expo-dev-client` was added to apps/native/package.json; EAS `development` profile fails because projectId in app.json belongs to another EAS account (needs `eas init` under van-aj).
