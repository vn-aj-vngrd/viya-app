# Viya UX Plan (iOS 27 HIG, content first)

Scope: apps/native only. No backend changes; every directive uses existing Convex hooks and routes. This plan restructures flows, placement, hierarchy and copy. Restyling is the smallest part. Tokens, primitives and rules stay as in DESIGN.md. Where a directive conflicts with the current code, the directive wins and DESIGN.md is updated in the same change.

Findings that drive the plan (from the code survey):
- 13 module screens each rebuild a header, metric strip, pill-action row and a second set of "review top X / open top Y / mark top Z" buttons (readiness, risks, bookings, moments, companions). Slop plus decision overload.
- The trip dashboard stacks hero, 12-tile "MainModules" grid, autopilot card, quick actions and (hidden) tab picker, with a floating module-menu button and floating Viya button. Three competing navigation systems for the same modules.
- Chat has a custom header (back, sparkle icon, "Chat", action group), a mode selector, a trip-context chip, a "Viya actions" sheet, a composer sheet, an icon-badge empty state, a "Try asking" card and a typing bubble. Heavier than the job.
- Tab bar is Home, Trips, Ask Viya, Profile, with Moments and Vault as hidden tab routes that are only reachable through cards.
- Many screens render their own title with `title: ""` frames, so there is no real collapsing large title or native back swipe consistency (headerShown false everywhere).
- Sheet grabber: AppSheet passes `handleComponent={SheetGrabber}` into HeroUI BottomSheet.Content, whose internal content still resolves a `handleIndicatorClassName` handle. Two grabbers appear when both render. See section 3.0 for the fix and the audit rule.

## 1. Information architecture

### 1.1 Tabs (iOS 27 native tab bar, glass, labels visible, 4 tabs plus a separated search/action role)

| Tab | Route | Contents | Change |
|---|---|---|---|
| Trips | `(tabs)/trips` | Current trip pinned on top, Upcoming, Past. Large title "Trips", native search, "+" in nav bar | Becomes the home tab and the default. Absorbs Home. |
| Discover | `(tabs)/index` | Suggestions only: "For you", countries, places. No trip management | Home renamed and stripped to inspiration. Greeting removed. |
| Vault | `(tabs)/vault` | Cross-trip documents, grouped by trip | Promoted from hidden route to a real tab (it is a daily-use travel need: tickets offline). |
| Profile | `(tabs)/profile` | Account, appearance, travel preferences, sign out | Keep, tighten. |

Remove: the Ask Viya tab. Remove: the hidden Moments tab route (Moments live inside a trip and in Profile as "Memories" only if cross-trip data exists; otherwise delete the file and the card links to it).

Tab order and default: Trips first (opens here after sign-in and cold start; users manage trips far more than they browse ideas). Discover second.

### 1.2 Viya entry points (replaces the tab)

- One glass floating "Ask Viya" button, bottom right above the tab bar, only on Trips and Discover. SF symbol `sparkles`, 56pt circle, `GlassSurface interactive`, label "Ask Viya". It opens chat as a full-screen cover (modal, slides up), because chat is a task with its own composer and must return to its source on dismiss (AQD pattern: "Agent opens full screen and returns to its source").
- Inside a trip: the trip toolbar has one "Ask Viya" glass button (trip context pre-bound, `tripId` param). No second floating button on module screens.
- Contextual entry: every module empty state may offer one "Ask Viya to fill this in" secondary action with a prefilled `prompt` param. No "AI" badges.
- Delete `app/(app)/ai.tsx` duplicate and `(tabs)/viya.tsx`; create `app/(app)/viya.tsx` presented with `presentation: "fullScreenModal"` and `animation: "slide_from_bottom"`.

### 1.3 Navigation model

| Kind | Used for | Presentation |
|---|---|---|
| Push (native stack, real header, large title collapsing, swipe back) | Trip dashboard, every module screen, day detail, recap | `headerShown: true`, `headerLargeTitle` on module list screens, `headerTransparent` + blur/glass only on dashboard hero |
| Sheet (AppSheet, detents) | Create or edit one record (expense, booking, risk, task, note, companion, moment, place), pickers, filters, history, trip context, trip edit | medium for pickers, large for forms |
| Full-screen cover | Chat, create-trip flow, onboarding, auth, Travel Mode | `fullScreenModal` |
| Alert/confirm | Irreversible only (delete trip, sign out) | `useFeedback().confirm`; reversible actions use undo toast |

