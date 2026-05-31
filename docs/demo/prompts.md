# Singapore Solo Demo Prompts

## User Opening Prompt

Use this prompt after the presenter reaches Home, opens the Trips screen, and taps Create trip.

```txt
Viya, plan my solo Singapore business-conference reward trip. I'm going for Tech Week, want it polished but not exhausting, and I need the workspace to handle flights, hotel, event pass, budget, itinerary, readiness, and a little victory lap. Ask only what you need, then build the trip.
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

## Trip Creation Answers

Use these answers when Viya enters Ask Mode and asks Trip creation questions:

```txt
Dates: September 28 to October 1, 2026.
Conference days: September 29 and September 30.
Budget comfort: PHP 90,000.
Hotel preference: near Marina Bay or City Hall, close enough to keep transfers easy.
Free time: food, skyline, one victory-lap moment, no packed evenings.
```

## Workspace Autopilot Prompt

This is the Singapore demo example. In the app, generate the autopilot prompt from the current trip title, destination, dates, traveler context, budget, and module coverage instead of hardcoding Singapore or Tech Week. The production behavior must remain trip-agnostic.

```txt
Complete this Singapore business-conference reward trip workspace. Use the trip profile, Vault, bookings, budget, itinerary, risks, readiness, and travel mode together. Stage the work as reviewable changes: prepare Vault, identify missing booking proof, generate a realistic itinerary, track budget evidence, add risks and backups, run a readiness audit, and prepare travel mode context. Keep the tone witty, polished, and practical for a solo builder heading to Tech Week.
```

Production note: `Complete this trip` should stage generic module drafts from the current workspace state. It should identify missing booking proof instead of inventing confirmed reservations; fixture uploads are what create confirmed demo bookings.

## Viya Demo Behavior Prompt

```txt
You are Viya, an AI travel workspace agent.

Lead a solo Singapore business-conference reward trip from idea to ready workspace. Start in Ask Mode: ask one question at a time only when a decision is required. Move to Agent Mode when the user confirms that you should generate, adjust, and act.

For this demo:
1. Build a practical Trip Blueprint.
2. Create a Singapore solo trip for September 28 to October 1, 2026.
3. Use Tech Week Singapore and Marina Bay Sands as the conference anchor.
4. Treat Vault files as grounding context for bookings, documents, expenses, and readiness.
5. Generate a polished but not exhausting itinerary.
6. Audit readiness across itinerary, Vault, bookings, budget, risks, and travel mode.
7. Finish only when the workspace can show 100% travel preparedness.
8. Keep the tone witty and confident, but do not invent real reservations outside fixture data.
```

## Trip Blueprint Headings

The Trip Blueprint must use these exact headings so the app parser can create the trip:

```txt
## Trip Blueprint
### Destination
### Route
### Dates
### Travelers
### Budget allocation
### Pace
### Itinerary style
### Booking targets
### Requirements
### Risks
### Next actions
```

## Collaboration Questions

Use these questions to show that the user can keep collaborating with Viya after the workspace exists:

```txt
What is missing before this is travel-ready?
Can you make the conference days less exhausting?
What should I keep handy when Travel Mode starts?
Act on the missing prep, but stage anything I should review.
```

## Itinerary Prompt

```txt
Generate a realistic 4-day Singapore itinerary for this solo business-conference reward trip. Use the flight, hotel, Tech Week pass, budget, readiness notes, and conference anchor. Keep conference days focused, add buffers, keep evenings light, and include one small victory-lap moment.
```

## Readiness Prompt

```txt
Audit this Singapore trip for 100% travel preparedness. Check passport validity, SG Arrival Card, flight, hotel, event badge pickup, budget, receipt evidence, airport transfer buffers, conference outfit, jet lag, schedule overload, and Travel Mode shortcuts. Create only the missing reviewable readiness actions.
```
