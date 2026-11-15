# Tabs spec: tab bar, Discover, Trips, Vault, Profile

Status: decided (Opus), revision 2 (2026-11-15), to be built by Sonnet agents after SHELL-SPEC step 1 (`ScreenShell`) lands. Scope `apps/native` only, existing Convex functions only, no backend changes. Where this and `UX-PLAN.md` disagree, this wins. Header, route and chat rules come from `docs/ux/SHELL-SPEC.md`; motion from `docs/ux/MOTION-SPEC.md`. Do not commit.

What is already built from revision 1 (keep, do not rebuild): icon-only `NativeTabs` with Discover first; `Skeleton`, `SearchField`, `Segmented`, `SwipeableRow`, `ContextMenu`, `ListGroup.separatorInset`, `ListRow.titleLines/subtitleLines`; Discover sections and `DestinationCard`; Trips list with `TripRow`, swipe actions, context menu, segmented scope; Profile as grouped rows with Appearance / Travel preferences pushes and the personal-info sheet. This revision moves all four tab roots onto the native header shell, makes Ask Viya open chat as a cover, and fixes the remaining spacing and clean-up items.

Rules for every section:
- Root of every tab screen is `ScreenShell` with `titleMode="large"` (SHELL-SPEC 4.3). No `CollapsingScreen`, no `GlassIconButton` in headers, no root `paddingTop` / `paddingHorizontal` / `paddingBottom` in the screen (the shell owns them).
- Import UI only from `@/src/components/ui`. Spacing only via `spacing.*`; non-spacing sizes are named constants or `metrics.*`.
- Icons only via `<Icon>` (or `ShellAction.icon`), each name in `SF_SYMBOL_MAP`. No tinted badges, gradients, emoji, exclamation marks.

## 1. Tab bar (`app/(app)/(tabs)/_layout.tsx`)

Routes move into per-tab Stacks (SHELL-SPEC 2): trigger names become `(discover)`, `(trips)`, `(vault)`, `(profile)`, then `viya`.

```tsx
export const unstable_settings = { initialRouteName: "(discover)" };

<NativeTabs
  minimizeBehavior="onScrollDown"
  tintColor={palette.accent}
  labelVisibilityMode="unlabeled"
  backgroundColor={Platform.OS === "android" ? palette.surface : undefined}
  screenListeners={({ route }) => ({ focus: () => rememberContentTab(route.name) })}
>
```

| # | `name` | `tabBarItemAccessibilityLabel` | `sf` default / selected | `md` |
|---|---|---|---|---|
| 1 | `(discover)` | Discover | `safari` / `safari.fill` | `explore` |
| 2 | `(trips)` | Trips | `suitcase` / `suitcase.fill` | `luggage` |
| 3 | `(vault)` | Vault | `wallet.pass` / `wallet.pass.fill` | `wallet` |
| 4 | `(profile)` | Profile | `person.crop.circle` / `person.crop.circle.fill` | `account_circle` |
| 5 | `viya`, `role="search"` | Ask Viya | `sparkles` | `auto_awesome` |

Every trigger keeps `<NativeTabs.Trigger.Label hidden />` and `unstable_nativeProps={{ tabBarItemAccessibilityLabel }}`. `viya` is the launcher (SHELL-SPEC 2.2): tapping it opens chat as a full-screen cover and the bar returns to the previous tab underneath.

Android: Material bottom navigation, icons only, surface background, accent indicator, same order. The launcher behaves the same.

Acceptance:
- [ ] Cold launch lands on Discover; Discover is leftmost with `safari.fill` selected.
- [ ] Four icons Discover, Trips, Vault, Profile, then the separated `sparkles` button. No labels.
- [ ] Tap `sparkles` on Trips: chat covers everything, no tab bar; close: Trips again, Trips selected.
- [ ] VoiceOver reads each tab name.

## 2. Discover (`app/(app)/(tabs)/(discover)/index.tsx`)