Global rules:
- Replace `headerShown: false` plus hand-built headers (`TripModuleScreenFrame` header, `ScreenHeader` per screen) with the native stack header via `Stack.Screen options` on every pushed screen. Keep `CollapsingScreen` only for tab roots. Glass back button comes from the system on iOS 26+; the custom `NavigationBackButton` is deleted except on Android where it is the same component styled solid.
- Global actions: New trip is a "+" glass nav button top right on Trips only (also the empty-state primary). Search is native (`headerSearchBarOptions`) on Trips and Vault. Viya is the floating button (1.2). Profile avatar button is removed from tab roots (Profile is a tab).
- No floating module menu on trip screens. Module navigation is the trip dashboard list (3.x) plus a trailing "More" menu to jump sideways.

### 1.4 Renames and merges

- "Ask Viya" tab, "Chat" header text: the feature is "Viya". Button label "Ask Viya", sheet "Conversations".
- Merge `risks` into `readiness` as a section "Heads-up" (risks are alerts to the same readiness question: am I ready). Route stays; Readiness screen has two segments: "To do" and "Heads-up". Delete `RisksTab`/`risks.tsx` header duplication; keep data hooks.
- Merge `places` and `itinerary` into one screen "Plan" with a segmented control (Days | Saved places). `itinerary-day` stays as detail push. Places saved but unassigned show as "Unplanned" at the end of Days.
- `notes` stays, renamed "Notes". `companions` renamed "Travelers". `wrapped`/recap renamed "Recap". `moments` renamed "Photos and moments" is dropped; just "Moments".
- Remove the dashboard tab picker and all `*Tab` content components in trip-dashboard-tabs.tsx (`shouldShowTripDashboardFocusSections` is already false: dead code, delete ~1200 lines).

## 2. Cross-cutting directives

1. One scaffold for module screens: `ModuleScreen` (native header, large title = module name, subtitle none, toolbar "+" only if the module has records, content = grouped lists). It replaces `TripModuleScreenFrame` and per-screen metric strips.
2. Metrics: at most one summary line under the title (for example "$1,240 of $2,000") rendered as the first `ListGroup` footer or a single large number. Delete multi-metric grids (`BookingMetric`, `ReadinessMetric`, `BudgetSnapshotStat` rows).
3. Delete every "Review top X / Open top Y / Mark top Z / Fix highest-priority gap" action cluster. They are an assistant pretending to be buttons. Replace with: the first unresolved row is simply first in the list with a visible status; one "Next up" row (not button stack) may sit on top of Readiness only.
4. `PillAction`, `ActionPill`, `LinkButton`, `Section`, `EmptyCopy`, local `IconBadge`, `ModuleLauncherBadge` are deleted. Use `ListRow`, `SecondaryButton variant="plain"`, `SectionHeader`.
5. Row anatomy: title, one subtitle line max, trailing value, no chevron if the row is the only tap target of an edit sheet. Swipe trailing: Delete (destructive, with undo toast); swipe leading: the one status toggle (Done, Mitigated, Booked). Long press: context menu (Edit, Open in Maps, Duplicate if existing data supports, Delete). The "..." overflow `Menu` on each card is removed (it is a hidden target on every row).
6. Add: toolbar "+" in the native header only when the list has data; the empty state carries the labeled primary action. Never both visible.
7. Forms: one `RecordSheet` shape: `SheetHeader` (close, title, Save), inset grouped fields, optional fields behind one "More" row, destructive row last. Heroui `Input/TextField/Label` replaced by one `FormField` in `ui` (inset group row, 44pt, label left, value right) so every form looks identical. Keyboard: `scrollDismissesKeyboard` equivalents (`keyboardDismissMode="interactive"`).
8. Dates: one formatter (`date-format-utils`) per AQD: "Fri, Oct 16", ranges "Oct 16 to 20", relative Today/Tomorrow. No ISO dates, no middle dots in copy.
9. Copy: sentence case, no "your trip workspace", no "Viya should", no marketing. Titles are nouns (Budget), buttons are verbs (Add expense).
10. States per screen: Loading = skeleton rows after 300 ms; Empty = one sentence + one action; Error = one sentence + Retry; Offline = banner row "Showing saved data" (readiness/bookings/vault must work offline in Travel Mode).
11. Haptics: selection on toggles and segmented changes, success on save/complete, warning on destructive confirm. Dynamic Type: no fixed heights; rows wrap.
12. Reduce Transparency/Motion: already in GlassSurface; enforce on the new floating Viya button, tab bar and composer.

