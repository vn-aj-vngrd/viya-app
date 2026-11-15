# Shell spec: one layout shell for every screen

Status: decided (Opus), to be built by Sonnet agents. Scope: `apps/native` only, no backend changes. This spec wins over `UX-PLAN.md`, `QA-REPORT.md` X1/X5 and the header parts of `TABS-SPEC.md` where they disagree. Do not commit.

Van's complaints this fixes: (a) detail headers differ per screen (Budget: glass back button on its own row, then a large title, then a subtitle, with spacing that differs from Itinerary, Moments and the dashboard); (b) no single shell; (c) the tab bar shows on chat; (d) spacing differs per screen.

Root cause (from the code, 2026-11-15): every screen draws its own header. There are five header scaffolds today: `CollapsingScreen` + `ScreenHeader` (`src/components/ui/screen-header.tsx`, a JS imitation of a large title with a hand-made bar), `ModuleScreen` / `ModuleState` / `NavBackButton` (`src/components/itinerary/trip-module-ui.tsx`), `TripModuleScreenFrame` + `ModuleScroll` + `ModuleTitle` (`src/features/trips/trip-module-floating-bar.tsx`, `src/features/bookings/module-kit.tsx`, still used by Moments), hand-built bars in `manual-trip-create-screen.tsx`, `preference-onboarding-screen.tsx` and `viya-chat-screen.tsx`, and the real native header (only the three Profile pushes). The `(app)` stack sets `headerShown: false` for everything. Ask Viya is a real tab, so chat shows the tab bar.

## 1. Decision

Use the native stack header (`react-native-screens` via expo-router `Stack`, SDK 56, expo-router 56.2.5, react-native-screens 4.25.1) for every screen. Delete `CollapsingScreen` and every custom bar.

Why native and not `CollapsingScreen`: on iOS 26+ the system header gives the real Liquid Glass back button, the scroll-edge effect, native large-title collapse, swipe-back that tracks the title, Dynamic Type, VoiceOver order and toolbar glass grouping for free. A JS bar cannot match any of them and is what drifted per screen. Every needed piece exists in this stack: `Stack.Screen` options (`title`, `headerLargeTitle`, `headerTransparent`), `Stack.Toolbar` with `placement="left" | "right"` plus `Stack.Toolbar.Button` / `Stack.Toolbar.Menu` / `Stack.Toolbar.MenuAction` (verified in `node_modules/.bun/expo-router@56.2.5/.../build/layouts/StackClient.d.ts`), and `Stack.SearchBar` (`headerSearchBarOptions`). The header has no native subtitle in this version (react-native-screens 4.25.1 has no `UINavigationItem.subtitle` binding), so subtitles move into content (section 5).

Two title modes, nothing else:

| Mode | iOS | Android | Used by |
|---|---|---|---|
| `large` | Large title under the bar, collapses to an inline title on scroll (system) | Material top app bar, title left, 64dp | Tab roots (Discover, Trips, Vault, Profile) and the trip dashboard (a hub at the top of its own hierarchy) |
| `inline` | Back (or close), inline centred title and toolbar items in ONE row | Same top app bar | Every other pushed or modal screen |

This removes the Budget pattern (back row, then large title, then subtitle). On every module screen the back button, the title "Budget" and the add button sit on one row, like iOS Settings sub-pages.

## 2. Route structure

Target tree (`apps/native/app`). Files marked NEW or MOVE; everything else stays.