Purpose: inspiration only. No greeting, date, stats, trip card or avatar.

Data (unchanged): `useQuery(api.trips.listTrips)` (first-run = no non-demo trips), `useQuery(api.preferences.getCurrentPreferences)` → `getPreferenceSuggestions(preferences ?? {})`, `philippineDestinations`, `useDestinationImages`.

`askViya(prompt)` changes to `router.push({ pathname: VIYA_ROUTES.ai, params: { prompt, fromTab: "(discover)" } })` (was the `viya` tab).

Layout, top to bottom:
- `ScreenShell title="Discover" titleMode="large" inset={false}`. No actions, no summary, no search. The shell's section gap would be 24; Discover overrides to a wider rhythm by wrapping all sections in one `View style={{ gap: spacing["2xl"] }}` (32) as the only child.
1. First-run block (first-run only), `paddingHorizontal: spacing.screen`, gap `spacing.lg`: a `View` (gap `spacing.xs`) with `AppText variant="heading" accessibilityRole="header"` = `suggestions.home.title` and `AppText variant="callout" tone="secondary"` = `suggestions.home.subtitle`; then `PrimaryButton label="Plan a trip" icon="sparkles"` → `askViya(primaryPrompt)`. The only primary action. Not shown once the user has a trip.
2. "Closer to home": `DiscoverSection inset={false}` + `DestinationCarousel` of `philippineDestinations`.
3. "Abroad": same with `suggestions.countrySuggestions`; hidden when empty.
4. "Trip ideas": `DiscoverSection` (inset) with one `ListGroup` of `exploreIdeas.slice(0, 4)`: `ListRow title subtitle subtitleLines={2}`, no leading icon, chevron, `accessibilityLabel="Ask Viya about <title>"`.

`DiscoverSection`: header row `paddingHorizontal: spacing.screen`, `SectionHeader title` only; gap header-to-content `spacing.md`; content padded by `spacing.screen` when `inset`. `DestinationCarousel`: `contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.screen }}`, snap to `DESTINATION_CARD_WIDTH + spacing.md`. `DestinationCard`: 240 wide, image 160 tall, `radius.card`, `palette.fill` placeholder with `image-outline`, `expo-image transition={motion.duration.normal}`; under it on the canvas `headline` country (1 line) and `subhead` secondary detail (1 line), `gap: spacing.sm` between image and text block. No card behind text.

States: loading → `ScreenShell` with the same title and `DiscoverSkeleton` as children (two blocks: title bar 140×22, two image skeletons 240×160 + 120×16 lines; `accessibilityRole="progressbar"`, label "Loading Discover"). No empty state (static carousel always present). Image failure keeps the placeholder. Query errors go to the route error boundary.

Delete: any remaining `Reveal` wrapper whose index exceeds 3; `contentStyle` constant and `paddingTop`/`paddingBottom` in the screen (shell owns them); the `"/(app)/(tabs)/viya"` push.

Acceptance:
- [ ] Large "Discover" title with nothing at the right; collapses to inline on scroll; tab bar minimises.
- [ ] With trips: first content is "Closer to home", 8pt under the title; second card peeks at the right edge.
- [ ] Without trips: heading, one line, one blue "Plan a trip" button, then Closer to home.
- [ ] Sections 32pt apart; all section titles and text start 20pt from the left.
- [ ] Tapping a card opens chat as a cover with the prompt filled; closing returns to Discover.

## 3. Trips (`app/(app)/(tabs)/(trips)/trips.tsx`)

Purpose: a clean iOS list (Mail / Notes style): native search in the header, one segmented scope, one inset grouped list.

Data (unchanged): `usePaginatedQuery(api.trips.searchTrips, { filters, search }, { initialNumItems: 12 })`, scopes `all` / `upcoming` (`["upcoming","traveling"]`) / `past` (`["completed"]`), `useDeferredValue(search.trim()) || undefined`, mutations `toggleTripFavorite`, `archiveTrip`, `deleteTrip`.