## 3. Slices

### 3.0 Sheets: the double grabber (fix first)

Cause (to confirm on device): `AppSheet` supplies a custom `SheetGrabber` while HeroUI `BottomSheet.Content` also wires a default indicator via `handleIndicatorClassName`, so a second handle shows on some sheets, and sheets that also open from within a header that draws its own grabber (legacy `SheetHeader grabber` prop) show two.
Directives:
- Repo rule (CLAUDE.md): one handle only, the native or Gorhom handle, never a second custom one. In `AppSheet`, delete the custom `SheetGrabber` and the `handleComponent` override. Keep Gorhom's default handle (`BottomSheetHandle`) styled only through `handleIndicatorStyle` (36x5, `inkTertiary`, 0.55 opacity), and make sure the glass `SheetBackground` draws no handle. That leaves exactly one grabber, owned by Gorhom.
- Remove the deprecated `grabber` prop from `SheetHeader` and all call sites.
- Grep audit rule (add to lefthook): no `BottomSheet.Content`, `handleIndicator`, or `grabber` outside `ui/app-sheet.tsx`. The budget contract test that expects "BottomSheet.Content" is updated to expect `AppSheet`.
- Sheets with title text: `SheetHeader` title is the only title; delete in-sheet `BottomSheet.Title/Description` duplicates (chat sheets use both).
- Detents: pickers `["45%"]`, forms `["88%"]` with `enableDynamicSizing={false}`, history `["60%","92%"]`. Never stack sheets: opening a sheet from a sheet (date picker inside forms, date-picker-field.tsx) becomes an inline expanding row inside the form (native inline date picker), not a second sheet.
- Verify on device: open every sheet from the audit list (trips filter, profile x3, dashboard x4, budget x2, bookings, readiness, risks, vault, chat x4, auth, create trip, date picker) and confirm one grabber.

### 3.1 Chat (Viya) — follow AQD Agent

Target: one full-screen cover. Quiet, almost no chrome.

Top to bottom:
1. Native header (inline, no title text): leading glass "Close" (chevron.down, label "Close") that returns to the source; trailing glass "New conversation" (square.and.pencil) and a "More" menu (ellipsis). More menu sections: Conversations (opens history sheet), then if trip-bound "Trip context", then Delete conversation (destructive, last). Delete `HeaderActionGroup`, sparkle icon, "Chat" label, `ChatModeSelector` (modes: keep the mapping but drop the UI; mode is inferred from `tripId` and slash commands; default `chat`).
2. Message list (opaque canvas, 20pt gutter):
   - Assistant: plain text, full width, no bubble, no avatar, no label. Markdown body via existing `viya-chat-markdown` (headings flattened to semibold body). Delete `TypingBubble` and the shimmer "Viya is thinking" letters; replace with a single quiet row "Thinking" with a small `ActivityIndicator` and, when the backend exposes tool progress, a progress row per step ("Checking your itinerary", checkmark when done) as unboxed one-line rows with SF `checkmark` or spinner, secondary text. Collapses to one line "Used 3 tools" after the reply completes, tappable to expand.
   - User: right-aligned quiet pill, `fill` background (not accent, not glass), 22 radius, max 80% width.
   - Row actions under the last assistant message only: Copy, Retry (failed or last), Good/Bad if the feedback hook exists; icon-only 44pt with labels. Not on every message.
   - Blueprint/trip-creation action: becomes an inline result row "Trip plan ready: Cebu, Oct 16 to 20" with one `PrimaryButton` "Create trip" below the message (replaces `TripBlueprintActionDock`). One primary only.
   - Question options (`QuestionOptionsDock`): rendered inline under the question as a vertical list of plain rows (radio check on the right, "Other" row last) with a Continue button only when multi-select. Not a docked card over the composer.
   - Errors: inline under the failed turn, "Couldn't get a reply" with Retry; never a toast covering the composer. Offline: composer disabled with one line "You're offline".
