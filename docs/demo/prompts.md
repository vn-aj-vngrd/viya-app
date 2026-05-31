# Singapore Group Demo Prompts

## Manual Trip Setup

Use manual trip creation after the presenter reaches Home, opens the Trips screen, and taps Create trip.

```txt
Trip name: Singapore Group Tech Week Reward
Destination: Singapore
Trip dates: September 28 to October 1, 2026
Travelers: 4
Budget: PHP 90,000
Pace: balanced, polished, not exhausting
Purpose: Tech Week Singapore business-conference reward trip
Hotel preference: Marina Bay or City Hall
Free time: light food, skyline, one victory-lap moment, no packed evenings
```

## Onboarding Answers

Use these demo answers when the app asks onboarding questions:

```txt
Home base: Manila.
Travel style: polished, efficient, not exhausting.
Budget currency: PHP.
AI preference: ask me for decisions, then act as an agent when I confirm.
Vault preference: save confirmations, receipts, passes, and readiness notes.
```

## Workspace Module Actions

Use the first `TRY ASKING` row in each module chat for AI generation. Do not use the removed Overview autopilot card.

```txt
Itinerary: Generate itinerary
Vault: Upload files
Budget: Sync budget
Readiness: Complete readiness
```

## Vault Fixture Categories

These fixture names are deterministic demo inputs only. Production AI behavior must remain trip-agnostic and use the current trip profile plus uploaded evidence.

```txt
singapore-flight-confirmation.txt: booking proof / flight ticket
singapore-hotel-voucher.txt: booking proof / hotel voucher
singapore-tech-week-pass.txt: event proof / permit
singapore-expense-receipt.txt: receipt / budget evidence
singapore-readiness-note.txt: readiness note / checklist evidence
```

## Viya Demo Behavior Prompt

```txt
You are Viya, an AI travel workspace agent.

Lead a Singapore group business-conference reward trip from structured setup to ready workspace. Use Agent Mode inside each module when the user asks Viya to generate, adjust, and act.

For this demo:
1. Start from the manually created Singapore group trip for September 28 to October 1, 2026.
2. Generate a polished but not exhausting itinerary before Vault uploads.
3. Treat Vault files as grounding context for bookings, documents, expenses, and readiness.
4. Sync budget only from the planning ceiling, confirmed bookings, and receipt evidence.
5. Audit readiness across itinerary, Vault, budget, and trip requirements.
6. Finish only when the workspace can show 100% travel preparedness.
7. Keep the tone witty and confident, but do not invent real reservations outside fixture data.
```

## Collaboration Questions

Use these questions to show that the user can keep collaborating with Viya after the workspace exists:

```txt
For my Singapore Tech Week trip, what is the smartest next thing to check before departure, and what evidence are you using from the workspace?
Now that readiness is at 100%, what should I watch on travel day so the conference schedule stays light and the budget stays on track?
```

## Itinerary Prompt

```txt
Generate a realistic 4-day Singapore itinerary for this group business-conference reward trip. Use the flight, hotel, Tech Week pass, budget, readiness notes, and conference anchor. Keep conference days focused, add buffers, keep evenings light, and include one small victory-lap moment.
```

## Readiness Prompt

```txt
Audit this Singapore trip for 100% travel preparedness. Check passport validity, SG Arrival Card, flight, hotel, event badge pickup, budget, receipt evidence, airport transfer buffers, conference outfit, jet lag, and schedule overload. Create only the missing reviewable readiness actions.
```
