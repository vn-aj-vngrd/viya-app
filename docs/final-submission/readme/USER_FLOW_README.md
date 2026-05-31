# Viya User Flow README

## Primary User Flow

1. Open Viya.
2. Complete authentication and preference onboarding.
3. Review Home for active trips, prompts, and ideas.
4. Create a trip with destination, dates, budget, purpose, pace, and traveler context.
5. Open Trip Overview.
6. Ask Viya to generate or audit the needed module.
7. Review AI-staged changes before applying them.
8. Add confirmations, receipts, passes, and notes to Vault.
9. Check itinerary, budget, bookings, risks, and readiness.
10. Resolve readiness blockers until the trip is ready.

## Key Screens

- `Home` - active trip, destination suggestions, quick prompts.
- `Trips` - trip library, filters, search, and creation entry.
- `Create Trip` - guided setup flow.
- `Ask Viya` - chat and trip-scoped AI operations.
- `Trip Overview` - workspace summary and next best action.
- `Workspace Switcher` - quick jump between trip modules.
- `Itinerary` - days, stops, planned count, and pace.
- `Budget` - budget status, daily safe spend, and expenses.
- `Vault` - uploaded files and AI extraction review.
- `Readiness` - tasks, blockers, score, and final preparation state.

## Recommended Prompt Style

Good prompts are short, concrete, and tied to a module:

```txt
Build a realistic 4-day itinerary for this trip. Keep conference days focused, add buffers, keep evenings light, and include one victory-lap moment.
```

```txt
Review this budget against the PHP 90,000 planning ceiling. Use confirmed flight, hotel, and receipt evidence from Vault.
```

```txt
Audit readiness before departure. Check documents, bookings, budget, event badge pickup, transfer buffers, and schedule overload.
```

## User Control Rule

Viya can generate and audit, but meaningful workspace updates should be reviewable. The user should understand what will change before applying AI output.

