# Content audit: rich, specific and correct content on every screen

Status: decided (Opus auditor, 2026-11-15), to be applied by Sonnet builders. Do not commit.
Scope: `apps/native` (app/** and src/**), plus the small `packages/domain` and `packages/backend` changes named below. This file wins over earlier UX docs where they disagree on copy, counts or formulas. `SHELL-SPEC.md` still owns headers, routes and spacing.

Van's brief: "too plain, too simple, very vague; avoid nonsense labels; enrich the contents; make it functional and correct." Chrome stays minimal; content gets specific, true and actionable.

Device: Van's iPhone (UDID 00008150-001A25042213C01C) returned the black 49,772-byte screenshot (screen off), so this audit is from code reading only. Device checks were skipped. Builders must still follow CLAUDE.md "Definition of done" item 4.

## How to apply

- Severity: **P0** wrong or broken (wrong number, dead or miswired control, data lost), **P1** vague or thin (filler label, missing data that exists), **P2** polish.
- Order: do section 0 (shared helpers) first, in one change, because most slice items call those helpers. Then slices in any order; within a slice, P0 first.
- "Replace" means replace the whole string. Copy in quotes is verbatim. `{x}` is a value to interpolate with the helper named next to it.
- Never type a section header in capitals. `ListGroup header` renders the `eyebrow` variant, which already uppercases (`app-text.tsx:51`). Write headers in sentence case ("By category") and delete every `.toUpperCase()` passed to a header.
- Error copy always starts "Could not ..." (not "Couldn't", not "Unable to").
- Contract tests under `src/features/**/**.test.mts` assert some of the strings changed here. Update the expectation in the same change and note it in the PR; do not delete a test.
- After each slice: `npx tsc --noEmit` in `apps/native`, `npx ultracite check <touched files>`, `bun test apps/native`, `bun run test` in `packages/domain` when domain changed.

## Global vocabulary (applies to every slice)

| Old | New | Why |
|---|---|---|
| "Heads-up", "heads-ups", "Add heads-up", "Delete heads-up" | "Risk", "risks", "Add risk", "Delete risk" | The route, the data (`risks`) and Travel Mode already say Risks; "Heads-up" is a second name for the same thing. |
| Booking status `bookedExternally` shown as "Booked" but counted as not booked | Count `bookedExternally` and `confirmed` as booked everywhere (`isBookingSecured`, 0.2) | Marking a booking "Booked" today changes nothing on the dashboard, budget or recap. |
| "Needs booking" | "Not booked" (status), "To book" (filter) | Status, not an instruction. |
| "Dates not set", "Dates TBD", "Date TBD" | "No dates yet" and, where there is room, the action "Set dates" | One phrase; always paired with the fix. |
| "Travelers" count from `groupType` ("Family travelers") | `{n} travelers` from `getTravelerCount` (0.2) | "Family travelers" is not a count. |
| "PHP 12,500" (create flow, TripSync, share text) | "₱12,500" via `formatMoney` | One money format. |
| "Nov 21 - 25", "Nov 21 to 25, 2026", "Fri, Oct 16" | "21–25 Nov", "Fri 21 Nov" via `formatTripRange` / `formatDay` | Van's own examples ("Fri 21 Nov · 08:40"); one date format. |

---

## 0. Shared helpers

Two modules. Everything that formats goes in the app module; everything that derives a number from trip data goes in the domain module (pure, tested, usable by Convex too). Then delete the duplicates listed.

### 0.1 Formatting: NEW `apps/native/src/lib/format.ts`

Create the folder `apps/native/src/lib`. Import as `@/src/lib/format`. No React imports. Tests in `apps/native/src/lib/format.test.mts` with the examples below as cases.

```ts
// Money. PHP shows the peso sign, no decimals. Other currencies via Intl (en-PH).
export const formatMoney = (amount: number | undefined, currency = "PHP"): string
//   12500 -> "₱12,500"; 0 / undefined / NaN -> "₱0"; -500 -> "-₱500"; (120, "USD") -> "US$120"
//   impl: new Intl.NumberFormat("en-PH", { currency: currency.toUpperCase(), maximumFractionDigits: 0, style: "currency" })

// Counts
export const formatCount = (count: number, singular: string, plural = `${singular}s`): string
//   (1,"stop") -> "1 stop"; (3,"stop") -> "3 stops"; (0,"file") -> "0 files"; (2,"person","people") -> "2 people"

// Local calendar keys (device time zone). Replace every `new Date().toISOString().slice(0, 10)` in the app.
export const toLocalDateKey = (date = new Date()): string   // "2026-11-15" (use getFullYear/getMonth/getDate)
export const toLocalTimeKey = (date = new Date()): string   // "08:40"

// Dates. Input is a "YYYY-MM-DD" key (or a ms timestamp, converted with toLocalDateKey first).
// Formatter: Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ... }) on Date.UTC(y, m-1, d).
export const formatDay = (value: string | number, options?: { year?: "auto" | "always" }): string
//   "2026-11-21" -> "Fri 21 Nov"; year "auto" adds the year only when it is not the current year: "Fri 21 Nov 2027"
export const formatShortDate = (value: string | number, options?: { year?: "auto" | "always" }): string
//   "2026-11-21" -> "21 Nov"
export const formatTripRange = (start?: string | null, end?: string | null, options?: { year?: "auto" | "always" }): string
//   same month "21–25 Nov"; across months "30 Nov – 2 Dec"; across years "28 Dec 2026 – 3 Jan 2027";
//   start only "From 21 Nov"; end only "Until 25 Nov"; same day "21 Nov"; neither "No dates yet"
export const formatRelativeDay = (value: string | number, today = toLocalDateKey()): string
//   offset 0 "Today", 1 "Tomorrow", -1 "Yesterday", 2..6 "In 3 days", -2..-6 "3 days ago", else formatDay(value)

// Times and durations. Stored times are "HH:MM" 24-hour.
export const formatTime = (hhmm: string): string            // "8:5" -> "08:05"; invalid -> ""
export const formatTimeRange = (start: string, end?: string): string  // "08:40–10:00"; no end -> "08:40"
export const formatDuration = (minutes: number): string     // 45 -> "45 min"; 60 -> "1 h"; 80 -> "1 h 20 min"; <=0 -> ""
export const getMinutesBetween = (start: string, end: string): number // 0 when end <= start or invalid (no silent 60 default)

// Trip countdown label from the domain countdown (0.2)
export const formatTripCountdown = (countdown: TripCountdown): string
//   upcoming: 1 -> "Tomorrow"; 2..99 -> "In 16 days"; >=100 -> "In 4 months" (Math.round(days / 30))
//   during: "Day 2 of 5" (or "Day 2" when no end date); ended: "Ended 25 Nov"; completed: "Completed"; archived: "Archived";
//   undated: "No dates yet"

// Misc
export const formatFileSize = (bytes: number): string       // 840 -> "840 B"; 82_000 -> "80 KB"; 2_400_000 -> "2.3 MB"
export const formatEnumLabel = (value: string): string      // "backupPlan" -> "Backup plan"; "booked_externally" -> "Booked externally"; "flight" -> "Flight"
```

Move or delete these duplicates (update every import; `grep -rn` each name must hit only `src/lib/format.ts` afterwards):

| Duplicate | Where | Action |
|---|---|---|
| `formatMoney` | `src/features/trips/trip-dashboard-utils.ts:48` | delete, import from lib (callers: `trip-budget-screen.tsx`, `trip-dashboard-components.tsx`, `trip-travel-mode-screen.tsx`, `trip-recap-screen.tsx`) |
| `formatCost` | `src/features/trips/trip-itinerary-screen.tsx:55` | delete, use `formatMoney` |
| `formatShareMoney` | `src/features/trips/trip-recap-share.ts:16` | delete, use `formatMoney` (keep "₱") |
| `formatExtractedAmount` and `` `${expense.currency} ${expense.amount}` `` | `src/features/vault/tripsync-review-sheet.tsx:28`, `:95` | use `formatMoney(amount, currency)` |
| `` `PHP ${budgetAmount.toLocaleString()}` `` | `trip-create-flow-utils.ts:272`, `:345`; `trip-dashboard-components.tsx:122` | use `formatMoney` in UI strings (`:345`, review row). In the AI summary strings (`:272`, `:122`) keep "PHP 12,500" text: it goes to the model, not the UI |
| `formatStatus` | `trip-dashboard-utils.ts:60` | delete, use `formatEnumLabel` |
| `formatChoice` | `readiness-screen.tsx` | delete, use `formatEnumLabel` |
| `formatChoiceLabel` | `trip-itinerary-screen.tsx` | delete, use `formatEnumLabel` |
| `getBookingTypeLabel` | `booking-hub-screen.tsx` | delete, use the type labels in Modules-a BK4 |
| `formatCount` | `trip-dashboard-components.tsx:263` | delete, import from lib |
| whole file | `src/components/date/date-format-utils.ts` | move `formatReadableDate` callers to `formatDay` / `formatShortDate`, `formatReadableTripDateRange` callers to `formatTripRange`, `getDateRangeDurationDays` / `getCalendarDayOffset` callers to the domain (0.2); then delete the file. Callers: `trip-create-flow-utils.ts`, `trip-dashboard-utils.ts`, `trip-itinerary-screen.tsx`, `trip-notes-screen.tsx`, `trip-row.tsx`, `vault-preview-card.tsx`, `viya-chat-components.tsx` |
| `formatDayLabel` | `src/features/bookings/module-kit.tsx:381` | delete, use `formatDay` (callers: budget, bookings, readiness row) |
| `dayLabelFormatter`, `getDayLabel`, `formatCompactTripDateRange`, `compact*Formatter` | `trip-itinerary-screen.tsx:62-104` | delete, use `formatDay`, `formatTripRange` |
| `formatShortDate` (local) | `trip-recap-screen.tsx` | delete, use lib `formatShortDate` / `formatTripRange` |
| `todayIsoDate` | `trip-budget-screen.tsx:76`, `trip-travel-mode-screen.tsx:90` | delete, use `toLocalDateKey()` |
| `getDurationMinutes` (defaults to 60) | `trip-itinerary-screen.tsx` | replace with `getMinutesBetween` |

Keep `formatIsoDate` / `parseIsoDate` in `date-picker-field.tsx` (picker internals, already local time). Rename its exported `formatReadableDate` to `formatPickerDate` so there is one `formatReadableDate`-like name in the app (none).

### 0.2 Derived trip metrics: NEW `packages/domain/src/trip-metrics.ts`

Export it from `packages/domain/src/index.ts`. Pure TypeScript, structural input types (no Convex `Doc` import). Tests in `packages/domain/src/trip-metrics.test.ts`; include every example below plus the two time-zone cases at the end.

```ts
// Calendar math on "YYYY-MM-DD" keys (UTC-noon based, never toISOString of "now").
export const getDayOffset = (fromKey: string, toKey: string): number | null     // ("2026-11-15","2026-11-21") -> 6
export const getTripDayCount = (start?: string, end?: string): number | null     // inclusive: ("2026-11-21","2026-11-25") -> 5; missing -> null
export const addDaysToKey = (key: string, days: number): string
export const getDateKeyInTimeZone = (ms: number, timeZone: string): string       // for Convex: ("Asia/Manila")

// Bookings
export const isBookingSecured = (status: string): boolean => status === "confirmed" || status === "bookedExternally";
export const getBookingCounts = (bookings: { status: string; cost?: number; currency?: string; title: string; startDateTime?: string }[], budgetCurrency = "PHP") => ({
  total, booked /* isBookingSecured */, toBook /* status === "target" || "missing" */, cancelled,
  bookedCost /* sum cost of booked in budgetCurrency */, nextToBook /* first toBook by startDateTime then title, or null */,
});

// Readiness. Displayed percent = share of active tasks that are done. One formula everywhere.
export const getReadinessProgress = (items: { status: string; priority: string; dueDate?: string }[], todayKey: string) => ({
  active /* status !== "ignored" */, done /* status === "done" */, open /* active - done */,
  percent /* active === 0 ? null : Math.round(done / active * 100) */,
  highOpen /* open with priority high|critical */, overdue /* open with dueDate && dueDate < todayKey */,
});
export const toReadinessItem = (doc) => ReadinessItem   // moved from trip-dashboard-utils.ts:260, readiness-screen.tsx, backend trips.ts:73

// Trip phase and countdown (dates win over a stale status, except completed/archived)
export type TripPhase = "archived" | "completed" | "undated" | "upcoming" | "during" | "ended";
export const getTripPhase = (trip: { status: string; startDate?: string; endDate?: string }, todayKey: string): TripPhase
//   status archived -> "archived"; completed -> "completed"; no startDate -> "undated";
//   today < start -> "upcoming"; end && today > end -> "ended"; else "during"
export interface TripCountdown { phase: TripPhase; daysUntil: number | null; dayNumber: number | null; totalDays: number | null; endDate?: string }
export const getTripCountdown = (trip, todayKey): TripCountdown
//   upcoming: daysUntil = getDayOffset(today, start); during: dayNumber = getDayOffset(start, today) + 1, totalDays = getTripDayCount

// Budget days used for the daily amount
export const getBudgetDayCount = (trip: { startDate?: string; endDate?: string }, todayKey: string): number
//   undated or no end -> 1; upcoming -> getTripDayCount; during -> getDayOffset(today, end) + 1; ended -> 1

// People, places, files
export const getTravelerCount = (trip: { groupType: string; travelerCount?: number }, companions: { role: string }[]): number | null
//   trip.travelerCount ?? (groupType solo -> 1, couple -> 2) ?? (count of companions whose role is not emergencyContact|localContact, or null when 0)
export const getCompanionCounts = (companions: { role: string }[]) => ({ travelers /* not emergencyContact|localContact */, contacts })
export const getPlaceCounts = (savedPlaces: { assignedDayId?: string }[]) => ({ saved, unassigned })
export const getVaultCounts = (vaultItems: { kind: string; linkedEntityId?: string }[], documents: { status: string; expiryDate?: string }[]) => ({
  files /* vaultItems.length */, linked /* with linkedEntityId */, missingDocuments /* documents status === "missing" */,
})

// Itinerary now / next (replaces getNowAndNext in trip-dashboard-utils.ts:302 and trip-travel-mode-screen.tsx:154)
export const getItineraryNowNext = ({ days, items, todayKey, nowTime, maxUpcoming = 3 }) => ({
  now /* item on today's day with startTime <= nowTime < (endTime || startTime + 60 min) */,
  next /* first item whose `${day.date}T${startTime}` > `${todayKey}T${nowTime}` */,
  upcoming /* the maxUpcoming items after next */,
  todayItems /* all items on the day whose date === todayKey, sorted by startTime */,
});
```

Change in `packages/domain/src/budget.ts` `getBudgetWalletSummary`:
- Count a booking when `isBookingSecured(booking.status)` (was `=== "confirmed"`).
- Add `overAmount = Math.max(0, totalTrackedSpend - budgetTotal)` and `leftAmount = Math.max(0, budgetTotal - totalTrackedSpend)` to the return value. Keep `remainingAmount` (= `leftAmount`) for existing callers, and switch callers named in this audit to `leftAmount` / `overAmount`.
- `dailySafeSpend` stays `Math.floor(leftAmount / Math.max(1, remainingTripDays))`.

Change in `packages/domain/src/bookings.ts` `getBookingProgress`: `confirmed` counts `isBookingSecured`. Change in `packages/domain/src/trip-modules.ts:119`: same.

Delete the app duplicates:

| Duplicate | Where | Replace with |
|---|---|---|
| `getBudgetDayCount` | `trip-dashboard-utils.ts:222` | `getBudgetDayCount(trip, toLocalDateKey())` |
| `getTripBudgetDayCount` | `trip-budget-screen.tsx:96`, `trip-travel-mode-screen.tsx:91` | same |
| `getTripDayCount` | `trip-recap-screen.tsx` | `getTripDayCount` (domain) |
| `getCalendarDayCount` | `trip-itinerary-screen.tsx` | `getTripDayCount(...) ?? 1` |
| `addDays` | `trip-itinerary-screen.tsx` | `addDaysToKey` |
| `getTripCountdown`, `formatTripLeadTime`, `getReadinessLabel`, `getReadinessDisplay`, `getTravelerLabel`, `formatTripWindowWithDuration`, `formatDestinationLabel` | `trip-dashboard-utils.ts` | domain `getTripCountdown` + lib `formatTripCountdown`; `getReadinessProgress`; `getTravelerCount`; `formatTripRange` |
| `toReadinessItem` / `toDomainReadinessItem` | `trip-dashboard-utils.ts:260`, `readiness-screen.tsx`, `packages/backend/convex/trips.ts:73` | domain `toReadinessItem` |
| `isBooked` | `booking-hub-screen.tsx` | `isBookingSecured` |
| `getNowAndNext` | `trip-dashboard-utils.ts:302`, `trip-travel-mode-screen.tsx:154` | `getItineraryNowNext` |

Backend (same change as 0.2):
- `packages/backend/convex/trips.ts` `searchTrips`: `const today = getDateKeyInTimeZone(Date.now(), "Asia/Manila")` (was UTC `toISOString`). `withReadinessSnapshot` also returns `readinessDone`, `readinessActive`, `readinessPercent` from `getReadinessProgress(items, today)`.
- `packages/backend/convex/schema.ts` `trips`: add `travelerCount: v.optional(v.number())`. Add the same optional arg to `createTrip`, `createTripFromBlueprint` (when it knows one) and `updateTripProfile`.

### 0.3 One value, one formula: consistency table

| Metric | Formula (helper) | Shown on |
|---|---|---|
| Readiness | `getReadinessProgress(...).percent` + "`{done} of {active} done`" | Readiness header, dashboard row, Trips row, Recap |
| Bookings booked | `getBookingCounts(...).booked` of `total` | Bookings summary, dashboard row, Travel Mode, Recap, share text |
| Spent | `totalTrackedSpend` (secured bookings + logged expenses, budget currency) | Budget figure, dashboard row subtitle, Recap, share text |
| Left / over | `leftAmount` / `overAmount` | Budget, dashboard row, Travel Mode, Recap |
| Daily budget | `dailySafeSpend` with `getBudgetDayCount(trip, today)` | Budget, Travel Mode |
| Countdown | `getTripCountdown` + `formatTripCountdown` | Dashboard hero, Trips row, Discover next trip, chat empty state |
| Trip length | `getTripDayCount(start, end)` | Hero, create review, Recap "Days" |
| Travelers | `getTravelerCount(trip, companions)` | Hero, dashboard row, Travelers summary |
| Places | `getPlaceCounts(savedPlaces).saved` | Dashboard row, Recap |
| Vault files | `getVaultCounts(...).files` (vault items, not `max(vault, documents)`) | Dashboard row, Vault tab row, trip Vault summary |
| Open risks | `risks.filter(status === "open").length` | Dashboard row, Readiness Risks segment, Travel Mode |

---

## 1. Chat (`src/features/viya/*`, route `app/(app)/ai.tsx`)

1. **P1** `viya-chat-screen.tsx:412` empty state. Replace `emptyTitle` and the `subtitle` prop at `:940`:
   - Trip mode with `currentTrip`: title `currentTrip.title`; subtitle `` `${formatTripRange(trip.startDate, trip.endDate)} · ${formatTripCountdown(getTripCountdown(trip, toLocalDateKey()))}` `` (example "21–25 Nov · In 6 days"; undated: "No dates yet").
   - Other modes: title "What do you want to plan?"; subtitle, when the user has a next trip (`getNextTrip`, Tabs D1): `` `Next trip: ${trip.title} · ${formatTripRange(...)}` ``, otherwise "Name a place, dates or a budget to start."
   - Delete "Where to next?", "Planning {title}" and "Ask about places, plans and budgets."
2. **P1** `viya-chat-utils.ts` `getSelectedTripContext` falls back to `selectableTrips[0]` (whatever order the query returns). Fallback order: the trip from `getNextTrip(trips, toLocalDateKey())`, else the trip with the highest `updatedAt`.
3. **P1** `viya-chat-constants.ts` starter cards: titles and prompts disagree ("Plan the first night" sends a generic prompt) or are vague. Replace exactly:
   - `planPromptSuggestions`: (1) title "Plan a new trip", summary "One question at a time.", prompt unchanged from item 2 ("Help me plan a trip. Start with the most important question."); (2) title "Plan a beach trip", summary "Islands, beaches and slow days.", prompt "Help me plan a beach trip in the Philippines. Ask me one question at a time before drafting it."; (3) title "Plan around rain", summary "Indoor options and backups.", prompt unchanged from item 4; (4) title "Plan on a budget", summary "Set a total and keep to it.", prompt "Help me plan a trip on a fixed budget in PHP. Ask for the total first."
   - `tripPromptSuggestions`: titles "Find missing documents", "Draft the itinerary", "Check the budget", "What to do next"; summaries "Tickets, IDs and confirmations.", "Days, times and places.", "Spent, left and per day.", "The most urgent open item.". In the itinerary prompt delete "Wanderlog-style ".
   - `chatPromptSuggestions`: titles stay; summaries "Short, practical answer.", "Read a ticket or receipt.", "Rough costs in PHP.", "Pick one and say why.".
4. **P2** `viya-chat-constants.ts` slash command descriptions, replace: `/chat` "Questions not tied to one trip."; `/new` "Start a new conversation."; `/vault` "Find missing tickets, IDs and confirmations."; `/itinerary` "Draft or change the day-by-day plan."; `/budget` "Show spent, left and the daily amount."; `/readiness` "List what is still to do before the trip."; `/create-trip` "Draft a new trip from this chat.".
5. **P2** Chat mode descriptions (`:54`, `:68`): "Questions, files and ideas not tied to a trip." and "Questions about one trip: itinerary, budget, Vault and readiness."
6. **P1** `viya-chat-components.tsx:307` Trip context sheet: subtitle "Viya reads this trip's itinerary, bookings, budget and Vault."; row subtitle `` `${trip.destination} · ${formatTripRange(trip.startDate, trip.endDate)}` ``; empty text "No trips yet. Create one and Viya can plan around it." stays.
7. **P2** `viya-chat-screen.tsx:164`, `:1136` use `formatCount(remaining, "character")` + " left" so 1 reads "1 character left".

## 2. Tabs

### Discover (`app/(app)/(tabs)/(discover)/index.tsx`, `src/features/home/*`)

1. **P1** Returning users see nothing about their own trips. Add `getNextTrip(trips, todayKey)` to `packages/domain/src/trip-metrics.ts`: non-demo trips whose phase is `upcoming`, `during` or `undated`, sorted: `during` first, then `upcoming` by `startDate` ascending, then `undated` by `updatedAt` descending; return the first or null. On Discover, when `!isFirstRun` and a next trip exists, render first (inside an inset `View paddingHorizontal: spacing.screen`): `ListGroup header="Your next trip"` with one `ListRow` title `trip.title`, subtitle `` [shouldShowDestinationLine ? trip.destination : null, formatTripRange(...)].filter(Boolean).join(" · ") ``, value `formatTripCountdown(getTripCountdown(trip, today))`, leading `TripThumbnail` (export it from `trip-row.tsx`), `onPress` → `VIYA_ROUTES.tripDashboard(trip._id)`.
2. **P1** Section titles: "Closer to home" → "In the Philippines"; "Abroad" → "Outside the Philippines".
3. **P1** `destination-card.tsx`: under `item.detail` add a third line `AppText variant="footnote" tone="secondary"` with `item.duration.replace("-", "–")` (example "4–6 days"). Accessibility label → `` `Plan a ${item.duration} trip to ${item.country}` ``.
4. **P1** `packages/domain/src/preferences.ts` `getHomeSuggestion` (first-run block) titles are marketing. Replace the five pairs:
   - flagRisks: title "Check what could go wrong", subtitle "Viya lists booking, document and timing gaps before you pay for anything."
   - slow beach: title "Plan a slow beach trip", subtitle "Fewer stops a day, time to rest, simple transfers."
   - fast food: title "Plan a food-first trip", subtitle "Food stops and local spots with realistic travel time between them."
   - budget: title "Plan a trip on a budget", subtitle "Set a total in pesos and see transport, meals and stays against it."
   - default: title "Plan your first trip", subtitle "Tell Viya where, when and who is going. You get a day-by-day draft to edit."
5. **P2** `FirstRunBlock` button label "Plan a trip" stays (one primary action).

### Trips (`app/(app)/(tabs)/(trips)/trips.tsx`, `src/features/trips/trip-row.tsx`)

1. **P0** Trips in progress vanish from both "Upcoming" and "Past": backend `isUpcoming = startDate >= today`, and `traveling` only matches the stored status. In `packages/backend/convex/trips.ts` `searchTrips` set `const isUpcoming = !TRIP_COMPLETED_STATUSES.includes(trip.status as never) && (!trip.endDate || trip.endDate >= today)` and `today` per 0.2.
2. **P0** Day math is UTC: "Tomorrow" shows for a trip that starts today between 00:00 and 08:00 Manila time. `trip-row.tsx` uses `getTripCountdown(trip, toLocalDateKey())` + `formatTripCountdown`.
3. **P1** Row content (`trip-row.tsx` `TripRow`):
   - subtitle line 1: `` [shouldShowDestinationLine(...) ? trip.destination : null, formatTripRange(trip.startDate, trip.endDate), days ? formatCount(days, "day") : null].filter(Boolean).join(" · ") `` with `days = getTripDayCount(...)`. Example "El Nido · 21–25 Nov · 5 days".
   - subtitle line 2 (only when phase is `upcoming`, `during` or `undated` and `readinessActive > 0`): `` `${readinessPercent}% ready · ${readinessDone} of ${readinessActive} done` `` from the new snapshot fields (0.2). Set `subtitleLines={2}`.
   - value: `formatTripCountdown(...)` (replaces "In 2 weeks", "In 1+ year").
   - accessibility label: `` `${trip.title}, ${subtitle line 1}, ${value}` ``.
4. **P1** Empty states (`scopeEmpty`, `renderEmpty`): upcoming description "Trips that have not ended show here."; past description "Trips show here after their end date or when you mark them complete."; first run description "Add where and when you are going, or ask Viya to draft a trip." (title "No trips yet", action "New trip" stay).
5. **P2** Toasts: "Couldn't update favorite." → "Could not update favorite."; same for archive and delete.

### Vault tab (`app/(app)/(tabs)/(vault)/vault.tsx`)

1. **P1** Rows show only the destination. Add `listVaultCountsByTrip` query in `packages/backend/convex/vault.ts`: by index `by_owner`, group by `tripId`, return `{ tripId, files, lastAddedAt }[]`. Row subtitle `` `${trip.destination} · ${formatTripRange(trip.startDate, trip.endDate)}` ``; value `files > 0 ? formatCount(files, "file") : "Empty"`. Sort rows: the `getNextTrip` trip first, then trips with files by `lastAddedAt` descending, then the rest by `startDate` descending.
2. **P1** Empty state when there are no trips: title "No trips yet" (was "No documents yet"), description "Files are kept per trip. Create a trip, then add tickets, IDs and receipts to it.", action "New trip".
3. **P2** Group header "Trips" → "By trip"; delete the footer "Confirmations, receipts and IDs, kept with each trip.".
4. **P2** Add `vault: "/vault"` to `VIYA_ROUTES` if SHELL-SPEC agent B has not yet.

### Profile (`app/(app)/(tabs)/(profile)/profile.tsx`)

1. **P1** Placeholder values presented as real: `displayName = user?.fullName || user?.username || primaryEmail || "Your account"`; subtitle is the email only when it exists (delete the "Signed in" fallback); delete "Viya traveler".
2. **P1** Add a group after the account row: `ListGroup header="Trips"` with one row title "Trips", value `formatCount(total, "trip")` (non-demo), subtitle `` `${upcoming} upcoming · ${past} past` `` where upcoming = phase `upcoming|during|undated`, past = `ended|completed|archived` (`getTripPhase`), `onPress` → `VIYA_ROUTES.trips`. Data: the existing `api.trips.listTrips`.
3. **P1** "Travel preferences" value: `` `${travelStyleLabel} · ${paceLabel}` `` using `getOptionLabel(paceOptions, state.pacePreference)` from the same module.
4. **P2** Replace route literals `"/(app)/profile/travel"`, `"/(app)/profile/appearance"` with new `VIYA_ROUTES.profileTravel` and `VIYA_ROUTES.profileAppearance` constants.

## 3. Auth and onboarding

1. **P1** `app/(auth)/index.tsx` subtitle "Plan, prepare for and remember every trip." → "Plan a trip in chat, check you are ready, and keep a recap." Third highlight description → "Moments, places and spending become a recap you can share."
2. **P1** `auth-sign-in-sheet.tsx`: `statusMessage` always renders red with an alert icon, including instructions ("Create a password to finish setting up this account."). Change state to `{ text: string; tone: "danger" | "secondary" } | null`; instructions (`:450`, `:484`) use `secondary` with icon `information-circle-outline`; errors stay `danger`.
3. **P2** Same file: every "Unable to ..." fallback → "Could not ..." ("Could not finish account setup.", "Could not send a new code.", "Could not create your account."); "Viya could not finish account setup yet." → "Could not finish account setup. Try again."
4. **P1** `preference-onboarding-screen.tsx` group titles: "Trip vibe" → "Travel style"; "Suggestions" → "How much Viya decides"; "Needs to remember" → "Needs to plan around"; step 4 subtitle "These become safeguards in what Viya suggests." → "Viya plans around these on every trip."; summary `` `${step + 1} of ${STEP_COUNT}` `` → `` `Step ${step + 1} of ${STEP_COUNT}` `` (matches the create flow).
5. **P2** `preference-onboarding-screen.tsx:229` `router.replace("/(app)/(tabs)/(discover)")` → `router.replace(VIYA_ROUTES.home)`.

## 4. Trips core: create flow and dashboard

### Create flow (`manual-trip-create-screen.tsx`, `trip-create-flow-utils.ts`, backend `createTrip`)

1. **P0** Pace is never saved: `createTrip` hard-codes `pace: "moderate"` (not an option; options are light, balanced, packed). Add `pace: v.optional(v.string())` to `createTrip` args, store `args.pace ?? "balanced"`; add `pace: state.pace` to `CreateTripPayload` and `getCreateTripPayload`. In `trip-itinerary-screen.tsx` `handleSaveTripDateRange` change the fallback `"moderate"` to `"balanced"`.
2. **P0** A per-person budget is saved as the trip total. In `getCreateTripPayload`: `budgetAmount = state.budgetScope === "perPerson" && amount ? amount * travelerCount : amount` where `travelerCount = solo 1, couple 2, else parseTravelerCount(state.travelerCount) ?? 2`. Review row value: per person `` `${formatMoney(amount)} per person · ${formatMoney(amount * n)} total for ${n}` ``; total `` `${formatMoney(amount)} total · ${labels.budgetStrictness[...]}` ``; none "Not set".
3. **P0** Traveler count is collected and dropped. Send `travelerCount` (same number as item 2) to `createTrip` (schema field in 0.2).
4. **P0** With no destination the trip is saved as destination "Destination undecided" (shows as a real place). Send `destination: ""` and `title: cleanText(state.title) || (destination ? getDefaultTitle(destination) : "New trip")`; in backend `createTrip` title fallback use `args.destination ? \`${args.destination} trip\` : "New trip"`.
5. **P1** Review step "Dates" detail shows raw keys (`` `${state.startDate} to ${state.endDate}` ``) → `formatTripRange(state.startDate, state.endDate, { year: "always" })`; value `formatCount(getTripDayCount(...), "day")`. `getCreateTripReviewRows` "Dates" → `formatTripRange(..., { year: "always" })`, no dates and no length → "Not set".
6. **P1** Budget inputs (create review and edit sheet): label "Budget (₱)", placeholder "25,000".
7. **P2** Placeholders: trip name "Summer getaway" → "Siargao with friends" (create screen `:421`, edit sheet).
8. **P2** Delete unused `src/features/trips/manual-trip-create-sheet.tsx` (no importers).

### Dashboard (`trip-dashboard-screen.tsx`, `trip-dashboard-components.tsx`, `trip-dashboard-utils.ts`)

1. **P0** Booking status: "3 of 5 confirmed" ignores bookings marked "Booked" in the Bookings screen, `getMissingItems` lists them as gaps, and the budget leaves their cost out. Use `getBookingCounts` and `isBookingSecured` everywhere in these three files (rows, missing items, next action).
2. **P0** "Heads-up" row (`TripModuleGroups`): its number is `openRisks + missingItems`, which double counts open checklist tasks and unbooked bookings already shown on their own rows. Replace with: title "Risks", value `` `${openRisks} open` ``, subtitle the top open risk title (`sortTripRisksForReview`), shown only when `openRisks > 0`, `href` `VIYA_ROUTES.tripRisks`. Delete `travelAlertCount`.
3. **P0** Days are counted in UTC (`getCalendarDayOffset`, `getBudgetDayCount`, `getNowAndNext`), so countdowns and "Now" are wrong for 8 hours every night in Manila. Use `toLocalDateKey()` / `toLocalTimeKey()` with the domain helpers.
4. **P0** Travel Mode CTA only appears when `trip.status === "traveling"`, which nothing sets from dates. Compute `phase = getTripPhase(trip, today)`:
   - footer `PrimaryButton` "Open Travel Mode" when `phase === "during"`; `TripToday` when `during`, `TripNextUp` otherwise.
   - when `phase === "ended"`: Next up row title "Mark this trip complete", description `` `Ended ${formatShortDate(trip.endDate)}. Completing it unlocks the recap.` ``, href `tripWrapped`.
   - hero status word: phase labels "Planning" (upcoming, undated), "Traveling" (during), "Ended" (ended), "Completed", "Archived" (extend `trip-status-pill.tsx` with an "ended" entry, icon `flag-outline`, tone secondary).
5. **P1** Hero facts line (`TripHero`): `` [formatTripRange(start, end), days ? formatCount(days, "day") : null, travelers ? formatCount(travelers, "traveler") : null].filter(Boolean).join(" · ") `` (example "21–25 Nov · 5 days · 4 travelers"); second line `` `${phaseLabel} · ${formatTripCountdown(countdown)}` `` (example "Planning · In 6 days"). When undated, second line "Planning · No dates yet". When `destination` is empty, show a row under the hero: title "Add a destination", leading `location-outline`, opens the edit sheet.
6. **P1** Next up (`getNextAction` in `trip-dashboard-utils.ts:381`). Replace the logic with this order; first match wins:
   1. undated: title "Set trip dates", description "Days, countdown and daily budget need dates.", icon `calendar-outline`, href `tripItinerary`.
   2. open risk with severity `critical` or `high`: title `risk.title`, description `` `${formatEnumLabel(risk.severity)} risk · ${risk.suggestedAction}` ``, icon `warning-outline`, href `tripRisks`.
   3. `getBookingCounts(...).nextToBook`: title `` `Book ${b.title}` ``, description `` [formatEnumLabel(b.type), b.startDateTime ? formatDay(b.startDateTime.slice(0, 10)) : null, "not booked yet"].filter(Boolean).join(" · ") ``, icon `ticket-outline`, href `tripBookings`.
   4. first open readiness item (review order): title `item.title`, description `` [READINESS_CATEGORY_LABELS[item.category], item.dueDate ? `due ${formatDay(item.dueDate)}` : null, `${done} of ${active} done`].filter(Boolean).join(" · ") ``, icon `checkbox-outline`, href `tripReadiness`.
   5. no budget: title "Set a budget", description "Spending and the daily amount need a total.", icon `wallet-outline`, href `tripBudget`.
   6. no vault files: title "Add tickets and IDs to Vault", description "No files saved for this trip yet.", icon `folder-open-outline`, href `tripVault`.
   7. otherwise: title "Checklist done", description `` `${formatTripCountdown(countdown)}. Open Travel Mode on the day.` ``, icon `checkmark-circle-outline`, href `tripTravelMode`.
   Delete "Next in {category}.", "Review readiness", "Review the readiness checklist and close the remaining gaps.", "Your core prep is done. Switch to day-of guidance.".
7. **P1** Module rows (`TripModuleGroups`), exact values (`ModuleRow` gets `subtitle`):
   - Group headers: "Plan" → "Planning"; "Together" → "People and files"; "On the trip" stays.
   - Itinerary: `plannedDays` = days with at least one item, `tripDays = getTripDayCount(...)`. Value `tripDays ? \`${plannedDays} of ${tripDays} days planned\` : formatCount(plannedDays, "day")`; subtitle `formatCount(itineraryItems.length, "stop")`; no items: value "Nothing planned", no subtitle.
   - Places: value `` `${saved} saved` `` or "None saved"; subtitle `` `${unassigned} not on a day` `` when `unassigned > 0` (`getPlaceCounts`).
   - Bookings: value `` `${booked} of ${total} booked` `` or "None added"; subtitle `` `Next: ${nextToBook.title}` `` when one exists.
   - Readiness: value `` `${percent}%` ``; subtitle `` `${done} of ${active} done` `` plus `` · ${overdue} overdue `` when > 0; `active === 0`: value "Not started", subtitle "Open to get your checklist".
   - Budget: budget set and not over: value `` `${formatMoney(leftAmount)} left` ``, subtitle `` `${formatMoney(spent)} of ${formatMoney(budget)} spent` ``; over: value `` `Over by ${formatMoney(overAmount)}` `` (row `destructive` not used; add `Icon alert-circle-outline tone="danger"` as trailing); no budget: value "Not set", subtitle `` `${formatMoney(spent)} spent` `` when `spent > 0`.
   - Risks: item 2.
   - Drafts: show the row only when `draftCount > 0` (title "Drafts from Viya", value `` `${draftCount} to review` ``) or when `getIsWorkspaceReady` is false (title "Fill gaps with Viya", subtitle the missing parts joined with ", " from: "itinerary" (no items), "Vault" (no files), "bookings" (none), "budget" (none), "checklist" (percent < 80)). Fix `getIsWorkspaceReady`: drop `model.readiness.score >= 100`; ready = all five parts present and readiness percent >= 80. Delete the value "Complete trip".
   - Travelers: `n = getTravelerCount(trip, companions)`; value `n ? formatCount(n, "traveler") : "Not set"`; subtitle `` `${companions.length} added` `` when `companions.length > 0`, "None added yet" when `n > 1 && companions.length === 0`; `n === 1 && companions.length === 0`: value "Just you", no subtitle.
   - Notes: value `formatCount(notes.length, "note")` or "None"; subtitle `notes[0].title` (already sorted by `updatedAt` desc).
   - Vault: value `formatCount(files, "file")` or "Empty" (was `max(vaultItems, documents)`); subtitle `` `${missingDocuments} documents missing` `` when > 0.
   - Travel Mode: value `phase === "during" ? formatTripCountdown(countdown) : phase === "upcoming" ? \`Opens ${formatShortDate(trip.startDate)}\` : undefined`.
   - Moments: value `formatCount(moments.length, "moment")` or "None"; subtitle `` `${highlights} highlighted` `` when > 0.
   - Recap: subtitle when not completed "Mark the trip complete to finish it" (was "Available after the trip").
8. **P1** Readiness reads "Not started" until the Readiness screen is opened once, because baseline tasks are only seeded there. In `TripDashboardScreen` add the same effect as `readiness-screen.tsx` (`getMissingRequiredReadinessCategories` → `ensureBaselineReadinessItems`, one request per trip id), driven by `workspace.readinessItems`.
9. **P1** Edit sheet (`TripProfileEditSheet`): Dates row value `formatTripRange(form.startDate, form.endDate, { year: "always" })` (was raw keys "2026-11-21 to 2026-11-25"), "Not set" when empty; destination placeholder "Tokyo, Japan" → "El Nido, Palawan"; budget field per create item 6; add a "Travelers" number field (keyboard numeric, label "Number of travelers") bound to `travelerCount`, shown when groupType is not solo or couple.
10. **P1** `TripToday` (traveling): use `getItineraryNowNext`; header "Now" when `now`, else "Next"; row value `formatTimeRange(item.startTime, item.endTime)`; subtitle `` [item.locationName, next is not today ? formatDay(day.date) : null].filter(Boolean).join(" · ") ``. When nothing today or later, render nothing (Travel Mode footer stays).
11. **P2** Remove dead model fields and their builders from `trip-dashboard-utils.ts` and `trip-dashboard-types.ts`: `statusMetrics`, `quickActions`, `watchOutItems`, `recentUpdates`, `tabs`, `tabCounts`, `activeDocuments`, `travelAlertCount`, `highlights`, `bookingsByType`, `readinessByCategory`, `tripTabs`, `DashboardAction`, `DashboardMetric`, `DashboardTab`, `RecentUpdate`, `TripTab` (after checking `grep -rn` shows no other reader; `trip-dashboard-ai-demo-contract.test.mts` may need an update).
12. **P2** `tripAgentModuleLabels.risks` "Heads-up" → "Risks".

## 5. Itinerary, places and Travel Mode

### Itinerary (`trip-itinerary-screen.tsx`)

1. **P0** "Trip dates" picker uses a third date style ("Nov 21 to 25, 2026", local getters) → pass `formatDateRange={(s, e) => formatTripRange(formatIsoDate(s), formatIsoDate(e), { year: "auto" })}`.
2. **P0** `handleSaveTripDateRange` fallback pace `"moderate"` → `"balanced"` (also Create item 1).
3. **P1** Day section header (`DaySectionHeader`): left `` `Day ${dayNumber}` `` headline; right subhead secondary `` [dayDate ? formatDay(dayDate) : null, items.length ? formatCount(items.length, "stop") : null, dayCost > 0 ? formatMoney(dayCost) : null].filter(Boolean).join(" · ") `` where `dayCost` = sum of `item.estimatedCost` (positive only). Accessibility label `` `Open day ${dayNumber}, ${right text}` ``.
4. **P1** Empty day row in the overview: title "Nothing planned", subtitle "Tap to add the first stop" (was "No stops yet" / "Open the day to add the first stop.").
5. **P1** Stop row (`StopRow`): time column shows `formatTime(startTime)`, and under it `AppText variant="footnote" tone="secondary"` `formatDuration(getMinutesBetween(start, end))` when > 0; subtitle `` [item.locationName, formatEnumLabel(item.category), linkedBookingIsSecured ? "Booked" : null].filter(Boolean).join(" · ") `` (pass `bookingStatus` from the parent).
6. **P1** Day screen `summary`: `` [formatDay(dayDate), theme !== "Open planning" ? theme : null, dayItems.length ? formatCount(dayItems.length, "stop") : null, dayItems.length ? formatTimeRange(first.startTime, last.endTime) : null].filter(Boolean).join(" · ") `` (example "Fri 21 Nov · 4 stops · 08:00–18:30").
7. **P1** Day "Budget" row reads `day.estimatedCost`, a separate field that does not match the stop costs. Replace with title "Planned cost", value `dayBudget > 0 ? \`${formatMoney(dayCost)} of ${formatMoney(dayBudget)}\` : formatMoney(dayCost)`, shown when `dayCost > 0 || dayBudget > 0`. The edit sheet field label "Budget" → "Day budget (₱)".
8. **P1** Day empty states: not planned (`EmptyPrimary`): title `` `Nothing planned for ${formatDay(dayDate)}` `` (or "Nothing planned for this day" undated), description "Plan this day to add stops with times and places."; planned but no stops: title "No stops on this day yet", description "Add a stop with a start time and a place." (delete "when the timing is ready" and "Use Plan this day below").
9. **P1** Day number outside the trip (`dayNumber > tripDays` or `< 1`): `ScreenShell state` empty, title "This day is not in the trip", description `` `This trip has ${formatCount(tripDays, "day")}.` ``, action "Back to itinerary" → `router.back()`.
10. **P2** Stop sheet times: footer "Use 24-hour times, for example 14:30." stays; validation message unify to "Use 24-hour times, for example 09:00."

### Places (`trip-places-screen.tsx`)

1. **P1** `PlaceRow` value `getDayAssignmentLabel` "Day 2" → `` `Day ${n} · ${formatShortDate(day.date)}` `` when the day has a date.
2. **P1** Group headers: "Unplanned" → "Not on a day yet" (footer "Assign each to a day to add it to your plan."); "Planned" → "On a day"; "In your itinerary" → "Stops with a location". Itinerary place rows: subtitle `` [place.locationName, `Day ${dayNumber}`].join(" · ") ``.
3. **P2** "Assign to day" empty: title "No itinerary days yet", footer "Plan a day in Itinerary, then assign places to it."

### Travel Mode (`trip-travel-mode-screen.tsx`)

1. **P0** "NOW" is wrong: it is the first item at or after the current UTC time, across the whole trip. Before the trip it shows Day 1's first stop as "Now"; after the trip it shows the last stop. Use `getItineraryNowNext({ days, items, todayKey: toLocalDateKey(), nowTime: toLocalTimeKey() })`:
   - `now`: eyebrow `` `Now · until ${formatTime(end)}` ``; title `item.title`; callout `` [formatTimeRange(start, end), item.locationName].filter(Boolean).join(" · ") ``.
   - no `now`, `next` today: eyebrow `` `Next · ${formatTime(next.startTime)} today` ``.
   - no `now`, `next` on a later day: eyebrow `` `Next · ${formatDay(day.date)}, ${formatTime(startTime)}` ``.
   - phase `upcoming`: `EmptyPrimary` title `` `Trip starts ${formatTripCountdown(countdown).toLowerCase()}` `` (e.g. "Trip starts in 6 days", "Trip starts tomorrow"), description `` `Day 1 is ${formatDay(trip.startDate)}.` `` + (next ? `` ` First stop: ${next.item.title} at ${formatTime(next.item.startTime)}.` `` : ""), action "Open itinerary".
   - phase `ended` or `completed`: title `` `This trip ended ${formatShortDate(trip.endDate)}` ``, description "See what you did and spent.", action "Open recap" → `tripWrapped`.
   - no items at all: title "No stops planned", description "Add stops with times to see them here.", action "Open itinerary" (was "Nothing planned today" + "Add a stop").
   - eyebrow "DONE" when completed → `` `Done · ${formatTimeRange(...)}` ``.
2. **P0** Urgent risks filter is `severity === "high"`, so critical risks never show. Use `high || critical`; title `` `${formatCount(n, "urgent risk")}` ``; subtitle the top one's title; tap → `tripRisks`.
3. **P0** "Documents {n} ready" counts the list after `.slice(0, MAX_REFERENCES)`, so it caps at the slice size. Count before slicing. "Tickets" and "Bookings {n} confirmed" use `status === "confirmed"` → `isBookingSecured`; value `` `${booked} of ${total} booked` ``.
4. **P1** "Up next" rows: value `formatTime(startTime)`; subtitle `` [item.locationName, day.date !== today ? formatDay(day.date) : null].filter(Boolean).join(" · ") ``.
5. **P1** Trip group: "Notes" value `formatCount(n, "note")`; "Risks" value `` `${open} open` ``; "Daily safe spend" → title "Budget for today", value `formatMoney(dailySafeSpend)`, subtitle `` `${formatMoney(leftAmount)} left for ${formatCount(days, "day")}` `` (days = `getBudgetDayCount`); when `overAmount > 0`: value `` `Over by ${formatMoney(overAmount)}` ``; when no budget, hide the row.
6. **P1** Ticket rows: detail `` [b.startDateTime ? `${formatDay(date)}, ${formatTime(time)}` : null, b.provider, b.confirmationCode ? `Ref ${b.confirmationCode}` : null].filter(Boolean).join(" · ") `` (delete "Provider TBD", "No code" and the raw file name).
7. **P1** Quick add group header "Quick add" → "Add"; row "Report issue" → "Add a risk" (opens Readiness on the Risks segment).
8. **P2** Document rows detail `` `${document.status} checklist item` `` → `document.expiryDate ? \`Expires ${formatDay(document.expiryDate, { year: "always" })}\` : formatEnumLabel(document.type)`.
9. **P2** Quick note default title `` `Travel note ${todayIsoDate()}` `` → `` `Note · ${formatDay(toLocalDateKey())}` ``; quick expense `categoryLabel` `"Food spend"` → `formatEnumLabel(category)`.

## 6. Modules A: budget, bookings, readiness, risks

### Budget (`src/features/budget/trip-budget-screen.tsx`)

1. **P0** "Over by ₱0": `remainingAmount` is clamped at 0, so `Math.abs(remainingAmount)` is always 0. Use `summary.overAmount` for the label and `isOver = Boolean(budgetAmount) && summary.overAmount > 0` (an exactly spent budget is not "over"; show "₱0 left").
2. **P0** "By category" sums only logged expenses in the budget currency, so it does not add up to "Spent" (which includes booked costs). Render `summary.categoryBreakdown` (domain, includes secured bookings by booking type) with `formatEnumLabel(category)` and `formatMoney(amount, currency)`. Header "By category".
3. **P0** Bookings marked "Booked" were not counted in Spent; fixed by `isBookingSecured` in 0.2. Day count for the daily amount uses UTC; use `getBudgetDayCount(budget.trip, toLocalDateKey())`.
4. **P1** `BudgetFigure` under the bar: not over `` `${formatMoney(leftAmount)} left · ${formatMoney(dailySafeSpend)} a day for ${formatCount(days, "day")}` `` (daily part only when dated and `days > 0`); over `` `Over by ${formatMoney(overAmount)}` `` with the danger `StatusLabel`; progress a11y label `` `${Math.round(progress)} percent of budget spent` `` stays.
5. **P1** Add a group after "Total budget": `ListGroup header="Where it comes from"` rows: "Booked" value `formatMoney(confirmedBookingCosts)` subtitle `formatCount(bookedCount, "booking")` → `tripBookings`; "Logged expenses" value `formatMoney(manualExpenses)` subtitle `formatCount(expenses.length, "expense")`, no chevron; "Planned in itinerary" value `formatMoney(plannedCosts)` subtitle "Estimates, not counted in spent" → `tripItinerary` (row only when `plannedCosts > 0`).
6. **P1** Empty states: no budget and no expenses → `EmptyState` title "No budget or expenses yet", description "Set a total to see what is left each day.", action "Set budget" (opens the budget sheet); budget set, no expenses → title "No expenses logged", description `` `${formatMoney(budgetAmount)} to spend${tripDays ? ` over ${formatCount(tripDays, "day")}` : ""}.` ``, action "Add expense".
7. **P1** Expense "Date" is a free-text "YYYY-MM-DD" field → `DatePickerField` (`src/components/date/date-picker-field.tsx`) with `formatDate={(d) => formatDay(formatIsoDate(d))}`; default `toLocalDateKey()`.
8. **P1** Field labels: expense "Amount" → "Amount (₱)", placeholder "1,200"; budget sheet "Amount" → "Total (₱)", placeholder "25,000".
9. **P2** Day group header: `` `${formatDay(group.day)} · ${formatMoney(dayTotal)}` `` (drop `.toUpperCase()`); expense row subtitle add "Receipt" when `expense.vaultItemId`.

### Bookings (`src/features/bookings/booking-hub-screen.tsx`)

1. **P0** `isBooked` vs dashboard `confirmed` mismatch: replace `isBooked` with `isBookingSecured` and `getBookingProgress` with `getBookingCounts` (0.2).
2. **P0** Time is saved unvalidated ("HH:MM" free text). Before save, if `form.time` is set and fails `/^([01]?\d|2[0-3]):[0-5]\d$/`, show "Use 24-hour time, for example 08:40." and stop. Date field → `DatePickerField` (as Budget item 7).
3. **P1** Summary line: `` `${booked} of ${total} booked · ${formatMoney(bookedCost)}` `` + (toBook > 0 ? `` ` · ${toBook} to book` `` : "").
4. **P1** Sections: one per type, order and headers: flight "Flights", hotel "Stays", transport "Transport", activity "Activities", restaurant "Restaurants", insurance "Insurance", other "Other" (restaurants were filed under Activity and insurance under Other). Header strings as written (no `.toUpperCase()`).
5. **P1** Row subtitle: `` [b.startDateTime ? [formatDay(date), time ? formatTime(time) : null].filter(Boolean).join(", ") : null, b.provider, b.cost ? formatMoney(b.cost, b.currency) : null].filter(Boolean).join(" · ") `` (example "Fri 21 Nov, 08:40 · Cebu Pacific · ₱4,820").
6. **P1** Empty state description "Keep stays, transport and activities in one place." → "Add flights, stays and tours. Mark each one booked once you have paid."
7. **P2** Labels: filter "Needs booking" → "To book"; status default "Needs booking" → "Not booked"; sheet segmented "Needs booking" → "Not booked"; filter a11y "Item type" → "Filter bookings"; field "Cost" → "Cost (₱)".

### Readiness and risks (`src/features/readiness/*`, `app/(app)/trips/[tripId]/risks.tsx`)

1. **P0** Category links are miswired (`getReadinessCategoryHref`): `packing` opens Vault; `safety` and `backupPlan` open the Risks route, which redirects to this same screen. New mapping: documents → Vault "Open Vault"; bookings → Bookings "Open bookings"; budget → Budget "Open budget"; schedule, transport, weather → Itinerary "Open itinerary"; group → Travelers "Open travelers"; packing, safety, backupPlan → no link. Link label is the specific one above (was "Open category"); owner link "Open owner" → `` `Open ${ownerName}` ``.
2. **P0** The header percent is `calculateReadinessScore` (a penalty formula), so "92% ready" can sit next to "4 tasks left" and differs from what users count. Header: title `` `${percent}% ready` `` from `getReadinessProgress`; secondary line `` [`${done} of ${active} done`, highOpen ? `${highOpen} high priority` : null, overdue ? `${overdue} overdue` : null].filter(Boolean).join(" · ") ``; `active === 0`: title "No tasks yet", line "Add what you need to do before the trip.". Keep `calculateReadinessScore` for backend filters and AI only.
3. **P1** Rename Heads-up to Risks across this screen: segment "Heads-up" → "Risks"; sheet kind "Heads-up" → "Risk"; titles "Add heads-up" → "Add risk", "Heads-up" → "Risk", "Delete heads-up" → "Delete risk"; segment param stays `"heads-up"` for deep links but label changes; empty state title "No risks for this trip", description "Add anything that could disrupt the trip and what you will do instead.", action "Add risk"; error copy "Could not dismiss this risk. Try again." etc. Comment in `risks.tsx` updated.
4. **P1** Header add action label "Add item" → `segment === "heads-up" ? "Add risk" : "Add task"`.
5. **P1** Baseline tasks come back after delete (the screen re-seeds missing required categories on every mount). For `item.source === "system"`, the trailing swipe is "Not needed" (`icon: "remove-circle-outline"`, sets status `ignored`) instead of Delete; the sheet's destructive row reads "Mark not needed". User tasks keep Delete.
6. **P1** Task row subtitle (`readiness-item-row.tsx`): `` [category, dueText, priority high|critical ? `${PRIORITY_LABELS[p]} priority` : null].filter(Boolean).join(" · ") `` where `dueText` = overdue (`dueDate < today`, not done) `` `Overdue, was due ${formatDay(dueDate)}` `` else `` `Due ${formatRelativeDay(dueDate)}` ``.
7. **P1** "NEXT UP" header → "Next up"; row subtitle same as item 6.
8. **P1** Due date field (free text) → `DatePickerField`.
9. **P1** Risk row subtitle `risk.suggestedAction` → `` `What to do: ${risk.suggestedAction}` ``; default suggested action "Review and create a backup plan." → leave empty and omit the subtitle when blank.
10. **P2** Done segment empty "Nothing is done yet." → "No finished tasks yet. Tick a task to move it here."; sheet segmented a11y "Item type" → "Task or risk".

## 7. Modules B: vault, notes, travelers, recap and moments

### Trip Vault (`src/features/vault/*`)

1. **P1** `travelDocuments` (IDs, permits, with `status` and `expiryDate`) are counted on the dashboard but never shown in Vault. Add, above the file sections, `ListGroup header="Travel documents"` when `workspace.documents.length > 0` (use `api.tripWorkspace.getTripWorkspace` already loaded or add it): row title `doc.title`, subtitle `formatEnumLabel(doc.type)`, trailing `StatusLabel`: missing → "Missing" (`alert-circle-outline`, danger); `expiryDate` → `` `Expires ${formatDay(expiryDate, { year: "always" })}` `` (warning when `expiryDate` is before `trip.endDate` + 180 days); else "Saved" (success). Tap: with `vaultItemId` open that file; without, open the add sheet.
2. **P1** Row (`vault-preview-card.tsx`): value "Linked" is meaningless; delete it. Subtitle `` [vaultKindLabels[kind], formatFileSize(fileSize), `Added ${formatShortDate(createdAt)}`, linkedEntityLabel].filter(Boolean).join(" · ") `` (pass `fileSize`).
3. **P1** Summary `` `${files} files` `` → `` [formatCount(files, "file"), linked ? `${linked} linked` : null, missingDocuments ? `${missingDocuments} documents missing` : null].filter(Boolean).join(" · ") ``.
4. **P1** Empty state: title "No files for this trip", description "Add a ticket, booking confirmation, ID or receipt. Viya reads it and suggests bookings and expenses for you to review.", action "Add file" (was "Add document").
5. **P1** "Photo or screenshot" uploads are saved with kind `other` and land under Other. In `use-vault-upload.ts` `pickPhoto` accept `kind?: TripSyncUploadKind` (default `"document"`) and pass it through; Moments passes `"momentPhoto"` (item MO1).
6. **P2** Section labels (`vaultSectionLabels`) sentence case: "Bookings", "Documents", "Photos", "Attachments", "Other", "Receipts".
7. **P2** `tripsync-review-sheet.tsx`: headers "FILE", "BOOKING", "BUDGET", "READINESS" → "File", "Booking", "Expense", "Checklist"; confidence value `` `${pct}% sure` `` → `` `${pct}% confidence` ``; amounts via `formatMoney`; expense subtitle `formatEnumLabel(expense.category)`.

### Notes (`trip-notes-screen.tsx`)

1. **P1** Row value shows `createdAt` but the list is sorted by `updatedAt`. Value `formatRelativeDay(note.updatedAt)` ("Today", "Yesterday", "Fri 14 Nov").
2. **P2** Summary `` `${n} notes` `` → `formatCount(n, "note")` + (categories > 1 ? `` ` in ${categories.length} categories` `` : "").

### Travelers (`trip-companions-screen.tsx`)

1. **P1** Summary "N people" counts emergency and local contacts as travelers. Use `getCompanionCounts`: `` [formatCount(travelers, "traveler"), contacts ? formatCount(contacts, "contact") : null].filter(Boolean).join(" · ") ``. When `getTravelerCount(trip, companions)` > `travelers`, append `` ` · ${n - travelers} not added yet` ``.
2. **P1** Row subtitle: `` [companion.phone, companion.email, openTasks ? formatCount(openTasks, "open task") : null].filter(Boolean).join(" · ") `` where `openTasks` = readiness items with `assignedToMemberId === companion._id` and status not done/ignored (load `api.readiness.listReadinessItems`).
3. **P1** Empty state: when `getTravelerCount > 1`: title "No travelers added", description `` `This trip is for ${n}. Add each person so tasks and contacts have an owner.` ``; else description "Add the people on this trip, starting with you." Action "Add traveler".
4. **P2** Header action label "Add companion" → "Add traveler".

### Recap (`trip-recap-screen.tsx`, `trip-recap-share.ts`)

1. **P0** Share text repeats the destination ("El Nido · El Nido, 21 Nov - 25 Nov") because `dateWindow` is passed `tripMeta` (destination + dates). Pass `dateWindow: formatTripRange(startDate, endDate, { year: "always" })`; line 2 `` [destination, dateWindow].filter(Boolean).join(" · ") ``.
2. **P0** Share and "Budget outcome" say "₱0 left" when there is no budget or the trip went over. Share line: no budget `` `Spent: ${formatMoney(spent)}` ``; over `` `Spent: ${formatMoney(spent)}, ${formatMoney(overAmount)} over budget` ``; else `` `Spent: ${formatMoney(spent)} of ${formatMoney(budget)}` ``. Wrap-up row "Budget outcome": same three texts as `detail`; `isDone = Boolean(budget) && spent > 0 && overAmount === 0`.
3. **P1** Share lines: `` `Stops: ${completed} of ${total} done` ``; `` `Bookings: ${booked} of ${totalBookings} booked · ${formatCount(files, "file")}` ``; highlights fallback "Add moments to complete the trip story" → omit the line when there are none; delete "Planned with Viya.".
4. **P1** Stats: "Days" = `getTripDayCount(start, end)` (was `itineraryDays.length`); "Places" = `getPlaceCounts(savedPlaces).saved`; add "Stops done" `` `${completed} of ${total}` ``. Remove the in-card trip title and meta line (SHELL-SPEC trip-name rule); keep `summary` for the meta. Replace the `Card` with a plain `View` (stats are not a card).
5. **P1** Summary before completion "Final once the trip is marked complete." → phase `ended`: `` `Ended ${formatShortDate(endDate)}. Mark the trip complete to share the recap.` ``; otherwise `` `Ends ${formatShortDate(endDate)}. Mark the trip complete to share the recap.` `` (undated: "Mark the trip complete to share the recap.").
6. **P1** Wrap-up "Confirmations": detail `` `${booked} of ${total} booked · ${formatCount(files, "file")}` ``; `onPress` → Bookings when `toBook > 0`, else Vault. "Route and places" → title "Places", detail `` `${saved} saved · ${plannedDays} days planned` ``.
7. **P2** Headers "HIGHLIGHTS" / "WRAP-UP" → "Highlights" / "Wrap-up"; empty highlight row subtitle "Add photos and notes from the trip." → "Save a moment and it shows here."

### Moments (`trip-moments-screen.tsx`)

1. **P1** Rows render `photoUrl` but there is no way to add a photo. In `MomentSheet` add a `ListRow` "Add photo" / "Change photo" (leading thumbnail when set) that calls `useVaultUpload().pickPhoto({ kind: "momentPhoto", tripId })` and stores the returned file URL in `form.photoUrl` (extend the hook to return `{ url }` from the saved vault item if it does not yet); send `photoUrl` to `createMoment` / `updateMoment`.
2. **P2** Group headers `` `DAY ${n}` `` → `` [`Day ${n}`, day.date ? formatDay(day.date) : null].filter(Boolean).join(" · ") ``; "NO DAY" → "Not linked to a day".
3. **P2** Row subtitle: when the moment has no day, prepend `formatRelativeDay(moment.createdAt)`.
4. **P2** Empty description "Add photos and notes from the trip." → "Save a photo, a place or a line about what happened. Highlights go into the recap."

## 8. Dead code (delete, after `grep -rn <Name> app src` shows no importer)

- `src/components/trip/next-best-action-card.tsx`
- `src/components/itinerary/itinerary-preview.tsx`
- `src/features/trips/trip-empty-screen.tsx` (copy "Ready for manual entry" is filler)
- `src/features/trips/trip-module-manual-entry-card.tsx`
- `src/features/trips/manual-trip-create-sheet.tsx`
- `packages/domain/src/dashboard.ts` `getNextBestAction` and `getUpcomingItineraryItems` only if no backend/AI caller (`grep -rn` in `packages/backend`).

## 9. Counts

| Slice | P0 | P1 | P2 | Total |
|---|---|---|---|---|
| Shared helpers (section 0) | 3 (UTC day math, booking status, budget clamp) | 2 (format module, metrics module) | 0 | 5 |
| Chat | 0 | 4 | 3 | 7 |
| Tabs: Discover | 0 | 4 | 1 | 5 |
| Tabs: Trips | 2 | 2 | 1 | 5 |
| Tabs: Vault | 0 | 2 | 2 | 4 |
| Tabs: Profile | 0 | 3 | 1 | 4 |
| Auth and onboarding | 0 | 3 | 2 | 5 |
| Trips core: create | 4 | 2 | 2 | 8 |
| Trips core: dashboard | 4 | 6 | 2 | 12 |
| Itinerary, places, Travel Mode | 5 | 13 | 4 | 22 |
| Modules A: budget, bookings, readiness, risks | 7 | 16 | 3 | 26 |
| Modules B: vault, notes, travelers, recap, moments | 2 | 14 | 8 | 24 |
| **Total** | **27** | **71** | **29** | **127** |