3. Empty state (new conversation only): vertically centered, one `heading` line ("Where to next?" when no trip, "Planning {trip title}" when trip-bound), one `subhead` secondary line, nothing else. Delete `IconBadge`, `ViyaChatEmptyContent` visual, "Try asking" card. Above the composer: a horizontal row of 3 `Chip`s (suggestion prompts; reuse `promptSuggestions`, title only, no icon, no summary). Chips appear only while the thread is empty and the draft is empty; they send immediately.
4. Composer (the only glass element in the screen besides header buttons): one `GlassSurface` rounded 28, above the keyboard (`KeyboardStickyView`/ existing handling), 8pt side margin, safe area when keyboard hidden. Collapsed: single line "Ask Viya" with leading "+" (menu: Photo, File, Slash tools). Expanded on focus or text: multiline up to 6 lines, trailing circular send button (accent only when sendable; becomes stop square while generating). Remove the expanded full-screen composer sheet (`isComposerSheetOpen`, 220pt expanded input), the "Viya actions" sheet, and the separate trip chip over the composer. Trip context: a single quiet row above the composer text only when trip-bound: "{trip title}" with `xmark` to unbind (tap opens `TripContextSheet`, medium detent).
5. History: `ChatHistorySheet` stays as the only sheet, medium and large detents, grouped Today / Yesterday / Earlier via `ListGroup`, swipe trailing Delete, leading Pin if existing hook supports, context menu Rename/Delete. Search via a plain search field at top of the sheet. Empty: "No conversations yet."
6. Slash menu stays but renders as an opaque list above the composer, 5 items max, no icon badges (monochrome icons only).
7. Behaviour: auto-scroll follows streaming unless the user scrolls up; "Jump to latest" glass round button appears when scrolled up. Haptic light on send, success on reply complete.
8. Copy: placeholder "Ask Viya"; nothing says "AI" or "assistant". Errors: "Couldn't send. Try again."

### 3.2 Home and tabs

**Trips (`(tabs)/trips`)** — the home tab.
- Large title "Trips"; trailing glass "+" ("New trip"). Native search bar in header, collapsing; searches title and destination.
- Filters: one row of Chips under the search (All, Planning, Active, Completed); status filter sheet (`StatusFilterSheet`) deleted; sort in a nav-bar `Menu` (Date, Name) if data supports.
- Content: first section "Now" only if there is an in-progress or next-14-days trip: a single large opaque cover card (the one allowed hero: image full bleed 16:10, title and date range overlaid on a bottom solid scrim, not gradient glass), tap opens the trip. Under it: `ListGroup` rows for the rest, thumbnail 56pt rounded 12, title, "Cebu, Oct 16 to 20", trailing readiness as text ("82%") not a ring. Delete `ReadinessRing`, `TripThumbnail` badges, `TripSeparator`.
- Swipe: trailing Delete (confirm), leading Archive if supported. Context menu: Open, Edit, Duplicate (only if hook exists), Delete.
- Empty first run: heading "No trips yet", line "Plan a trip by hand or ask Viya.", PrimaryButton "New trip", plain "Ask Viya". Filtered empty: "No matching trips" + plain "Clear filters".
- Pagination: keep `usePaginatedQuery`; load more on end; skeleton rows.

**Discover (`(tabs)/index`, formerly Home)**
- Large title "Discover", no greeting, no date subtitle.
- If a current trip exists, do not repeat it here (it is on Trips). If none: one inline row "Start a trip" (PrimaryButton full width, only in empty state).
- Sections as titled horizontal carousels, max three: "Ideas for you", "Countries", "Closer to home". Delete "Places worth exploring" and "Keep exploring beyond X", `PreferenceInsightCard`, `StartPlanningCard`, `PromptCard`, `ReadinessMeter`. A destination card is image plus title plus one line; tap opens a sheet (medium) "Plan {place}" with PrimaryButton "Create trip" (prefills create flow) and plain "Ask Viya".
- Images remain from `use-destination-images`; failed image shows flat `fill` with the SF `map` symbol.

**Vault tab**
- Large title "Vault"; search native. Grouped by trip as `ListGroup` sections (header trip name); rows: document title, type, trailing "Offline" indicator when cached. Tap opens preview; swipe Delete; toolbar "+" opens "Add to vault" sheet (Photo, File, Scan if supported). Empty: "Tickets, confirmations and passports for all your trips." + "Add document" primary. Delete the "Open vault" button page that currently just redirects.

