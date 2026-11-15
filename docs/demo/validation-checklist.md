# Singapore Demo Validation Checklist

## Code Validation

Run focused demo checks from the repository root:

```bash
bun test apps/native/src/features/trips/trip-dashboard-ai-demo-contract.test.mts packages/backend/test/singapore-demo-docs-contract.test.ts packages/backend/test/singapore-demo-fixtures.test.ts packages/backend/test/trip-vault-contract.test.ts packages/backend/test/trip-agent-draft-apply.test.ts
bun x tsc -p packages/backend/convex/tsconfig.json --noEmit
bun x ultracite check apps/native/src/features/trips/trip-dashboard-components.tsx apps/native/src/features/vault/tripsync-review-sheet.tsx packages/backend/convex/ai/features.ts packages/backend/convex/vault.ts packages/backend/test/trip-vault-contract.test.ts packages/domain/src/schemas/vault.ts apps/native/src/features/trips/trip-dashboard-ai-demo-contract.test.mts packages/backend/src/ai/singapore-demo-fixtures.ts packages/backend/test/singapore-demo-docs-contract.test.ts packages/backend/test/singapore-demo-fixtures.test.ts
```

Run Convex codegen from the backend package:

```bash
bun x convex codegen
```

Full repository gates before release:

```bash
bun x tsc -p apps/native/tsconfig.json --noEmit
bun x tsc -p packages/domain/tsconfig.json --noEmit
bun x ultracite check --max-diagnostics 50
```

## iOS Simulator Validation

Use the iOS Simulator for the full demo path. If the simulator is already authenticated, validate the workspace path first, then run a fresh-account pass when auth reset is available.

1. Open Viya.
2. Log in with Google, GitHub, or email using a test account.
3. Answer onboarding questions using the demo profile:
   - Home base: Manila.
   - Travel style: polished, efficient, not exhausting.
   - Budget currency: PHP.
   - AI preference: ask first for decisions, act when confirmed.
   - Vault preference: save confirmations, receipts, passes, and readiness notes.
4. Confirm Home loads after onboarding.
5. Go to the Trips screen.
6. Tap Create trip.
7. Use the manual trip form, not the AI conversation path.
8. Enter the Singapore demo details:
   - September 28 to October 1, 2026.
   - Conference days September 29 and September 30.
   - PHP 90,000 planning ceiling.
   - Hotel near Marina Bay or City Hall.
   - Light food, skyline, networking, and no packed evenings.
9. Confirm the manual trip review creates a Singapore group trip without depending on hardcoded Singapore product behavior.
10. Confirm the new trip opens to Trip Workspace Overview.
11. Confirm `Open Viya for this trip` is visible.
12. Open Itinerary, tap the module Viya chat button, and run the first `TRY ASKING` action: `Generate itinerary`.
13. Confirm the generated itinerary has multiple filled days, not only Day 1. Full days should have 5-6 timed stops, and arrival or departure days should have at least 4 timed stops.
14. Upload or inject the fixture files:
    - `singapore-flight-confirmation.txt`: booking proof / flight ticket.
    - `singapore-hotel-voucher.txt`: booking proof / hotel voucher.
    - `singapore-tech-week-pass.txt`: event proof / permit.
    - `singapore-expense-receipt.txt`: receipt / budget evidence.
    - `singapore-readiness-note.txt`: readiness note / checklist evidence.
15. Confirm TripSync review extracts Singapore details for each fixture.
16. Confirm the Vault review creates linked bookings, documents, expenses, and readiness items.
17. Open Budget, tap the module Viya chat button, and run the first `TRY ASKING` action: `Sync budget`.
18. Open Readiness, tap the module Viya chat button, and run the first `TRY ASKING` action: `Complete readiness`.
19. Ask these two questions in the main bottom-bar Viya chat with the Singapore trip selected:
    - "For my Singapore Tech Week trip, what is the smartest next thing to check before departure, and what evidence are you using from the workspace?"
    - "Now that readiness is at 100%, what should I watch on travel day so the conference schedule stays light and the budget stays on track?"
20. Confirm Viya answers from selected trip context and workspace evidence, not generic Singapore advice.
21. Open each module and confirm:
    - Itinerary: 4 days with arrival, conference blocks, buffers, light recovery, departure, 5-6 timed stops on full days, and at least 4 timed stops on arrival or departure days.
    - Vault: 5 fixture files saved.
    - Budget: PHP planning budget, PHP confirmed costs, and SGD 82 tracked expense.
    - Readiness: 100% with passport, SG Arrival Card, event badge, hotel, flight, budget, schedule, outfit, weather, safety, group, and backup-plan checks complete.
22. Return to Overview and confirm the workspace shows 100% travel preparedness.

## Acceptance Criteria

- The demo works without live AI keys for known fixture filenames.
- Product AI actions are trip-agnostic; Singapore appears only in demo docs, fixture filenames, fixture extraction, or a Singapore trip's actual profile.
- Viya uses Ask Mode for missing decisions and Agent Mode for reviewable workspace actions.
- Persistent changes are reviewable before applying.
- The final visible workspace proves that Home suggestions, AI chat, trip creation, itinerary, Vault, budget, and readiness are connected.
- The app-level validation is performed in the iOS Simulator, not only through source checks.