```
_layout.tsx                         root Stack: (app), (auth)          (unchanged)
(app)/_layout.tsx                   Stack: headers ON by default (section 3)
(app)/index.tsx                     Redirect to "/"                   (change href)
(app)/(tabs)/_layout.tsx            NativeTabs (TABS-SPEC 1)
(app)/(tabs)/(discover)/_layout.tsx NEW  Stack, one screen
(app)/(tabs)/(discover)/index.tsx   MOVE from (tabs)/index.tsx        URL "/"
(app)/(tabs)/(trips)/_layout.tsx    NEW
(app)/(tabs)/(trips)/trips.tsx      MOVE from (tabs)/trips.tsx        URL "/trips"
(app)/(tabs)/(vault)/_layout.tsx    NEW
(app)/(tabs)/(vault)/vault.tsx      MOVE from (tabs)/vault.tsx        URL "/vault"
(app)/(tabs)/(profile)/_layout.tsx  NEW
(app)/(tabs)/(profile)/profile.tsx  MOVE from (tabs)/profile.tsx      URL "/profile"
(app)/(tabs)/viya.tsx               Ask Viya launcher (section 2.2)   URL "/viya"
(app)/ai.tsx                        chat, fullScreenModal
(app)/trips/new.tsx                 fullScreenModal
(app)/trips/[tripId]/*.tsx          all detail routes (push)
(app)/trips/[tripId]/travel-mode.tsx fullScreenModal
(app)/profile/appearance.tsx, travel.tsx, travel-option.tsx   (push)
(app)/onboarding/preferences.tsx    fullScreenModal, no back gesture
```

### 2.1 Why the tab bar never shows on detail screens

The tab bar belongs to the `(tabs)` route. Every detail route (`trips/[tripId]/*`, `trips/new`, `profile/*`, `ai`, `onboarding/preferences`, `+not-found`) is a sibling of `(tabs)` in the `(app)` Stack, so pushing one covers the whole tab controller. The per-tab Stacks (`(discover)`, `(trips)`, `(vault)`, `(profile)`) exist only to give tab roots a native large-title header and search bar; they contain exactly one screen each and never receive detail routes. Rule for builders: never add a second screen file inside a `(tabs)/(x)/` folder. `router.push(VIYA_ROUTES.tripDashboard(id))` from inside the `(trips)` tab resolves to `(app)/trips/[tripId]/index` (the only match) and pushes on the `(app)` Stack.

Each per-tab `_layout.tsx` is exactly:
```tsx
import { Stack } from "expo-router";
import { useShellScreenOptions } from "@/src/components/ui";
export default function DiscoverStack() {
  const screenOptions = useShellScreenOptions();
  return <Stack screenOptions={screenOptions} />;
}
```
(same for trips, vault, profile; component name changes).

Route constants (`src/constants/routes.ts`): `home: "/"`, `trips: "/trips"`, `profile: "/profile"`, add `vault: "/vault"`, delete `viya` (nothing may push the launcher tab; use `ai`). Update every `"/(app)/(tabs)"`, `"/(app)/(tabs)/trips"`, `"/(app)/(tabs)/viya"` and `"/(app)/(tabs)/profile"` literal in `app/` and `src/` to the constants (`grep -rn "(tabs)" app src` must then only hit `_layout.tsx` files). `getViyaBackRoute`'s `returnTabRoutes` in `viya-chat-utils.ts` maps to the same constants; update its test expectations.

### 2.2 Chat: full-screen cover, opened from the Ask Viya tab

Chat lives only at `(app)/ai` (`presentation: "fullScreenModal"`). It covers the tab bar and returns to where it was opened with `router.back()`.

NativeTabs 56 cannot intercept a tab press: `NativeTabNavigationEventMap.tabPress` is declared `canPreventDefault: false` (`build/native-tabs/types.d.ts`). So the Ask Viya tab is a launcher that bounces back:

1. New file `src/features/viya/ask-viya-launch.ts`:
   ```ts
   type ContentTab = "(discover)" | "(trips)" | "(vault)" | "(profile)";
   let lastContentTab: ContentTab = "(discover)";
   export const rememberContentTab = (name: string) => { if (name !== "viya") lastContentTab = name as ContentTab; };
   export const getLastContentTab = () => lastContentTab;
   export const contentTabHref: Record<ContentTab, Href> = { "(discover)": VIYA_ROUTES.home, "(trips)": VIYA_ROUTES.trips, "(vault)": VIYA_ROUTES.vault, "(profile)": VIYA_ROUTES.profile };
   ```