**Profile**
- Large title "Profile". Top: identity row (avatar 64, name, email) as the first `ListGroup` row, tap edits personal info (push, not sheet).
- Groups: "Preferences" (Appearance, Travel preferences as push screens with inline checkmark lists, not sheets), "Notifications" only if existing, "About". Sign out is last, destructive, plain row, confirm via `useFeedback().confirm`. Delete `SignOutConfirmationSheet`, the three `ProfileSheet`s for theme/travel/personal info (use pushes; they are settings, not tasks), `SelectionIndicator` custom (use checkmark).
- Appearance: system, light, dark as three rows with checkmark. Travel preferences: reuse onboarding choices, grouped.
- Copy: "Signing out..." state shown as row spinner.

### 3.3 Auth and onboarding

**Auth (`(auth)/index`)**
- One full-bleed opaque screen: wordmark (`ViyaMark`) top third, one line "Plan trips that run themselves."? No: "Plan, book and travel in one place." (short, factual). Bottom thumb zone: "Continue with Apple" (system button style, first on iOS), "Continue with Google", plain "Use email". Legal line in footnote below. Delete the carousel/hero marketing text and `ON_ACCENT` tinted blocks, any gradient.
- `auth-sign-in-sheet`: email code flow as a medium-to-large sheet, one field per step (email, code), auto focus, PrimaryButton pinned above keyboard, "Resend code" plain with 30s countdown, inline error under field. Android: same structure.
- No "Skip". Loading: button spinner. Errors: inline.

**Onboarding (`preference-onboarding-screen`)**
- Cut 8 questions to 4 screens: Vibe + pace (two single-select groups), Budget comfort, Interests + food (multi-select chips), Companions + needs. Everything is skippable ("Not now" plain top right) because preferences are not required to use the app; but the redirect in `(app)/_layout` that forces onboarding when `preferences` is empty stays (existing behaviour); "Not now" saves defaults via the existing mutation.
- Layout per step: top: native progress as 4 small segments (existing `ProgressSegments` style), large title question, one subhead, options as inset `ListGroup` rows with trailing checkmark (single) or chips (multi). PrimaryButton "Continue" fixed above safe area; last step "Done". Back is the native back; no back button in content.
- Haptic selection on each pick. Delete tinted icon badges per option.

### 3.4 Trips core: create flow and dashboard

**Create trip (`trips/new` and `manual-trip-create-screen`/`sheet`)**
- Presentation: full-screen cover with close. One flow only; delete `manual-trip-create-sheet.tsx` duplicate unless the sheet is used from Discover prefill; if used, it wraps the same step components in large detent (the screen is the source of truth).
- Steps cut from 6 to 3, each one screen with a large title and a bottom PrimaryButton "Next": (1) "Where to?" destination field with suggestions list and a plain "Ask Viya instead" row; (2) "When?" inline range calendar (native), plus "Flexible dates" toggle if the data supports; trip length shown as footer; (3) "Review" grouped list of Destination, Dates, Travelers (stepper), Budget (optional, amount field), Style (optional row to a pick list), Title (prefilled, editable); PrimaryButton "Create trip".
- Travelers, style, pace, budget move behind the Review rows as optional (progressive disclosure), each a pick row or small sheet.
- Generation (`generationSteps` animation): keep as a quiet progress list with real step states; remove fake `stepAdvanceIntervalMs` timers; use the real mutation status if exposed, otherwise one spinner plus "Creating your trip". No progress hero.
- Errors inline per field; disable Next with a reason line ("Add a destination").

**Trip dashboard (`trips/[tripId]/index`)**
- Native pushed screen, header transparent over the cover; large title is the trip title, collapsing; trailing: "Ask Viya" glass button, "More" menu (Edit trip, Share, Archive, Delete last). Replace `TripStickyHeader`, `TripHeaderActionGroup`, `TripFloatingViyaButton`, `TripModuleNavigationBar`, `TripModulesSheet`.
- Top to bottom:
  1. Cover (image 16:10, rounded 20, opaque), under it destination, "Oct 16 to 20", status text (not a pill) in `subhead`.
  2. "Next up": a single row (from `NextBestActionCard` logic) titled by the next best action, one tap. This is the screen's one primary action; if none, hide. During an active trip it becomes "Open Travel Mode" `PrimaryButton`.
  3. `ListGroup` "Plan": Itinerary (value "5 days"), Bookings ("3 of 5 booked"), Readiness ("82%"), Budget ("$1,240 of $2,000"). Each a `ListRow` with monochrome SF symbol leading, chevron.
  4. `ListGroup` "Together": Travelers, Notes, Vault.
  5. `ListGroup` "After": Moments, Recap (shown muted until trip end).
  Delete the 12-tile launcher, `WorkspaceAutopilotCard`, `TripAgentDraftRow` block, `QuickActions`, `MainModules`, `TripHero` metric chips, `TripMetaChip`, module accent colours (`getModuleAccent`). Autopilot drafts surface only as a "Drafts from Viya" row in Plan with a count badge (state, allowed) opening the review sheet.
