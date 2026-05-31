# Singapore Solo AI Workspace Happy Path

## Demo Frame

This demo tells a solo Singapore business-conference reward trip story. Viya acts as a sharp travel chief-of-staff: practical, witty, and focused on turning a travel idea into a connected, ready workspace.

The trip is fictional demo data. The bookings and fixture documents are not real reservations.

Product guardrail: Singapore is only the demo scenario. The production flow must stay trip-agnostic: every AI prompt, workspace action, and readiness check must use the current trip profile and workspace state for any destination, traveler type, budget, date range, and trip purpose.

## Product Principle

Viya should not feel like open-ended chat first. The demo should show two complementary modes:

- Ask Mode: Viya asks only the missing questions needed to create or adjust the trip.
- Agent Mode: Viya can generate, adjust, and act by staging reviewable changes across the workspace.

The user can still ask questions to Viya at any point, but the proof is that answers can become structured workspace changes instead of staying in chat.

## Demo Goal

End with 100% travel preparedness for a solo Singapore reward trip. Every connected trip module should have visible evidence:

- Itinerary: four planned days with realistic buffers.
- Vault: flight, hotel, event pass, receipt, and readiness note saved.
- Bookings: confirmed flight and hotel, with the event pass linked as a document.
- Budget: PHP planning budget, confirmed costs, and SGD receipt evidence.
- Readiness: passport, SG Arrival Card, badge pickup, flight, hotel, budget, schedule, and outfit checks.
- Risks: jet lag, airport transfer buffer, badge pickup timing, and overscheduled conference days.
- Travel Mode: next event, hotel information, document shortcuts, and daily budget context.

## Opening Prompt

```txt
Viya, plan my solo Singapore business-conference reward trip. I'm going for Tech Week, want it polished but not exhausting, and I need the workspace to handle flights, hotel, event pass, budget, itinerary, readiness, and a little victory lap. Ask only what you need, then build the trip.
```

## Presenter Script

1. Open Viya.
2. Log in with the demo account.
3. Answer onboarding questions with travel preferences:
   - Home base: Manila.
   - Travel style: polished, efficient, not exhausting.
   - Budget currency: PHP.
   - AI help preference: ask first for decisions, act when the user confirms.
   - Document comfort: save travel confirmations in Vault.
4. Land on Home and point out that Viya has enough profile context to personalize travel planning without hardcoding a destination.
5. Go to the Trips screen.
6. Tap Create trip.
7. Send the opening prompt.
8. Viya enters Ask Mode and asks Trip creation questions one at a time:
   - "What dates should I use?"
   - "What budget comfort should I plan around?"
   - "Do you want the hotel optimized for the conference venue, recovery, or price?"
   - "What should free time feel like: food, sights, quiet reset, or networking?"
9. Answer with the Singapore demo details:
   - Dates: September 28 to October 1, 2026.
   - Conference days: September 29 and September 30, 2026.
   - Budget: PHP 90,000 planning ceiling.
   - Hotel preference: near Marina Bay or City Hall.
   - Free-time style: light food, one skyline moment, no packed evenings.
10. Viya generates a Trip Blueprint with:
    - Destination: Singapore.
    - Traveler: solo.
    - Purpose: business conference reward trip.
    - Event anchor: Tech Week Singapore at Marina Bay Sands.
    - Pace: polished but not exhausting.
    - Required modules: itinerary, Vault, bookings, budget, readiness, risks, and travel mode.
11. Confirm trip creation.
12. The app opens the Trip Workspace Overview.
13. Confirm `Open Viya for this trip` is visible.
14. Confirm `Complete this trip` appears above the workspace modules. The card is generic in-product; it becomes a Singapore demo only because this trip profile and fixture set are Singapore-specific.
15. Tap `Complete this trip`.
16. Viya enters Agent Mode directly on the Overview card and stages reviewable workspace drafts:
    - Create itinerary.
    - Prepare Vault.
    - Identify booking targets and missing proof.
    - Track budget.
    - Add risks and backups.
    - Run readiness audit.
    - Prepare Travel Mode context.
17. Upload or inject the demo fixture files in Vault:
    - `singapore-flight-confirmation.txt`
    - `singapore-hotel-voucher.txt`
    - `singapore-tech-week-pass.txt`
    - `singapore-expense-receipt.txt`
    - `singapore-readiness-note.txt`
18. Confirm each TripSync review.
19. Show Vault creating linked booking, document, expense, and readiness updates from extracted Singapore data.
20. Tap `Ask Viya` and ask questions to prove the collaboration loop:
    - "What is missing before this is travel-ready?"
    - "Can you make the conference days less exhausting?"
    - "Act on the missing prep, but stage anything I should review."
21. Viya answers in Ask Mode when explaining tradeoffs, then switches to Agent Mode when staging itinerary, risk, budget, readiness, and travel mode updates.
22. Apply the itinerary draft.
23. Apply the readiness and risk drafts.
24. Run the readiness audit.
25. Open each module and show final coverage.
26. Return to Overview and show the connected final state at 100% travel preparedness.

## Voiceover Beats

- "Viya starts by asking only what it needs. The user is not filling out a giant form."
- "Once the trip exists, Viya moves from asking to acting, but every change is reviewable."
- "The Vault is the grounding layer: flight, hotel, event pass, receipt, and readiness notes become linked trip data."
- "The itinerary is generated after the trip has context, so the plan is not floating in a blank chat."
- "Readiness is the final proof. Viya checks the workspace, not just the conversation."

## Expected Final State

- Trip Profile: `Singapore Solo Tech Week Reward`
- Destination: `Singapore`
- Dates: `2026-09-28` to `2026-10-01`
- Travelers: solo
- Itinerary: 4 days
- Vault: 5 fixture files
- Bookings: confirmed flight, confirmed hotel, and event pass document
- Budget: PHP 90,000 planning ceiling, PHP flight and hotel costs, plus SGD 82 expense evidence
- Readiness: 100% travel preparedness with no critical blocker after final checks
- Risks: jet lag, airport transfer buffer, badge pickup, and overscheduled conference days
- Travel Mode: next event, hotel details, document shortcuts, and daily budget context