2. `(tabs)/_layout.tsx`: `<NativeTabs screenListeners={({ route }) => ({ focus: () => rememberContentTab(route.name) })} ...>`.
3. `(tabs)/viya.tsx` (whole file, about 25 lines):
   ```tsx
   export default function AskViyaLauncher() {
     const router = useRouter();
     const { palette } = useUITheme();
     useFocusEffect(useCallback(() => {
       const source = getLastContentTab();
       router.navigate(contentTabHref[source]);          // tab switches back underneath
       router.push({ pathname: VIYA_ROUTES.ai, params: { fromTab: source } }); // cover slides up
     }, [router]));
     return <View style={{ flex: 1, backgroundColor: palette.canvas }} />;
   }
   ```
   If on device the cover does not appear (both dispatches in one tick), wrap only the `push` in `requestAnimationFrame`. If the tab bar visibly flashes the empty launcher for more than one frame, report it with a screenshot; do not build a custom tab bar.
4. `ViyaChatScreen` loses the `presentation` prop (always a modal). Delete `app/(app)/(tabs)/viya.tsx`'s old body and the `"tab"` branches.
5. Every "Ask Viya" entry (Discover `askViya`, trip dashboard sparkles, trip create "Ask Viya instead", empty states) pushes `VIYA_ROUTES.ai` with params (`prompt`, `tripId`, `mode`, `returnTo` as today). Close = `router.back()` when `router.canGoBack()`, else `router.replace(getViyaBackRoute(...))` (existing `handleBackPress`, unchanged).

## 3. Shared header options (one place)

Add to `src/components/ui/screen-shell.tsx` and export from `index.ts`:

```ts
export function useShellScreenOptions(): NativeStackNavigationOptions {
  const { palette } = useUITheme();
  return {
    contentStyle: { backgroundColor: palette.canvas },
    headerShown: true,
    headerBackButtonDisplayMode: "minimal",      // glass chevron only, no "Back" text
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerTintColor: palette.ink,
    headerTitleStyle: { color: palette.ink },    // system font and weight, no fontWeight override
    headerLargeTitleStyle: { color: palette.ink },
    ...(Platform.OS === "ios"
      ? { headerTransparent: true, headerLargeStyle: { backgroundColor: "transparent" } }
      : { headerTransparent: false, headerStyle: { backgroundColor: palette.canvas } }),
  };
}
```

`(app)/_layout.tsx` Stack: `screenOptions={useShellScreenOptions()}` and only these per-screen overrides:
- `(tabs)`, `index`: `{ headerShown: false }`.
- `ai`: `{ presentation: "fullScreenModal" }`.
- `trips/new`, `trips/[tripId]/travel-mode`: `{ presentation: "fullScreenModal" }`.
- `onboarding/preferences`: `{ presentation: "fullScreenModal", gestureEnabled: false, animation: "fade" }`.
- Delete the `headerShown: true, title: ...` options on the three `profile/*` screens (titles come from `ScreenShell`) and the `headerStyle`/`headerTitleStyle` block.

No screen sets header colours, fonts or heights itself.

## 4. The shell components

All in `src/components/ui/screen-shell.tsx`, exported from `index.ts`. Feature code never imports `Stack.Toolbar` or sets header options directly.

### 4.1 Types
```ts
export type ShellTitleMode = "large" | "inline";

export interface ShellMenuItem {
  key: string; title: string; icon: IconName;   // Ionicons name; iOS maps through SF_SYMBOL_MAP
  destructive?: boolean; disabled?: boolean; onPress: () => void;
}
export type ShellAction =
  | { type: "button"; key: string; label: string /* a11y label */; icon: IconName; onPress: () => void; disabled?: boolean }
  | { type: "text"; key: string; label: string; onPress: () => void; disabled?: boolean; prominent?: boolean } // "Not now", "Save"
  | { type: "menu"; key: string; label: string; icon: IconName; items: ShellMenuItem[] };

export type ShellLeading = "back" | "close" | "none" | { label: string; icon: IconName; onPress: () => void };

export type ShellState =
  | { kind: "loading"; title: string }
  | { kind: "empty" | "error"; title: string; description: string; icon: IconName; action?: { label: string; onPress: () => void } };
```

