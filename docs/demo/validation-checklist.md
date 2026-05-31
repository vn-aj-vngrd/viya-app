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
2. Log in with the demo account.
3. Answer onboarding questions using the demo profile:
   - Home base: Manila.
   - Travel style: polished, efficient, not exhausting.
   - Budget currency: PHP.
   - AI preference: ask first for decisions, act when confirmed.
   - Vault preference: save confirmations, receipts, passes, and readiness notes.
4. Confirm Home loads after onboarding.
5. Go to the Trips screen.
6. Tap Create trip.
7. Send the Singapore demo prompt.
8. Confirm Viya enters Ask Mode and asks only the key Trip creation questions for dates, budget comfort, hotel preference, and free-time style.
9. Answer with the Singapore demo details:
   - September 28 to October 1, 2026.
   - Conference days September 29 and September 30.
   - PHP 90,000 planning ceiling.
   - Hotel near Marina Bay or City Hall.
   - Light food, skyline, networking, and no packed evenings.
10. Confirm the Trip Blueprint creates a Singapore group trip without depending on hardcoded Singapore product behavior.
11. Confirm the new trip opens to Trip Workspace Overview.
12. Confirm `Open Viya for this trip` is visible.
13. Confirm `Complete this trip` appears above the workspace modules.
14. Confirm the `Complete this trip` card copy is generic and does not mention Singapore unless the opened trip itself is the Singapore demo trip.
15. Tap `Complete this trip`.
16. Confirm Viya stages reviewable Agent Mode drafts on the Overview card for itinerary, Vault/documents, budget, and readiness.
17. Tap `Ask Viya` and confirm Trip mode opens with a prompt generated from the current trip profile and workspace state.
18. Confirm Viya can explain the staged changes, ask only for missing decisions, and avoid inventing uploaded documents.
19. Upload or inject the fixture files:
    - `singapore-flight-confirmation.txt`
    - `singapore-hotel-voucher.txt`
    - `singapore-tech-week-pass.txt`
    - `singapore-expense-receipt.txt`
    - `singapore-readiness-note.txt`
20. Confirm TripSync review extracts Singapore details for each fixture.
21. Confirm the Vault review creates linked documents, expenses, and readiness items.
22. Ask these questions to Viya:
    - "What is missing before this is travel-ready?"
    - "Can you make the conference days less exhausting?"
    - "What is still blocking 100% readiness?"
    - "Act on the missing prep, but stage anything I should review."
23. Confirm Viya can answer questions in Ask Mode and generate, adjust, and act in Agent Mode.
24. Generate and apply the itinerary draft.
25. Apply readiness drafts.
26. Run readiness audit.
27. Open each module and confirm:
    - Itinerary: 4 days with arrival, conference blocks, buffers, light recovery, and departure.
    - Vault: 5 fixture files saved.
    - Budget: PHP planning budget, PHP confirmed costs, and SGD 82 tracked expense.
    - Readiness: passport, SG Arrival Card, event badge, hotel, flight, budget, schedule, outfit, and document checks.
28. Return to Overview and confirm the workspace shows 100% travel preparedness.

## Acceptance Criteria

- The demo works without live AI keys for known fixture filenames.
- The product autopilot entry is trip-agnostic; Singapore appears only in demo docs, fixture filenames, fixture extraction, or a Singapore trip's actual profile.
- Viya uses Ask Mode for missing decisions and Agent Mode for reviewable workspace actions.
- Persistent changes are reviewable before applying.
- The final visible workspace proves that Home suggestions, AI chat, trip creation, itinerary, Vault, budget, and readiness are connected.
- The app-level validation is performed in the iOS Simulator, not only through source checks.