Layout, top to bottom:
- `ScreenShell title="Trips" titleMode="large" actions={[{ type: "button", key: "new", icon: "add", label: "New trip", onPress: openNewTrip }]} search={{ placeholder: "Search trips", onChangeText: setSearch }}`.
- Delete the in-content `SearchField` block (the native header search bar replaces it; it sits under the large title and stays visible, `hideWhenScrolling={false}`). Keep the `SearchField` primitive for future in-content use.
1. `Segmented accessibilityLabel="Show trips"` All / Upcoming / Past. First child, no wrapper padding.
2. The list (next child, the shell's 24pt section gap above it): `ListGroup separatorInset={spacing.lg + metrics.thumbnail + spacing.md}` of `TripRow` (existing `src/features/trips/trip-row.tsx`: `SwipeableRow` → `ContextMenu` → `ListRow` with 56pt thumbnail, 1-line title, 1-line "Destination · dates" subtitle, countdown `value`, favorite `heart` 13pt trailing).
3. Pagination: `SecondaryButton variant="plain" label="Show more"` under the group, `gap: spacing.md`, only when `CanLoadMore` / `LoadingMore`.

Remove from the screen: the wrapper `View`s with `paddingHorizontal`/`paddingTop`, `contentContainerStyle`, the `GlassIconButton` trailing.

Interactions (unchanged from revision 1): tap pushes the dashboard (tab bar disappears); swipe right Favorite (accent); swipe left Archive (neutral, hidden when archived) and Delete (danger, outermost, confirm "Delete trip"); long press native context menu with the same; search filters as you type; scope change keeps rows mounted (no entrance replay); deletion uses `layoutReflow` + `fadeOut`.

States: first page loading → 4 skeleton rows in a `ListGroup` (segmented stays usable); first-run empty → `EmptyState` "No trips yet" / "Plan a trip by hand or ask Viya." / "New trip"; scope empty → "No upcoming trips" / "No past trips" with "Show all trips"; search empty → "No matching trips" / "Try another trip name or destination." with "Clear search" (clearing must also clear the native field: keep a `ref` to `Stack.SearchBar` and call `ref.current?.clearText()`; if the ref is not exposed through `ShellHeader`, add `searchRef` to the `search` prop). Mutation errors toast; query errors go to the boundary.

Android: app-bar search icon expands the field; `+` is a 48dp ripple icon; no context menu (swipe and accessibility actions cover it).

Acceptance:
- [ ] Large "Trips", a single glass `+` at the top right, the system search field under the title.
- [ ] Segmented All / Upcoming / Past 8pt under the search field; list 24pt below it.
- [ ] One inset grouped list; dividers start at the text; no chips, pills, readiness or budget lines.
- [ ] Swipe left: grey Archive and red Delete with white icon and label; swipe right: blue Favorite.
- [ ] Long press: native menu Favorite, Archive, Delete (red).
- [ ] Tap a trip: dashboard with no tab bar; swipe back returns to Trips with the search text intact.
- [ ] Largest Dynamic Type: titles truncate, nothing overlaps.

## 4. Profile (`app/(app)/(tabs)/(profile)/profile.tsx`): iOS Settings

Purpose: identity row, grouped settings rows that push, sign out last.

Layout, top to bottom:
- `ScreenShell title="Profile" titleMode="large" sheets={<PersonalInfoSheet .../>}`. Remove the inner `View` with `gap`/`paddingHorizontal` and the `contentContainerStyle` (shell provides 20pt inset and 24pt section gap).
1. `ListGroup` (no header): one `ListRow` with `ProfileAvatar size={AVATAR_ROW_SIZE /* 56 */}`, `title={displayName}` (1 line), `subtitle={primaryEmail}` (1 line), chevron, opens the personal-info sheet. `accessibilityLabel="<name>, edit name and photo"`.
2. `ListGroup header="Preferences"`: "Travel preferences" (`value` = one travel-style label) → push `/(app)/profile/travel`; "Appearance" (`value` System/Light/Dark) → push `/(app)/profile/appearance`. Leading `RowIcon`: `Icon size={20} tone="secondary"` in a `View` of width `spacing.xl`, centred. No coloured squares.
3. `ListGroup header="About"`: "Version" with `value`, no chevron.
4. `ListGroup footer="Signing out only affects this device."`: red "Sign out" (`destructive`, no chevron, no icon); `ActivityIndicator` trailing while signing out; confirm "Sign out" / "You will need to sign in again on this device." / destructive.

Pushes (SHELL-SPEC 7): `profile/appearance` → `ScreenShell title="Appearance"` inline, one `ListGroup footer="System follows your device setting."` with System / Light / Dark rows and an accent `checkmark` on the selected one. `profile/travel` → `ScreenShell title="Travel preferences"`, one `ListGroup header={category}` per category, rows push `travel-option`; loading via `state`. `profile/travel-option` → `ScreenShell title={group.title}`; single choice shows a checkmark and stays on screen (Settings behaviour); multi choice footer "Choose any that apply."; unknown key via `state empty` "Preference not found". These pushes show no tab bar (they are `(app)` Stack routes; Van's rule wins over iOS Settings here).

Personal-info sheet: unchanged from revision 1 (`AppSheet` + `SheetHeader` with Save, 88pt avatar, "Change photo" plain button, First/Last name rows in one group).

Acceptance:
- [ ] Large "Profile"; identity row first, 8pt under the title.
- [ ] PREFERENCES, ABOUT, then a group with red Sign out and its footer; groups 24pt apart.
- [ ] Appearance and Travel preferences push with an inline title, system back, no tab bar.
- [ ] Identity row opens one sheet with exactly one grabber.

## 5. Vault tab (`app/(app)/(tabs)/(vault)/vault.tsx`)

- `ScreenShell title="Vault" titleMode="large"`; loading `state={{ kind: "loading", title: "Loading vault" }}`; no trips → `state` empty "No documents yet" / "Create a trip to keep its bookings and documents in one place." / "Create trip".
- One `ListGroup header="Trips" footer="Confirmations, receipts and IDs, kept with each trip."` of rows: leading `Icon file-tray-full-outline size={22} tone="secondary"`, `title` trip title, `subtitle` destination, chevron → `VIYA_ROUTES.tripVault(id)`.
- Delete `EMPTY_MIN_HEIGHT` and the `contentContainerStyle` (the shell's `state` view centres itself).

## 6. Build split

1. After SHELL-SPEC step 1 and step 2 (routes, launcher): one agent for sections 1, 2, 5; one agent for sections 3 and 4. Each: `npx tsc --noEmit`, `npx ultracite check <files>`, `bun test apps/native`, device screenshots light and dark.
2. To capture Trips or Profile on device: warm deep links `viya-app:///trips`, `viya-app:///profile`, `viya-app:///vault` (cold-launch payloads are dropped; launch first, wait, then send the link).

## 7. Global acceptance

- [ ] `grep -rn "CollapsingScreen\|GlassIconButton" "app/(app)/(tabs)"` returns nothing.
- [ ] `grep -nE "(gap|padding[A-Za-z]*|margin[A-Za-z]*): [0-9]" ` on touched files returns nothing.
- [ ] `grep -rn "(tabs)/viya\|(tabs)/trips\|(tabs)/profile" app src` returns only `_layout.tsx` hits (none, ideally).
- [ ] Every tab root: large title at the same y; first content at the same y.
- [ ] Light, dark, largest Dynamic Type and Reduce Motion checked, or stated unavailable.

## 8. DESIGN.md edits in the same change

§7 Navigation: tab roots use `ScreenShell` large titles in per-tab Stacks; search is the native header search bar (`ScreenShell search`), not an in-content field, on tab roots; Ask Viya is a launcher that opens chat as a full-screen cover; "Add on Trips" is a header `+` toolbar button.