### 4.2 `ShellHeader` (header only, renders nothing in the page)
```ts
interface ShellHeaderProps {
  title: string;              // always set; "" only for chat
  titleMode?: ShellTitleMode; // default "inline"
  leading?: ShellLeading;     // default "back" (system back; nothing rendered)
  actions?: ShellAction[];    // 0 to 2, rendered right; order = visual order left to right
  search?: { placeholder: string; onChangeText: (text: string) => void }; // tab roots only (Trips)
}
```
Renders:
- `<Stack.Screen options={{ title, headerLargeTitle: titleMode === "large", headerBackVisible: leading === "back" }} />`.
- iOS, `actions.length > 0`: `<Stack.Toolbar placement="right">` with, per action: `button` → `<Stack.Toolbar.Button icon={sfSymbolFor(icon)} accessibilityLabel={label} onPress disabled />`; `text` → `<Stack.Toolbar.Button onPress disabled variant={prominent ? "prominent" : "plain"}>{label}</Stack.Toolbar.Button>`; `menu` → `<Stack.Toolbar.Menu icon={sfSymbolFor(icon)} accessibilityLabel={label}>{items.map(i => <Stack.Toolbar.MenuAction key icon={sfSymbolFor(i.icon)} destructive disabled onPress>{i.title}</Stack.Toolbar.MenuAction>)}</Stack.Toolbar.Menu>`. These are native glass bar buttons; two buttons share one glass capsule automatically.
- iOS, leading `"close"`: `<Stack.Toolbar placement="left"><Stack.Toolbar.Button icon="xmark" accessibilityLabel="Close" onPress={() => router.back()} /></Stack.Toolbar>`. Custom leading object: same with its icon, label and handler. `"none"`: `headerBackVisible: false`, no left toolbar.
- Android: `options.headerRight = () => <HeaderActions actions={actions} />` and, for `close` / custom leading, `options.headerLeft = () => <HeaderIconButton ... />`. `HeaderIconButton` (module-private): `Pressable` 48×48dp, `android_ripple={{ color: palette.selection, borderless: true, radius: 24 }}`, child `<Icon name size={24} tone="ink" />`, `accessibilityRole="button"`, label. `text` actions: `Pressable` with `AppText variant="headline" tone="accent"`, `minHeight: metrics.minTarget`, `paddingHorizontal: spacing.sm`. `menu`: HeroUI `Menu` anchored to a `HeaderIconButton` (move the `Menu` markup and class names from `TripHeaderActions` in `trip-dashboard-components.tsx` into this file), destructive item text `text-danger`.
- `search`: `<Stack.SearchBar placeholder onChangeText={(e) => search.onChangeText(e.nativeEvent.text)} hideWhenScrolling={false} autoCapitalize="none" />`.
- `sfSymbolFor(name)` = `SF_SYMBOL_MAP[name]`; export `SF_SYMBOL_MAP` lookup from `icon.tsx` if not exported; add any missing mapping (`add`→`plus`, `ellipsis-horizontal`→`ellipsis`, `sparkles`→`sparkles`, `close`→`xmark`, `time-outline`→`clock.arrow.circlepath`, `create-outline`→`square.and.pencil`, `person-add-outline`→`person.badge.plus`). A missing mapping is a build error in review, not a runtime fallback.