- Active trip variant: moves Travel Mode to the top as a PrimaryButton; "Today" row shows the current day's next stop.
- Loading: skeleton cover + rows. Not found: `EmptyState` "This trip is no longer available" with "Back to trips".
- Edit trip stays a large-detent sheet using `RecordSheet` pattern; delete moves into More menu with confirm ("Delete trip").

### 3.5 Itinerary, places, travel mode

**Plan (itinerary + places merged)**
- Header large title "Itinerary"; segmented control (glass, native) "Days | Places" under the title. Toolbar "+" ("Add stop" in Days, "Add place" in Places); More menu: Optimize with Viya (Ask Viya prefilled), Open route in Maps, Edit trip dates.
- Days: sticky day headers inside one scroll: "Fri, Oct 16" + "Day 1" + a small total; stops as plain rows with time on the left column (tabular figures), title, location subtitle, trailing category SF symbol. No card per stop, no per-stop overflow menu. Tap opens a stop sheet (view/edit). Swipe trailing: Delete; leading: Move to day (sheet picker). Long press: Open in Maps, View booking, Edit, Delete. Drag to reorder inside the day (long-press drag via existing reorder util if present; otherwise the Edit sheet has time fields only: do not invent reorder).
- Day row group header has a trailing "Add stop" plain button only when the day is empty.
- Places: list of saved places (title, category, distance if known); tap opens place sheet with "Assign to day" (day picker rows) and "Open in Maps". Unassigned places are sorted first with a footer "Assign to a day to add them to your plan."
- Empty: "No stops yet" "Add a stop or ask Viya to draft the days." Actions: PrimaryButton "Add stop", plain "Draft with Viya".
- Stop/place forms: `RecordSheet` (title, location with suggestions, start/end inline time pickers, category as a pick row, cost and notes under "More"). Date picker sheet inside sheet is removed (see 3.0).
- Copy: delete "Plan itinerary days" and "Open route itinerary" pills.

**Travel Mode**
- Full-screen cover (`fullScreenModal`), dark-tolerant, high-contrast, large type, designed for one-handed outdoor use. Header: glass close, trip title inline, trailing offline indicator text.
- Top to bottom: (1) "Now / Next" block: current stop with time, address, large "Directions" PrimaryButton (opens Maps) and plain "Call" or "Open booking" if linked. (2) "Today" list of remaining stops as plain rows. (3) "Quick add" row of three 44pt+ glass? No: three `ListRow`s in a group: "Log expense", "Add note", "Report issue" each opening the compact `RecordSheet` (medium detent). Delete the inline forms (expense form and note form currently live in the screen) so the screen stays a glance view. (4) "Documents" and "Bookings" rows push offline lists; "Daily safe" budget figure as one value row.
- One primary action: "Directions" for the next stop. Everything else is rows.
- States: offline banner "Offline. Showing saved plans." Empty day: "Nothing planned today" + "Add a stop".
- Delete `Daily safe/Bookings/Documents/Risks` four-metric grid; risks appear as one warning row only if there are open high-severity risks.

### 3.6 Modules A: budget, bookings, readiness, risks

**Budget**
- Title "Budget". Top: one large figure "$1,240" with "of $2,000" secondary and a thin native-style progress bar (single accent track, no ring, no gradient); a footer line "$110 a day left" (daily safe). Delete the three stat tiles.
- "By category": `ListGroup` rows with category name, spend value; if no breakdown, hide the group (delete `BudgetEmptyBreakdownActions`).
- "Expenses": `ListGroup` sorted by date with day headers; row: title, category subtitle, trailing amount; swipe Delete (undo toast), context Edit; tap edits.
- Primary: toolbar "+" "Add expense" when list non-empty; empty state primary "Add expense" and plain "Set budget". "Set budget" is also a row at the top group ("Total budget" value, tap edits). Sheets: expense (large? medium with More), budget (medium, 48%).
- Copy: "Spent", "Left", no "snapshot". Currency from trip.

