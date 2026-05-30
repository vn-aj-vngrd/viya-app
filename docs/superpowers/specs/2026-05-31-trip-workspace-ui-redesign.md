# Trip Workspace UI Redesign

**Date:** 2026-05-31
**Scope:** All trip workspace module screens

## Problem

The trip workspace applies Surface/card wrappers and colored accent-background badges indiscriminately — to non-clickable summary blocks, single-item containers, section headers, and status chips alike. This creates visual noise, inconsistency between screens, and makes the UI feel heavy. Add and edit actions are also scattered and inconsistent across screens.

## Design Rules (applied uniformly)

### Cards and Surface

- Use `Surface` / card shell **only** when an element is **both clickable and repeated** (module tiles, day row cards, file cards, booking cards, category cards).
- Never wrap non-clickable content blocks in a `Surface` (stats, overviews, budget summaries, score displays, form sections).
- Card backgrounds are always `bg-white` or `bg-surface` — no tinted `rgba(...)` fills.

### Chips and Badges

- All chips/badges: **white background**, `border border-border`, accent color on text and icon only.
- Remove all `accent.bg` (`rgba(...)` fills) from badge/chip backgrounds everywhere.
- Module icon containers (the rounded squares inside module tiles): `bg-surface-secondary`, icon keeps its accent color.

### Section Layout

- Sections use **vertical spacing + `Text.Heading` label only** — no `border-t`, no background wrapper.
- Replace every `border-border border-t py-4` pattern with `gap-5` spacing and a heading.

### Add Actions

- Every screen with a create action gets a `NavigationIconButton icon="add"` in the `headerAction` slot of `TripModuleScreenFrame`.
- Pressing it opens the relevant bottom sheet.
- Remove inline "Add" buttons from within the content body where the header `+` replaces them.

### Edit / Delete Actions

- Every repeated row item gets an `ellipsis-horizontal` overflow `Menu` on the right side of the row.
- This replaces standalone inline edit/delete icon buttons in row headers and row footers.
- Menu options stay the same (Edit, Delete, and any contextual actions like Open Maps, View Booking).

### Floating Bar

- No changes to `TripModuleNavigationBar` or the Viya button.

---

## Per-Screen Changes

### Dashboard Overview (`trip-dashboard-components.tsx`)

| Element | Current | New |
|---|---|---|
| `WorkspaceModuleTile` icon container | `backgroundColor: accent.bg` | `bg-surface-secondary` |
| `WorkspaceModuleTile` value badge | `backgroundColor: accent.bg`, accent text | white bg + `border border-border`, accent text only |
| `ModuleLauncherTile` icon container | `backgroundColor: accent.bg` | `bg-surface-secondary` |
| `ModuleLauncherTile` value badge | `backgroundColor: accent.bg`, accent text | white bg + `border border-border`, accent text only |
| `TripHero` metrics row | `border-border border-t pt-4` | `gap-4` no border |
| `Section` component | `border-border border-t py-4` | `gap-5`, heading only |
| `InfoRow` | `border-border border-t py-3` | `gap-3` no border, `py-1.5` |
| `EmptyCopy` icon | `color="#8E8E93"` on plain icon | no change (icon is fine, just no background) |

### Itinerary List Screen (`TripItineraryScreen`)

| Element | Current | New |
|---|---|---|
| `ItineraryDaySurface` | `rounded-[28px] border border-border bg-white p-4` | no change — keep (clickable + repeated) |
| Day number circle | `backgroundColor: rgba(10,132,255,0.1)` | `bg-surface-secondary` |
| `ItineraryMetaPill` (all tones) | colored `rgba()` fill backgrounds | white bg + `border border-border`, accent/warning/muted on icon+text |

### Itinerary Day Detail Screen (`TripItineraryDayScreen`)

| Element | Current | New |
|---|---|---|
| Stop list outer wrapper | `rounded-[28px] border border-border bg-white p-4` | removed — flat rows only |
| Stop rows | no separators (inside card) | `border-border border-b` on each row except last |
| `ItineraryTimelineNode` pending/default circle | `rgba(10,132,255,0.1)` fill | `bg-surface-secondary` |
| `ItineraryTimelineNode` completed | green fill + checkmark | unchanged |
| Day header edit/delete buttons | separate pencil + trash `Pressable` buttons | single `ellipsis-horizontal` overflow menu (Edit day, Delete day) |
| Day header add button | blue filled circle `+` `Pressable` | unchanged — stays as explicit action |
| `EmptyPlannedDayContent` | `bg-surface-secondary rounded-[24px]` wrapper | remove wrapper, render content with gap only |