### 4.3 `ScreenShell` (header + scroll + footer + states)
```ts
interface ScreenShellProps extends ShellHeaderProps {
  summary?: string;          // the old subtitle / summary; first content line (section 5)
  state?: ShellState;        // when set, replaces children (header stays)
  footer?: ReactNode;        // the screen's ONE primary action, usually a PrimaryButton
  sheets?: ReactNode;        // AppSheets for this screen, rendered after the scroll view
  inset?: boolean;           // default true: children get the 20pt column; false for edge-to-edge carousels
  children?: ReactNode;
}
```
Structure (order matters: the scroll view must be the first native child so the large title collapses):
```tsx
<>
<ShellHeader {...headerProps} />   {/* renders no native view */}
<View style={{ flex: 1, backgroundColor: palette.canvas }}>
  <ScrollView
    contentInsetAdjustmentBehavior="automatic"   // clears transparent header, tab bar and home indicator on iOS
    automaticallyAdjustsScrollIndicatorInsets
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode="interactive"
    showsVerticalScrollIndicator={false}
    contentContainerStyle={{
      flexGrow: 1,
      paddingTop: titleMode === "large" ? spacing.sm : spacing.lg,
      paddingBottom: footer ? spacing.xl : spacing["2xl"] + (Platform.OS === "android" ? insets.bottom : 0),
    }}
  >
    {summary ? <AppText variant="subhead" tone="secondary" style={{ paddingHorizontal: spacing.screen, marginBottom: spacing.lg }}>{summary}</AppText> : null}
    {state ? <ShellStateView state={state} /> : (
      <View style={{ gap: spacing.section, paddingHorizontal: inset ? spacing.screen : 0 }}>{children}</View>
    )}
  </ScrollView>
  {footer && !state ? <ShellFooter>{footer}</ShellFooter> : null}
  {sheets}
</View>
</>
```
- `ShellStateView`: `View style={{ flex: 1, justifyContent: "center", paddingHorizontal: spacing.screen }}`; loading → `<LoadingState title />`; empty/error → `<EmptyState title description icon action />`. Error action label is always "Try again" when provided.
- `ShellFooter`: `View style={{ backgroundColor: palette.canvas, gap: spacing.sm, paddingHorizontal: spacing.screen, paddingTop: spacing.md, paddingBottom: Math.max(insets.bottom, spacing.lg) }}`. Opaque, no hairline, no glass. Holds one `PrimaryButton` (full width) and at most one plain `SecondaryButton` under it.
- No `RefreshControl` (reactive Convex queries). No Reanimated scroll handler.

### 4.4 Exceptions (use `ShellHeader` + own body)
- Chat (`ai`): own `ScrollView` + composer; `ShellHeader` only (section 7, row "ai").
- Any screen whose body is a map or full-bleed media in future: `ShellHeader` + own body. Today: none.

### 4.5 Delete when the migration lands
`src/components/ui/screen-header.tsx` (`ScreenHeader`, `CollapsingScreen`) and their `index.ts` exports and DESIGN.md rows; `ModuleScreen`, `ModuleState`, `ModuleLoading`, `ModuleMissing`, `ModuleFooter`, `NavBackButton` in `trip-module-ui.tsx`; `src/features/trips/trip-module-floating-bar.tsx`; `ModuleScroll`, `ModuleTitle`, `MODULE_BOTTOM_PADDING` in `module-kit.tsx`; `GlassTrigger` and the header `Menu` in `trip-dashboard-components.tsx`; `CenteredState` in `trip-dashboard-screen.tsx`; `metrics.navBarHeight`, `metrics.tabBarHeight`, `metrics.tabSlot` once `grep -rn "navBarHeight\|tabBarHeight\|tabSlot" src app` is empty. `GlassIconButton` stays (floating controls over photos only); it must no longer appear in any header.

Transitional rule for the builder of section 4: first re-implement `ModuleScreen` (same props) as a thin wrapper over `ScreenShell` (`title`, `titleMode: "inline"`, `actions` from `trailing`, `footer`, drop `subtitle`), so every module switches at once; then migrate call sites to `ScreenShell` directly and delete the wrapper in the same change.

## 5. Header content rules

