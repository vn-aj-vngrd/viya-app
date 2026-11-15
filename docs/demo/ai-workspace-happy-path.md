# Singapore Group AI Workspace Happy Path

## Demo Frame

This demo tells a Singapore group business-conference reward trip story. Viya acts as a sharp travel chief-of-staff: practical, witty, and focused on turning a travel idea into a connected, ready workspace.

The trip is fictional demo data. The bookings and fixture documents are not real reservations.

Product guardrail: Singapore is only the demo scenario. The production flow must stay trip-agnostic: every AI prompt, workspace action, and readiness check must use the current trip profile and workspace state for any destination, traveler type, budget, date range, and trip purpose.

## Product Principle

Viya should not feel like open-ended chat first. The demo should show two complementary modes:

- Ask Mode: Viya asks only the missing questions needed to create or adjust the trip.
- Agent Mode: Viya can generate, adjust, and act by staging reviewable changes across the workspace.

The user can still ask questions to Viya at any point, but the proof is that answers can become structured workspace changes instead of staying in chat.

## Demo Goal

End with 100% travel preparedness for a Singapore group reward trip. Every connected trip module should have visible evidence:

- Itinerary: four planned days with realistic buffers.
- Vault: flight, hotel, event pass, receipt, and readiness note saved.
- Budget: PHP planning budget, confirmed costs, and SGD receipt evidence.
- Readiness: passport, SG Arrival Card, badge pickup, flight, hotel, budget, schedule, and outfit checks.

## Manual Trip Setup

Use manual trip creation for the recording so the workspace starts from structured trip facts instead of a planning conversation.

```txt
Trip name: Singapore Group Tech Week Reward
Destination: Singapore
Dates: September 28 to October 1, 2026
Travelers: 4
Budget: PHP 90,000
Pace: balanced, polished, not exhausting
Purpose: Tech Week Singapore business-conference reward trip
Hotel preference: Marina Bay or City Hall
Free time: light food, skyline, one victory-lap moment, no packed evenings
Readiness needs: passport validity, SG Arrival Card, event badge pickup, airport transfer buffers, conference outfit, weather backup, emergency contacts, and team handoff
```

## Presenter Script

1. Open Viya.
2. Log in with Google, GitHub, or email using a test account.
3. Answer onboarding questions with travel preferences:
   - Home base: Manila.
   - Travel style: polished, efficient, not exhausting.
   - Budget currency: PHP.
   - AI help preference: ask first for decisions, act when the user confirms.
   - Document comfort: save travel confirmations in Vault.
4. Land on Home and point out that Viya has enough profile context to personalize travel planning without hardcoding a destination.
5. Go to the Trips screen.
6. Tap Create trip.
7. Use the manual trip form and enter the Singapore demo details.
8. Review the structured trip summary and create the trip.
9. The app opens the Trip Workspace Overview.
10. Confirm `Open Viya for this trip` is visible.
11. Open Itinerary, tap the module Viya chat button, and run the first `TRY ASKING` action: `Generate itinerary`.
12. Return to Itinerary and show four filled days. Full days should have 5-6 timed stops, and arrival or departure days should have at least 4 timed stops.
13. Open Vault and upload or inject the demo fixture files:
    - `singapore-flight-confirmation.txt`: booking proof / flight ticket.
    - `singapore-hotel-voucher.txt`: booking proof / hotel voucher.
    - `singapore-tech-week-pass.txt`: event proof / permit.
    - `singapore-expense-receipt.txt`: receipt / budget evidence.
    - `singapore-readiness-note.txt`: readiness note / checklist evidence.
14. Confirm each TripSync review.
15. Show Vault creating linked booking, document, expense, and readiness evidence from the extracted Singapore data.
16. Open Budget, tap the module Viya chat button, and run the first `TRY ASKING` action: `Sync budget`.
17. Show the PHP 90,000 planning ceiling, confirmed flight and hotel costs, SGD 82 receipt evidence, and remaining budget.
18. Open Readiness, tap the module Viya chat button, and run the first `TRY ASKING` action: `Complete readiness`.
19. Show readiness at 100% after the five reviewed files ground every readiness category.
20. Use the main bottom-bar Viya chat and ask two questions:
    - "For my Singapore Tech Week trip, what is the smartest next thing to check before departure, and what evidence are you using from the workspace?"
    - "Now that readiness is at 100%, what should I watch on travel day so the conference schedule stays light and the budget stays on track?"
21. Confirm Viya answers from the selected trip's itinerary, Vault files, budget, and readiness state.
22. Return to Overview or Readiness and show the connected final state at 100% travel preparedness.

## Voiceover Beats

- "Viya starts by asking only what it needs. The user is not filling out a giant form."
- "Once the trip exists, Viya moves from asking to acting, but every change is reviewable."
- "The Vault is the grounding layer: flight, hotel, event pass, receipt, and readiness notes become linked trip data."
- "The itinerary is generated after the trip has context, so the plan is not floating in a blank chat."
- "Readiness is the final proof. Viya checks the workspace, not just the conversation."
- "Singapore fixture extraction is deterministic for the recording; the AI actions remain trip-agnostic and use whatever trip context and evidence the workspace contains."

## Expected Final State

- Trip Profile: `Singapore Group Tech Week Reward`
- Destination: `Singapore`
- Dates: `2026-09-28` to `2026-10-01`
- Travelers: small team
- Itinerary: 4 days
- Vault: 5 fixture files
- Budget: PHP 90,000 planning ceiling, PHP flight and hotel costs, plus SGD 82 expense evidence
- Readiness: 100% travel preparedness with no critical blocker after final checks