### Budget Screen (`trip-budget-screen.tsx`)

| Element | Current | New |
|---|---|---|
| `BudgetOverviewCard` | `Surface rounded-[30px] bg-surface-secondary` | no Surface — render inline with `gap-3` |
| Budget icon badge | `backgroundColor: budgetAccentBackground` | `bg-surface-secondary` |
| Budget status chip | `backgroundColor: budgetAccentBackground` | white bg + `border border-border`, accent text |
| Inner progress row box | `rounded-[20px] bg-surface px-3 py-2.5` | remove rounded wrapper — progress bar + labels inline |
| Budget editor form | `Surface rounded-[26px] border border-border bg-surface p-5` | no Surface — render with `gap-4` |
| Expense list outer wrapper | `Surface overflow-hidden rounded-[30px] border border-border bg-surface` | removed — rows already self-separate with `border-b` |
| `ExpenseRow` edit/delete | inline small buttons at row bottom | `ellipsis-horizontal` overflow menu at row right |
| `SectionTitle` icon | accent color | `mutedColor` |
| Section borders | `border-t` | removed, use `gap-6` |

### Vault Screen (`trip-vault-screen.tsx`)

| Element | Current | New |
|---|---|---|
| `VaultPreviewCard` | card shell | unchanged — keep (clickable + repeated) |
| Add button | `NavigationIconButton` in header | unchanged |
| Upload/status feedback block | `rounded-[24px] bg-surface-secondary p-4` | remove Surface wrapper, render inline |
| Edit / Delete | inline `Button` components at card bottom | move to `ellipsis-horizontal` overflow menu at card top-right |

### Readiness Screen (`readiness-screen.tsx`)

| Element | Current | New |
|---|---|---|
| Score/summary card at top | `Surface rounded-[30px] bg-surface-secondary p-4` | no Surface — render inline |
| `ReadinessCategoryCard` | card shell with `bg-surface-secondary` count chip | keep card unchanged; add `border border-border` to the count chip |
| `ReadinessItemRow` edit/delete | inline separate icon buttons | `ellipsis-horizontal` overflow menu per row |
| Add button | missing | add `NavigationIconButton icon="add"` to `headerAction` |

### All Other Module Screens (Bookings, Companions, Notes, Places, Moments, Risks, Travel Mode)

Apply the same rules:
- Remove `Surface` from non-clickable/non-repeated sections.
- Replace section `border-t` dividers with gap + `Text.Heading`.
- Move row edit/delete to `ellipsis-horizontal` overflow menu.
- Add `NavigationIconButton icon="add"` to `headerAction` wherever a create action exists (currently buried in content body or missing).

---

## What Stays Unchanged

- `ItineraryDaySurface` day row cards (clickable + repeated)
- `VaultPreviewCard` file cards (clickable + repeated)
- `ModuleLauncherTile` / `WorkspaceModuleTile` card shells (clickable + repeated) — only the internals change
- `TripModuleNavigationBar` floating bar and Viya button
- `TripModulesSheet` workspace bottom sheet
- All bottom sheet form layouts
- Active tab fill in `TripTabPicker` (filled accent = selected state, intentional)
- Completed `ItineraryTimelineNode` (green fill is semantic, not decorative)

---

## Implementation Order

1. `trip-dashboard-components.tsx` — core shared components (`Section`, `InfoRow`, `WorkspaceModuleTile`, `ModuleLauncherTile`, `TripHero`)
2. `trip-itinerary-screen.tsx` — `ItineraryMetaPill`, day list cards, day detail flat rows, day header ellipsis
3. `trip-budget-screen.tsx` — overview card, expense rows, section layout
4. `readiness-screen.tsx` — score card, item row ellipsis, add button
5. `trip-vault-screen.tsx` — status block, confirm VaultPreviewCard ellipsis
6. Remaining module screens — apply rules as needed