1. The header holds the title, the back or close control and at most two actions. Nothing else: no subtitle, no trip name, no step counter, no avatar.
2. Title text: the screen's noun, sentence case, one to two words ("Budget", "Bookings", "Travelers", "Day 2", "Appearance"). Tab roots: the tab name. Trip dashboard: the trip title (may be long; the large title wraps to two lines on iOS, truncates inline).
3. Subtitle: there is none in the header. What used to be a subtitle or `ModuleTitle summary` becomes `summary`: one `subhead` secondary line, the first line of content, 16pt above the first section. Use it only for a fact that is not repeated below (Moments: "12 moments, 3 highlighted"; Day: the date "Tue 14 Jan"; Create flow: "Step 2 of 3"). Most screens have none.
4. Trip-name context rule: the trip name appears only as the trip dashboard title. Module screens never repeat it (header, summary or first row): they are always reached from that trip, and swipe-back shows it. Exception: Travel mode (a cover reachable from a notification later) uses `summary={trip.title}`.
5. Actions: an add action is `{ type: "button", icon: "add", label: "Add <thing>" }`, always the rightmost. Overflow is one `menu` with `icon: "ellipsis-horizontal"`, placed left of add. Show the add button only when the list has items; the empty state carries its own action (current behaviour, keep).
6. Back: the system back (iOS glass chevron, Android arrow). Never a custom back button. Modals use `leading: "close"` (xmark) on the left.

## 6. Spacing (tokens only)

| Measure | Value |
|---|---|
| Horizontal inset of all content, summary, footer | `spacing.screen` (20) |
| Header bottom to first content, large title | `spacing.sm` (8) |
| Header bottom to first content, inline title | `spacing.lg` (16) |
| Summary line to first section | `spacing.lg` (16) |
| Between sections (ListGroups, blocks) | `spacing.section` (24) |
| Inside a section: header to group, group to footer note | owned by `ListGroup` / `SectionHeader`; no extra margins |
| Last content to scroll end | `spacing["2xl"]` (32) without footer, `spacing.xl` (24) with footer |
| Footer | top `spacing.md`, bottom `max(safe area, spacing.lg)`, gap `spacing.sm` |
| Sheet content | per DESIGN §9: `SheetHeader`, then `paddingHorizontal: spacing.screen`, bottom `max(insets.bottom, spacing.lg)` |

Feature screens must not add `paddingTop`, `paddingHorizontal` or `paddingBottom` to their root content; the shell owns them. A section that must go edge to edge (carousel) uses `inset={false}` on the shell and pads its own header with `spacing.screen`.

Primary action placement: one per screen, in `footer` (Itinerary day "Add stop", Recap "Share recap", dashboard "Open Travel Mode" while traveling). Adds that are list growth go in the header (`add`). Never both a footer button and a header add for the same thing.

Sheets: create and edit tasks open `AppSheet` with `SheetHeader` (close left, confirm right). Navigation (settings, details) is a push, never a sheet. One sheet at a time, passed through `sheets`.

## 7. Migration map (every screen)

