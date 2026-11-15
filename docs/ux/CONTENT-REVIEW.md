# Content review (Opus reviewer, 2026-11-15)

Checked against `docs/ux/CONTENT-AUDIT.md`. Not committed. Device checks skipped: the iPhone returned the black 49,772-byte screenshot (screen off).

Checks after the reviewer's fixes: `npx tsc --noEmit` (apps/native) clean, backend `tsc -p convex` clean, `npx ultracite check src app` clean (200 files), domain tests 46/46, `bun test apps/native` 120 pass / 5 fail (see R1).

## Fixed by the reviewer

- Create P0 1: pace was still dropped. `CreateTripPayload` and `getCreateTripPayload` now send `pace`; backend `createTrip` takes `pace: v.optional(v.string())` and stores `args.pace ?? "balanced"` (was hard-coded `"moderate"`).
- Create P0 4 (backend half): `createTrip` title fallback is now `args.title || (args.destination ? \`${args.destination} Trip\` : "New trip")` (was " Trip" for an empty destination).
- Trips P1 3: `trip-row.tsx` now shows "El Nido · 21–25 Nov · 5 days", a second line "`{percent}% ready · {done} of {active} done`" from the `searchTrips` snapshot (active phases only, `subtitleLines` 2), and an accessibility label with the countdown. `Trip` type extended with the optional snapshot fields.
- Chat P1 2: `viya-chat-utils.ts` had its own `getNextTrip` (no in-progress-first, no undated). It now delegates to the domain `getNextTrip`, so chat, Discover and Vault agree on "next trip".
- Section 8: deleted `next-best-action-card.tsx`, `itinerary-preview.tsx`, `trip-module-manual-entry-card.tsx` (no importers).
- Copy: "Wanderlog-style" removed from the itinerary prompt; "Unable to continue with this provider. Please try again." → "Could not continue with this provider. Try again."; `personal-info-sheet.tsx` placeholder name "Viya traveler" removed.

## Still open

R1. **P0 (5 failing tests, lost controls).** `app/(app)/trips/[tripId]/risks.tsx` is now a redirect to Readiness (Risks segment), so these contract tests fail: `trip-map-actions-contract`, `trip-risks-empty-top-risk-action-contract`, `trip-risks-linked-navigation-contract`, `trip-linked-label-contract`, `trip-risks-top-risk-actions-contract`. The old screen's behaviour did not move with it: a risk can be linked to a booking, stop, file, expense or note in the sheet (`relatedEntityKey`), but no row offers "Open linked item", and linked labels do not use `getTripRelatedEntityLabelByKey`. Fix: in `readiness-screen.tsx` risk rows, add the label from `getTripRelatedEntityLabelByKey` to the subtitle and a swipe or sheet row "Open linked item" that routes through a `getRiskRelatedHref` (itinerary, bookings, vault, budget, notes; copy it from `git show HEAD:'apps/native/app/(app)/trips/[tripId]/risks.tsx'`). Then repoint the five tests' `readFileSync` path to `src/features/readiness/readiness-screen.tsx` and update the expectations for removed features ("TopRiskSummary", "Add top risk", "Open Maps" on risks) to the Readiness strings. Do not delete the tests.

R2. **P2 duplicate formatter.** Local word-capitalising helpers duplicate `formatEnumLabel`: `trip-notes-screen.tsx:75`, `trip-places-screen.tsx:63`, `trip-related-entities.ts:178`, `trip-companions-screen.tsx:70`. Replace each with `formatEnumLabel` from `@/src/lib/format`.

R3. **P2 AI prompt money.** `trip-dashboard-components.tsx:1079` builds `${currency} ${amount.toLocaleString("en-US")} budget` for the autopilot prompt. Allowed (model text, not UI) but uses `max(vaultItems, documents)` for coverage at `:1081`; switch it to `getVaultCounts(...).files` to match the dashboard row.

R4. **P2 Travel Mode vault rows.** Vault booking/document rows in the Documents group still use the raw `item.fileName` as detail (`trip-travel-mode-screen.tsx:642`). Use `[vaultKindLabels[kind], formatFileSize(fileSize)].filter(Boolean).join(" · ")`.

R5. **Device pass.** Screenshot Discover, Trips, a trip dashboard, Budget and Profile in light and dark once the phone is awake (CLAUDE.md Definition of done 4).
