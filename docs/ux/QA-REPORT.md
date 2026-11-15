# Device QA report

Date: 2026-11-15, after the SHELL-SPEC / TABS-SPEC migration (`screen-shell.tsx` modified 13:19).

## Device status: NOT VERIFIED

Target: iPhone 17 Pro Max `00008150-001A25042213C01C`, iOS 27, Metro 8082 (listening, PID 5130). The app relaunched without error (`devicectl ... launch --terminate-existing` returned "Launched application"), and `lockState` reported `passcodeRequired: false`. Every screenshot in 26 attempts over about 6 minutes was solid black: 49,772 bytes at full resolution and 5,572 bytes resized. This means the phone's screen is off. No screen in this pass was seen on the device.

- Earlier files in `/private/tmp/claude-501/-Users-vanajvanguardia-Documents-van/ac76e285-a31d-4ca7-adc5-ea911b980a50/scratchpad/qa/` (`final-*`, `modules-*`, `itin-*`, `trips-core-*`, `chat-*`, `home-vault-*`) were captured between 12:18 and 13:07. More than 40 source files changed after 13:00, so those captures show the old scaffolds and must not be used as evidence. Some of them are also black (`final-mod-budget.png`, `final-mod-places.png` and `final-probe.png`, all 49,772 bytes).
- To unblock: wake and unlock the phone, then re-run this QA. Use trip `k175gpayf9chahcxedtgpct9cd87tqnb` ("Singapore Trip", Van's only trip, found with `CONVEX_DEPLOYMENT=dev:pastel-caterpillar-63 npx convex data trips`). Deep-link only after the app is already running. Links sent at cold launch are dropped.

Everything below comes from reading the source code. Severity: P0 blocks use, P1 is a contract violation the user sees, P2 is polish.

## Code-level status of Van's complaints

| Complaint | Source state | Device |
|---|---|---|
| Broken or inconsistent headers | Every route uses `ScreenShell` or `ShellHeader` (native stack header). `CollapsingScreen`, `ScreenHeader`, `TripModuleScreenFrame`, `ModuleScroll`, `ModuleTitle`, `NavBackButton`, `ModuleScreen` and `ModuleState` are gone from `app` and `src`. | unverified |
| One layout shell | Shell options come from one place: `useShellScreenOptions` in `(app)/_layout.tsx` and the four per-tab `_layout.tsx` files. | unverified |
| No tab bar on detail screens or chat | All detail routes are siblings of `(tabs)` in the `(app)` Stack. `ai`, `trips/new` and `travel-mode` are `fullScreenModal`. The Ask Viya tab is a launcher. | unverified |
| Spacing | The shell owns the insets. A few raw literals remain (see X2). | unverified |

## Cross-cutting

| # | Sev | Defect | Exact fix |
|---|---|---|---|
| X1 | P0 (process) | Device QA is blocked because the screen is off. | Wake and unlock the phone, then re-run this QA. Walk every slice below and confirm SHELL-SPEC section 11 and TABS-SPEC section 7 in light and dark. |
| X2 | P2 | Raw spacing literals remain: `gap: 4` in `src/features/bookings/module-kit.tsx:43`; `paddingTop: 2, width: 32` and `gap: 2` in `app/(auth)/index.tsx:51,54`; `gap: 6` in `src/components/ui/chip.tsx:40`. | Replace `gap: 4` with `gap: spacing.xs`. In `chip.tsx`, use `gap: spacing.xs`. In `(auth)/index.tsx:51`, replace `paddingTop: 2, width: 32` with `width: spacing["2xl"]` (drop the paddingTop); leave line 54's `gap: 2`. Leave `gap: 2` in the `list.tsx`, `section-header.tsx`, `trip-recap-screen.tsx:61`, `trip-itinerary-screen.tsx:353`, `location-suggestion-field.tsx:236` and `itinerary-preview.tsx` title/subtitle stacks as they are: they are text leading, not layout. |
| X3 | P2 | Leading row icons use `tone="accent"` (10 sites), for example the vault add sheet (`trip-vault-screen.tsx:306`), companions call and mail (`trip-companions-screen.tsx:139,162`), moments (`trip-moments-screen.tsx:132,139`) and notes link (`trip-notes-screen.tsx:239`). DESIGN section 5 allows accent only for the primary action, selection and links. | In each `leading={<Icon ... tone="accent" />}` (find them with `grep -rn 'leading={<Icon.*tone="accent"' src`), change `tone="accent"` to `tone="secondary"`. |
| X4 | P2 | `src/constants/routes.ts` still uses the long group paths (`home: "/(app)/(tabs)/(discover)"`, `trips`, `profile`) and the `viya` launcher constant. It has no `vault` constant. This is contrary to SHELL-SPEC 2. | Set `home: "/"`, `trips: "/trips"`, `profile: "/profile"` and add `vault: "/vault"`. Delete `viya`. Update `app/(app)/index.tsx`, `app/(auth)/_layout.tsx` and `src/features/auth/auth-social-buttons.tsx` to use `VIYA_ROUTES.home`. Update the expectations in `viya-chat-utils.test.mts:95,100`. |

## Slice: chat

| Screen | Screenshot |
|---|---|
| Ask Viya tab → `ai` cover | not captured (screen off) |
| `ai` with a trip (`tripId` param) | not captured |
| Conversations sheet | not captured |

1. P2. The launcher (`app/(app)/(tabs)/viya.tsx:22-24`) pushes `params: { returnTo: "/(app)/(tabs)" }` without `fromTab`, so the fallback close path (`router.replace(getViyaBackRoute(...))`) always lands on Discover. Fix: change the params to `{ fromTab: source, returnTo: "/(app)/(tabs)" }`.
2. P2. The composer inset is `paddingHorizontal: spacing.lg` (16, `viya-chat-screen.tsx:1020`) but the messages use `spacing.screen` (20, line 915), so their left edges differ by 4pt. Fix: set the composer container to `paddingHorizontal: spacing.screen`.
3. Verify on device: no tab bar under the cover, the xmark at the left, and history and new-conversation sharing one glass capsule at the right. Also confirm the first message clears the transparent header. The `ScrollView` is nested in `KeyboardAvoidingView` → `View`; if it does not clear the header, add `paddingTop: spacing.lg` only after you have seen the overlap on the device.

## Slice: tabs (Discover, Trips, Vault, Profile, profile/appearance, profile/travel, profile/travel-option)

All of these screens are built on `ScreenShell` with `titleMode="large"` (tab roots) or an inline title (the profile pushes). Trips uses `search` and the `add` action. No defects found in code. Not captured: verify the large-title y position, the native search bar, the Segmented control 8pt below search, and the profile pushes showing no tab bar.

## Slice: auth + onboarding

`(auth)/index` and `(auth)/sign-in` are unreachable while signed in. `onboarding/preferences` uses `ScreenShell` with `summary` "N of M" and a custom back. Not captured.

## Slice: trips-core (dashboard, trips/new, not-found)

The dashboard is `ScreenShell titleMode="large"` with a footer. `trips/new` uses `leading="none"` at `manual-trip-create-screen.tsx:488` (the second shell). SHELL-SPEC 7 requires step 0 to use `close`. Fix: change that `leading="none"` to `leading="close"`, unless the screen is the in-flow success state, in which case keep it. `+not-found` uses `ScreenShell`. Not captured.

## Slice: itinerary-places-travel

Itinerary, Places, Day and Travel mode (`leading="close"`, `summary={trip.title}`) all use `ScreenShell`. Not captured.

## Slice: modules-a (budget, bookings, readiness, risks)

All use `ScreenShell` and the `Segmented` primitive. Not captured.

## Slice: modules-b (vault, notes, companions, recap, moments)

All use `ScreenShell`. See X3 for the accent leading icons. Not captured.

## Re-walk (final QA, 13:37-13:41)

Device: still NOT VERIFIED. Relaunched the app (`Launched application`), `lockState` reported `passcodeRequired: false`, and 18 captures over 4 minutes were all solid black (49,772 bytes), so the screen is off. No `final-<slice>-<name>.png` was saved because every capture was black. Every screen below is marked from the source code only.

| Slice | Screens | Code status | Device |
|---|---|---|---|
| chat | Ask Viya launcher, `ai` cover, conversations sheet | pass: `fullScreenModal` with no tab bar; launcher passes `fromTab`; composer and messages both use `spacing.screen` | unverified |
| tabs | Discover, Trips, Vault, Profile, profile/appearance, travel, travel-option | pass: `ScreenShell` large titles; profile pushes are siblings of `(tabs)` | unverified |
| auth + onboarding | (auth)/index, sign-in, onboarding/preferences | pass: `(auth)/index.tsx:51` literal is gone; `gap: 2` at line 54 is text leading | unverified |
| trips-core | dashboard, trips/new, +not-found | pass: `leading="none"` at `manual-trip-create-screen.tsx:488` is the in-flow `CreatingState`, so it stays (SHELL-SPEC 7 exception) | unverified |
| itinerary-places-travel | itinerary, itinerary-day, places, travel-mode | pass | unverified |
| modules-a | budget, bookings, readiness, risks | pass: `risks` redirects to readiness `segment=heads-up` | unverified |
| modules-b | vault, notes, companions, wrapped, moments | pass after the fix below | unverified |

Fixed in this pass:
- X3: `trip-moments-screen.tsx:132,139` leading icons `tone="accent"` → `tone="secondary"`. No accent leading icons remain.
- X2: `chip.tsx:40` `gap: 6` → `gap: spacing.xs`. The only raw spacing left is `gap: 2` on title/subtitle stacks, which is allowed.

Remaining defects, ranked:
1. P0 (process): there is no device evidence for any screen. To fix, wake and unlock the phone and re-walk all of the slices above in light and dark.
2. P1 (tests): 5 source-contract tests fail because the refactor moved their targets. `booking-target-card.tsx` was deleted, and the risks screen was folded into readiness. To fix, point the tests in `trip map action contract`, `trip risks *` and `trip linked entity labels` at the new files, or delete the cases whose screen no longer exists.
3. P2: X4 (`src/constants/routes.ts` long group paths, `viya` constant, no `vault` constant) is still open. Apply the X4 fix above.

Checks: `npx tsc --noEmit` passed with 0 errors. `bun test apps/native` gave 118 pass, 5 fail (123 tests across 65 files).