| Route | Feature file | Title / mode | Leading | Actions (right) | Summary | Footer | Notes |
|---|---|---|---|---|---|---|---|
| `(tabs)/(discover)/index` | same | "Discover" / large | none (root) | none | none | none | `inset={false}`; TABS-SPEC 2 |
| `(tabs)/(trips)/trips` | same | "Trips" / large | none | button `add` "New trip" | none | none | `search` "Search trips"; TABS-SPEC 3 |
| `(tabs)/(vault)/vault` | same | "Vault" / large | none | none | none | none | TABS-SPEC 5 |
| `(tabs)/(profile)/profile` | same | "Profile" / large | none | none | none | none | TABS-SPEC 4 |
| `trips/[tripId]/index` | `trip-dashboard-screen.tsx` | `trip.title` / large | back | button `sparkles` "Ask Viya about this trip"; menu `ellipsis-horizontal` "More trip options": Edit trip, Add to/Remove from favorites, Archive (disabled when archived), Delete trip (destructive) | none (TripHero shows destination and dates) | "Open Travel Mode" when traveling | Loading → `state loading "Loading trip"`; missing → `state empty` "This trip is no longer available" with "Back to trips" (`router.replace(VIYA_ROUTES.trips)`). Edit sheet via `sheets`. `TripHeaderActions` becomes a hook `useTripHeaderActions(model)` returning `{ actions, sheet }`. |
| `trips/[tripId]/itinerary` and `places` | `trip-itinerary-screen.tsx` (`TripItineraryScreen`) | "Itinerary" / inline | back | button `add` "Add place" | none | none | `Segmented` Days/Places is the first child. Drop `subtitle={trip.title}`. |
| `trips/[tripId]/itinerary-day` | same file (`TripItineraryDayScreen`) | "Day N" / inline | back | none | the day's date | "Add stop" / "Plan this day" | |
| `trips/[tripId]/budget` | `trip-budget-screen.tsx` | "Budget" / inline | back | button `add` "Add expense" (when expenses exist) | none | none | `BudgetFigure` is the first child. |
| `trips/[tripId]/bookings` | `booking-hub-screen.tsx` | "Bookings" / inline | back | button `add` "Add booking" | none | none | |
| `trips/[tripId]/readiness` | `readiness-screen.tsx` | "Readiness" / inline | back | button `add` "Add item" (label was "Add") | none | none | |
| `trips/[tripId]/risks` | redirect to readiness | n/a | | | | | unchanged |
| `trips/[tripId]/vault` | `trip-vault-screen.tsx` | "Vault" / inline | back | button `add` "Add file to vault" | none | none | |
| `trips/[tripId]/notes` | `trip-notes-screen.tsx` | "Notes" / inline | back | button `add` "Add trip note" | none | none | |
| `trips/[tripId]/companions` | `trip-companions-screen.tsx` | "Travelers" / inline | back | button `person-add-outline` "Add companion" | none | none | |
| `trips/[tripId]/moments` | `trip-moments-screen.tsx` | "Moments" / inline | back | button `add` "Add moment" (when moments exist) | "N moments, M highlighted" (when any) | none | Remove `TripModuleScreenFrame`, `ModuleScroll`, `ModuleTitle`. |
| `trips/[tripId]/wrapped` | `trip-recap-screen.tsx` | "Recap" / inline | back | none | none | "Share recap" | |
| `trips/[tripId]/travel-mode` | `trip-travel-mode-screen.tsx` | "Today" / inline | close ("Close Travel Mode") | none | `trip.title` | none | fullScreenModal; loading/missing via `state`. |
| `trips/new` | `manual-trip-create-screen.tsx` | step title / inline | step 0: close; later: custom `{ icon: "chevron-back", label: "Back", onPress: onBack }` | none | "Step N of M" | existing Continue/Create footer → `footer` | Delete the hand-built bar and the in-scroll `largeTitle`. |
| `onboarding/preferences` | `preference-onboarding-screen.tsx` | step title / inline | step 0: none; later: custom back | text "Not now" | "N of M" | existing Continue footer | Delete the hand-built bar (`minHeight: 56`, `minWidth: 72`). Keep `KeyboardAvoidingView` outside `ScreenShell` only if the footer is covered by the keyboard on device. |
| `ai` | `viya-chat-screen.tsx` | "" / inline, `ShellHeader` only | close | button `time-outline` "Conversations", button `create-outline` "New conversation" | none | composer (own) | Delete the custom top row (lines ~887-919) and `paddingTop: insets.top + spacing.sm`. Chat `ScrollView` gets `contentInsetAdjustmentBehavior="automatic"`. Composer and keyboard handling unchanged. |
| `(tabs)/viya` | launcher | n/a | | | | | section 2.2 |
| `profile/appearance` | same | "Appearance" / inline | back | none | none | none | Replace raw `ScrollView` with `ScreenShell`. |
| `profile/travel` | same | "Travel preferences" / inline | back | none | none | none | Loading → `state`. |
| `profile/travel-option` | same | `group.title` / inline | back | none | none | none | Unknown key → `state empty`. Remove its `<Stack.Screen>`. |
| `+not-found` | same | "Not found" / inline | back | none | none | none | `state empty` "Page not found", action "Back to trips". |
| `(auth)/*` | unchanged | | | | | | Out of scope. |