**Bookings**
- Title "Bookings". One summary line "3 of 5 booked" under title as list footer-style text. Segmented: "All | Needs booking | Booked".
- Rows grouped by type (Stay, Transport, Activity): title, date, provider; trailing status as text with SF symbol (checkmark.circle booked, circle needs booking, exclamationmark.triangle issue). Delete `booking-target-card`, `PillAction` clusters, "Review next target / Open next Maps / Open next itinerary / Open next proof / Add next target", metric strip.
- Tap opens a detail sheet (large): status segmented (Needs booking, Booked), details, confirmation proof row (opens vault item), "Open in Maps", Delete last. Swipe leading: Mark booked; trailing: Delete.
- Primary: toolbar "+" ("Add booking"); empty primary "Add booking" plus plain "Import from Vault".
- Copy: "Date / time" becomes two fields "Date" and "Time".

**Readiness**
- Title "Readiness". Top: single big percentage "82%" with line "5 tasks left", plus one "Next up" row (top unresolved task) with a trailing "Mark done" plain button. Delete `readiness-score-card` ring card, metric grid of 5, "Open travel mode / Fix highest-priority gap / Add task" button stack.
- Segmented: "To do | Heads-up | Done". To do: tasks grouped by category (`ListGroup` header = category) with leading checkbox (tap toggles, haptic selection), title, optional due subtitle, owner as trailing initials. Heads-up: the merged risks list: severity as text with an SF symbol ("High"), title, suggested action subtitle; swipe leading "Mitigated", trailing "Dismiss"; tap opens detail sheet with edit.
- Primary: toolbar "+" opens "Add" sheet with a segmented Task or Heads-up (replaces two separate screens/forms).
- Swipe trailing on tasks: Delete; context: Assign, Priority.
- Empty: "You're all set" is wrong tone; use "Nothing left to do" with plain action "Add task". Heads-up empty: "No heads-ups for this trip."

**Risks screen route**: keep route `risks` for deep links but redirect into Readiness with Heads-up segment selected (`<Redirect/>`); delete its UI (933 lines) after moving the detail sheet into readiness.

### 3.7 Modules B: vault, moments, notes, companions, recap

**Trip vault**
- Title "Vault". Native search. `ListGroup` sections by kind (Tickets, Stays, IDs, Other) or flat by date if few; rows: file title, kind, trailing "Linked" text when attached to a booking/readiness item. Tap previews (QuickLook-style full-screen); long press: Rename, Link to booking, Share, Delete.
- Upload: toolbar "+" opens a medium sheet "Add to vault" with three rows (Photo, File, Scan if supported). Upload progress: inline row at the top "Uploading 2 files" with spinner; after extraction, one row "Review changes" (the `tripsync-review-sheet`) with count; sheet remains large with per-item Accept toggles and one PrimaryButton "Apply".
- Empty: "Add tickets and confirmations. Viya reads them and updates your plan." + primary "Add document". Delete `VaultPreviewCard` boxed cards in favour of rows with thumbnail 44pt.

**Moments**
- Title "Moments". Photo grid 3 columns edge to edge (opaque, no cards), grouped by day with sticky day header. Tap opens full-screen viewer with caption, location, day; More menu: Edit, Share, Delete. Toolbar "+" opens source menu (Camera, Photos, Write a note) via `Menu`.
- Delete "Recap board / Trip story" section header, "Review spotlight / Open spotlight Maps / Open spotlight day" clusters. Empty: "Add photos and notes from the trip." + primary "Add moment" (first run). No-photo moments render as text rows.
- Cross-trip `(tabs)/moments.tsx` is deleted.

**Notes**
- Title "Notes". Search. Segmented chips by category (All, Ideas, Decisions, Tasks, per data). Rows: title, first line of body, date; no cards. Tap opens an editor push (full-height `TextArea`, auto-save, title first line) instead of a sheet because notes are writing, not forms. Link-to-item is a "Linked to" row at the bottom. Swipe Delete; context Pin if hook exists.
- Delete "Decision notebook / Trip context" eyebrow header. Empty: "Jot down ideas and decisions." + "New note".