## 8. Android

Same structure and the same `ScreenShell` calls. Differences are inside the shell only: Material top app bar (title left-aligned, 64dp, `palette.canvas` background, no elevation), system back arrow and predictive back, no large title (both modes render the same app bar; this is the Material equivalent), header actions as 48dp ripple icon buttons via `headerRight`, overflow as a HeroUI `Menu`, search as the native-stack app-bar search (`headerSearchBarOptions`). Content insets come from `useSafeAreaInsets()` where iOS uses `contentInsetAdjustmentBehavior`.

## 9. DESIGN.md edits in the same change

- §3: replace the `ScreenHeader` / `CollapsingScreen` row with `ScreenShell` (`title`, `titleMode`, `leading`, `actions`, `search`, `summary`, `state`, `footer`, `sheets`, `inset`) and `ShellHeader` (header only, for chat). Add `useShellScreenOptions`.
- §6 rows "Back and navigation" and "Large title": native stack header on both; large title only on tab roots and the trip dashboard.
- §7: add "Every screen uses `ScreenShell`. Pushed screens use an inline title. Header holds title, back or close and at most two actions. Subtitles live in content as `summary`. Chat is a full-screen cover; the Ask Viya tab opens it and returns to the previous tab."
- §5 metrics: remove `navBarHeight`, `tabBarHeight`, `tabSlot` when deleted.

## 10. Build order for Sonnet agents

1. Agent A (blocking): `screen-shell.tsx` (sections 3, 4), `(app)/_layout.tsx` options, `ModuleScreen` as a temporary wrapper, SF mappings. Verify Budget and Itinerary on device.
2. Agent B (after A): route moves and per-tab Stacks (section 2), launcher (2.2), route constants, chat header (row "ai"). Tab screens adopt `ScreenShell` (TABS-SPEC).
3. Agents C and D in parallel (after A): C migrates dashboard, itinerary, day, travel mode, create flow, onboarding; D migrates budget, bookings, readiness, vault, notes, companions, moments, recap, profile pushes, not-found. Then delete section 4.5 items.

Each agent: `npx tsc --noEmit`, `npx ultracite check <touched files>`, `bun test apps/native` (update contract tests that assert old header markup), device screenshots light and dark.

## 11. Acceptance (screenshots, iPhone, light and dark)

- [ ] Budget, Bookings, Readiness, Vault (trip), Notes, Travelers, Moments, Recap, Itinerary, Day: one header row each with the glass back chevron at the left, the title centred inline, the add button (if any) at the right. No large title, no subtitle under the bar, no trip name anywhere.
- [ ] Overlaying any two of those screenshots: back button, title baseline and the top of the first content block sit at the same y (within 1pt).
- [ ] Trip dashboard: back chevron in the bar, large trip title below it that collapses to inline on scroll; sparkles and ellipsis share one glass capsule at the right; ellipsis opens a native menu with Delete trip in red.
- [ ] Tab roots: large title, no back; collapses on scroll; tab bar visible.
- [ ] No tab bar on: dashboard, every module, trips/new, travel mode, chat, profile pushes, not-found.
- [ ] Tap the Ask Viya tab from Trips: chat covers the screen with no tab bar; close returns to Trips with Trips selected. Same from Discover, Vault, Profile.
- [ ] Ask Viya from the trip dashboard: chat covers; close returns to the dashboard.
- [ ] Swipe back from the left edge works on every pushed screen; the title animates with it.
- [ ] Content left edges align at 20pt on every screen; first content sits 16pt under inline headers and 8pt under large titles.
- [ ] `grep -rn "CollapsingScreen\|ScreenHeader\|TripModuleScreenFrame\|ModuleScroll\|ModuleTitle\|NavBackButton\|insets.top" app src` returns nothing outside `screen-shell.tsx` (and `app-sheet.tsx` / `feedback.tsx` if they use it for overlays).
- [ ] Android emulator (if available): same screens with Material app bar and system back; otherwise state not verified.