**Travelers (companions)**
- Title "Travelers". `ListGroup` rows: avatar initials (monochrome fill circle, no colour), name, role subtitle, trailing role text; the lead traveler first with "You". Tap opens contact sheet (large): email/phone rows with tap-to-call, role pick row, notes, Delete last. Toolbar "+" "Add traveler" (invite by email if hook exists). Delete "Group coordination" eyebrow and "Review lead / Add lead contact".
- Empty: "Add the people travelling with you." + "Add traveler".

**Recap**
- Title "Recap". Available as soon as trip status is completed; earlier it is muted with "Available after the trip."
- Top: share-able summary as one opaque card (trip title, dates, four numbers in a quiet 2x2: Days, Places, Spent, Photos); PrimaryButton "Share recap" below (the one primary). Then `ListGroup` "Highlights" (top 5 moments), "Wrap-up" checklist (Route and places, Confirmations, Budget outcome) as checkmark rows that navigate to the module when incomplete, then a last group with "Mark complete" / "Archive trip" (destructive style for Archive, with confirm). Delete "Story coverage", "Trip lifecycle" headers, tracked-spend labels.
- Share uses existing `trip-recap-share.ts`; shows system share sheet.

## 4. Delete list (files and components)

- `viya-chat-components.tsx`: `IconBadge`, `TypingBubble`, `ThinkingShimmerLetter`, `ChatModeSelector`, `HeaderActionGroup`, `ViyaPromptSuggestionsCard`, `ViyaChatEmptyContent` visual, `TripBlueprintActionDock` card styling; `viya-chat-screen.tsx` composer sheet and actions sheet.
- Dashboard: `TripModulesSheet`, `TripModuleNavigationBar`, `TripFloatingViyaButton`, `WorkspaceAutopilotCard`, `ModuleLauncher*`, `QuickActions`, `trip-dashboard-tabs.tsx` (all), `TripTabPicker`, `getModuleAccent`.
- Shared: `PillAction`, `ActionPill`, `TripStatusPill` (status becomes text), `trip-module-manual-entry-card`, `TripModuleScreenFrame` (replaced by `ModuleScreen`), `risk-alert-card`, `readiness-score-card`, `next-best-action-card` card styling (logic kept), `country-suggestion-card` badge, `account-avatar-button` (tab roots), `FloatingTabBar` replaced by native `NativeTabs` (expo-router unstable-native-tabs) on iOS with `Tabs` + glass fallback on Android.
- Routes: `(tabs)/viya.tsx`, `(tabs)/moments.tsx`, `ai.tsx`.

## 5. Primitive additions (ui package)

- `ModuleScreen`, `RecordSheet`, `FormField`/`FormGroup`, `Segmented` (glass native, wraps `@expo/ui` or `SegmentedControlIOS` fallback), `FloatingAction` (glass circle with label), `SwipeableRow` (reanimated + gesture-handler, haptic on threshold), `ContextMenuRow` (expo-router/`@expo/ui` ContextMenu fallback to long press `Menu`), `StatusText` (SF symbol plus text, tone), `Skeleton`. Add every new SF symbol to `SF_SYMBOL_MAP`.

## 6. Order of work

1. AppSheet single grabber and audit (3.0). Small, visible win.
2. `ModuleScreen`, native header adoption, tab restructure (1.1 to 1.3).
3. Chat (3.1) in one change because it touches composer, empty state, message list.
4. Trips tab, dashboard (3.2, 3.4), create flow.
5. Modules A then B, deleting dead components as each lands.
6. Profile, auth, onboarding, Discover.
7. Pass over Android fallbacks, Dynamic Type at XXXL, Reduce Transparency, VoiceOver labels; update DESIGN.md sections 3 and 7 for the new primitives and IA.

## 7. Acceptance checklist

- Each screen: one primary action, in thumb zone or labeled toolbar "+".
- No pills, badges, tinted icon tiles, gradients, emoji, nested cards.
- Every list: swipe, context menu, empty, loading, error.
- Every sheet: exactly one grabber, `SheetHeader`, detent set, never stacked.
- Chat: no bubbles for assistant, suggestion chips only when empty, one glass composer.
- Copy audit: no "workspace", "autopilot", "snapshot", "top X" labels.
