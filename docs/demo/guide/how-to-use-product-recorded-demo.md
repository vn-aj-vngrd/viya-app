# How to Use the Product: Recorded Demo Guide

## Goal

Record a smooth council-facing walkthrough that proves Viya is an AI travel workspace, not a static itinerary tool. The story starts at the getting started page, moves through login and onboarding, creates a Singapore Tech Week trip, then shows AI turning that trip into a ready workspace across itinerary, budget, Vault, readiness, and the main-tab chat.

Use this guide as the read-aloud script and operator checklist. The fixture data and workspace behavior should continue to match `docs/demo/ai-workspace-happy-path.md` and `docs/demo/prompts.md`.

## Demo Strategy

Keep the demo focused on one viewer, one problem, and one outcome: a busy builder team needs to turn scattered travel details into a ready Singapore business-conference trip. Product demo guidance consistently recommends leading with the problem, showing the product solving it in the shortest path, and ending with the outcome instead of listing every feature.

Research notes applied here:

- TechCrunch hackathon demo guidance: set the scene quickly, show the working project, then wrap with impact.
- LeadDev demo framing: make the problem accessible, prepare pasted text ahead of time, keep windows/files ready, and end with next steps.
- Screen Script product demo guidance: avoid a feature tour; show one problem being solved in real time.
- Interledger hackathon guide: rehearse, time the demo, keep it concise, and keep a backup recording.

Sources:

- [How To Present A Successful Hackathon Demo](https://techcrunch.com/2014/09/01/how-to-crush-your-hackathon-demo/)
- [Framing a demo](https://leaddev.com/wp-content/uploads/2024/10/Framing__-a__demo__LDMO__.pdf)
- [Product Demos: The Complete Guide](https://screenscript.app/create-product-demos)
- [How to Hackathon](https://interledger.org/sites/default/files/document-uploads/how-to-hack.pdf)

## Recording Setup

Target length: 6 to 8 minutes.

Recording format: screen plus voiceover. Keep the pointer visible and move deliberately. Pause for one beat after each AI result so reviewers can read the screen.

Before recording:

1. Open the app at the getting started page.
2. Have the demo account ready. Do not narrate credentials.
3. Keep this file open off-camera for the script.
4. Keep `docs/demo/fixtures/` ready for Vault uploads.
5. Copy the prompts in the Clipboard Bank section into a notes file so you can paste them quickly.
6. If AI response time is slow, keep speaking about what Viya is doing: asking only for missing context, staging reviewable changes, and grounding the workspace with Vault proof.

## Clipboard Bank

### Opening Trip Prompt

```txt
Viya, plan my Singapore group business-conference reward trip. I'm going for Tech Week, want it polished but not exhausting, and I need the workspace to handle flights, hotel, event pass, budget, itinerary, readiness, and a little victory lap. Ask only what you need, then build the trip.
```

### Trip Creation Answers

```txt
Dates: September 28 to October 1, 2026.
Conference days: September 29 and September 30.
Budget comfort: PHP 90,000.
Hotel preference: near Marina Bay or City Hall, close enough to keep transfers easy.
Free time: food, skyline, one victory-lap moment, no packed evenings.
```

### Itinerary Prompt

```txt
Generate a realistic 4-day Singapore itinerary for this group business-conference reward trip. Use the flight, hotel, Tech Week pass, budget, readiness notes, and conference anchor. Keep conference days focused, add buffers, keep evenings light, and include one small victory-lap moment.
```

### Budget Prompt

```txt
Review this Singapore trip budget against the PHP 90,000 planning ceiling. Use confirmed flight, hotel, and receipt evidence from Vault, call out remaining room, and suggest one practical budget move without overpacking the trip.
```

### Readiness Prompt

```txt
Audit this Singapore trip for 100% travel preparedness. Check passport validity, SG Arrival Card, flight, hotel, event badge pickup, budget, receipt evidence, airport transfer buffers, conference outfit, jet lag, and schedule overload. Create only the missing reviewable readiness actions.
```

### Main Tab Chat Prompt

```txt
For my Singapore Tech Week trip, what is the smartest next thing to check before departure, and what evidence are you using from the workspace?
```

## Onboarding Answers

If the current app shows the eight-question onboarding flow, use these choices:

| Screen Question | Demo Answer |
| --- | --- |
| What trip vibe do you usually want? | Luxury |
| How packed should your days feel? | Moderate |
| What budget comfort fits you best? | Mid-range |
| What should Viya look for? | Food, Culture, Hidden gems |
| How should food fit into your trips? | Local eats |
| Who do you usually travel with? | Work |
| How should Viya make suggestions? | Give me options |
| Any needs Viya should remember? | Rest breaks |

If the app shows the older onboarding fields instead, use:

```txt
Home base: Manila.
Travel style: polished, efficient, not exhausting.
Budget currency: PHP.
AI preference: ask me for decisions, then act as an agent when I confirm.
Vault preference: save confirmations, receipts, passes, and readiness notes.
```

## Demo Flow

### 1. Getting Started and Login

Operator action:

1. Start on the getting started page.
2. Tap the primary continue/get started action.
3. Log in with the demo account.
4. Move through onboarding using the answers above.

Voiceover:

> Viya starts like a normal travel app, but the setup is doing something important. I am not just creating an account. I am giving Viya the defaults it needs to plan around pace, budget, travel style, and how much help I want from AI.
>
> For this demo, I am setting up a polished but realistic work trip profile: useful for a small team, not a packed vacation itinerary, and not a blank chat window.

Screen beat:

Pause on the onboarding completion or welcome state long enough to show that the profile is finished.

### 2. Home: Show Context Before Planning

Operator action:

1. Land on Home.
2. Scroll slowly through the dashboard.
3. Briefly show suggestions, prompts, and the start-planning card.
4. Do not open every card; keep the point on personalization and next actions.

Voiceover:

> This is the first product point: Home is already contextual. Viya is not asking me to start from a spreadsheet or a giant form. It gives me travel ideas and next actions based on my preferences.
>
> But the real proof is what happens when a vague travel goal becomes a workspace. I am going to create the Singapore example we use for the demo: a small team heading to Tech Week, with a budget, documents, readiness checks, and a plan that stays practical.

Screen beat:

End this section with the create-trip entry visible.

### 3. Trips: Create the Singapore Trip

Operator action:

1. Go to the Trips tab.
2. Tap Create trip or New trip.
3. Choose the AI-guided creation path if the app asks.
4. Paste the Opening Trip Prompt.
5. Let Viya ask one setup question at a time.
6. Answer with the Trip Creation Answers.
7. Confirm or create the Trip Blueprint when Viya presents it.

Voiceover:

> I am starting with a natural prompt, the way a traveler would actually think: destination, purpose, vibe, and what needs to be handled.
>
> Notice the interaction pattern. Viya does not dump a long form on me. It asks only the missing questions: dates, budget comfort, hotel preference, and what free time should feel like.
>
> Once the answers are in, Viya turns the conversation into a Trip Blueprint. This is the handoff from chat to product: destination, route, dates, travelers, budget, pace, requirements, and next actions are now structured enough to become a workspace.

Screen beat:

Pause on the Trip Blueprint, then confirm and open the workspace.

Expected trip:

- Name: Singapore Group Tech Week Reward, or similar.
- Destination: Singapore.
- Dates: September 28 to October 1, 2026.
- Budget: PHP 90,000.
- Purpose: business conference reward trip.
- Conference anchor: Tech Week Singapore at Marina Bay Sands.

### 4. Workspace Overview: Explain the AI Contract

Operator action:

1. Let the Trip Workspace Overview load.
2. Point out the workspace modules.
3. Tap Complete this trip if available.
4. If Viya stages drafts, describe them as reviewable changes.

Voiceover:

> This is the core of Viya. The trip is no longer just a chat. It has modules: itinerary, budget, Vault, readiness, and Viya as the agent that connects them.
>
> The important design choice is control. Viya can act, but it stages changes for review. That means AI can generate real workspace updates without silently rewriting the trip.

Screen beat:

Keep this section short. The module-by-module proof starts next.

## Workspace Showcase

Show AI integration only. Avoid narrating static UI details unless they prove that AI updated or connected the workspace.

### 5. Itinerary: Generate the Plan

Operator action:

1. Open Itinerary.
2. Use the itinerary AI action or Ask Viya for this trip.
3. Paste the Itinerary Prompt.
4. Generate and apply the itinerary draft.
5. Scroll through the four-day plan.

Voiceover:

> First, itinerary. The value here is not that AI can write a list of places. The value is that it is using the actual trip context: arrival timing, conference days, the hotel area, the team pace, and the goal of keeping evenings light.
>
> A good conference trip needs buffers. Viya builds around that: arrival, check-in, focused Tech Week blocks, badge pickup, a skyline moment, and departure without turning the schedule into a sprint.

What to show:

- Four days: September 28, 29, 30, and October 1.
- Arrival and hotel check-in on day one.
- Conference blocks on September 29 and 30.
- Light evening or recovery buffers.
- Departure timing on October 1.

### 6. Budget: Show AI-Aware Spend

Operator action:

1. Open Budget.
2. Show the PHP 90,000 planning ceiling.
3. If needed, use the budget AI action or Ask Viya with the Budget Prompt.
4. Show confirmed spend from flight and hotel once fixture evidence is uploaded, or explain that this will update after Vault sync if you have not uploaded yet.

Voiceover:

> Next is budget. Viya treats the budget as a living part of the trip, not a number buried in a note.
>
> The planning ceiling is PHP 90,000. As confirmations and receipts come into Vault, Viya can connect them back here, calculate what is already committed, and explain the remaining room in plain language.
>
> This matters for travelers because the budget is where hidden stress usually appears: flights in one app, hotel somewhere else, receipts in screenshots, and no single answer to, "Are we still okay?"

What to show:

- PHP 90,000 budget.
- Flight evidence: PHP 21,800.
- Hotel evidence: PHP 32,400.
- Receipt evidence: SGD 82.
- Remaining budget or budget status once available.

### 7. Vault: Upload the Grounding Evidence

Operator action:

1. Open Vault.
2. Upload or inject these fixture files:
   - `docs/demo/fixtures/singapore-flight-confirmation.txt`
   - `docs/demo/fixtures/singapore-hotel-voucher.txt`
   - `docs/demo/fixtures/singapore-tech-week-pass.txt`
   - `docs/demo/fixtures/singapore-expense-receipt.txt`
   - `docs/demo/fixtures/singapore-readiness-note.txt`
3. For each TripSync review, confirm the extracted details.
4. Show linked booking, budget, document, and readiness updates where visible.

Voiceover:

> Vault is the grounding layer. Instead of asking AI to imagine the trip, I am giving it proof: the flight confirmation, hotel voucher, event pass, receipt, and a readiness note.
>
> TripSync extracts the important details, but it still asks for review before saving. That is the trust model: AI reads the file, proposes structured updates, and I approve what becomes part of the trip.
>
> After this, the workspace is not just a generated plan. It has evidence: confirmations, amounts, dates, venue details, and reminders connected back to the trip.

What to show:

- Flight: Manila to Singapore, September 28, 2026, 09:10 to 12:55.
- Return: October 1, 2026, 18:35 to 22:20.
- Hotel: City Hall Business Hotel, Marina Bay / City Hall.
- Event: Tech Week Singapore, September 29 to 30, Marina Bay Sands.
- Receipt: SGD 82 transport/arrival essentials.
- Readiness note: passport, SG Arrival Card, badge pickup, smart casual outfit, jet lag.

### 8. Readiness: Finish With Preparedness

Operator action:

1. Open Readiness.
2. Run or trigger the readiness audit.
3. Paste the Readiness Prompt if needed.
4. Apply staged readiness actions.
5. Show the final readiness state.

Voiceover:

> Readiness is where Viya proves the trip is actually usable. The question is not "Did we generate a nice itinerary?" The question is, "Can this team leave for Singapore without missing something important?"
>
> Viya checks the workspace: passport, SG Arrival Card, flight, hotel, badge pickup, budget evidence, airport transfer buffers, conference outfit, and schedule overload.
>
> This is the outcome I want the council to see. Viya does not stop at inspiration. It turns the trip into a prepared workspace.

What to show:

- Readiness score moving toward complete.
- Missing or completed items.
- Evidence-backed checks from itinerary, budget, and Vault.
- Final state near or at 100% travel preparedness.

### 9. Main Bottom Bar Chat: Ask Viya Across Trips

Operator action:

1. Go to the main bottom-bar Viya chat tab, not only the workspace chat.
2. Select the Singapore Tech Week trip if a trip selector appears.
3. Paste the Main Tab Chat Prompt.
4. Let Viya answer using the selected trip context.

Voiceover:

> Last, I want to show the global AI entry point. I am leaving the workspace module and using Viya from the main bottom bar.
>
> I select the Singapore trip and ask a normal traveler question: what should I check next before departure, and what evidence are you using?
>
> The answer should come from the workspace, not generic travel advice. That is the product loop: Viya can chat, but the chat is grounded in the selected trip, its Vault files, its budget, its itinerary, and its readiness state.

Good expected answer:

- Check SG Arrival Card timing, passport validity, and badge pickup.
- Mentions evidence from the Singapore readiness note, Tech Week pass, flight confirmation, and hotel voucher.
- Suggests a next action without inventing reservations.

## Closing Script

Operator action:

End on either the Readiness screen at the final score or the Workspace Overview showing connected modules.

Voiceover:

> That is Viya end to end. We started from the getting started page, created a profile, turned a natural Singapore trip idea into a structured workspace, generated an itinerary, connected budget, uploaded real trip evidence into Vault, ran readiness, and then used the main Viya chat to ask a grounded question across the trip.
>
> The product promise is simple: plan in Viya, book anywhere, and let Viya organize the trip into one AI-assisted workspace. For travelers, that means less scattered planning. For this challenge, it shows AI across the full lifecycle: ask, shape, sync, audit, and guide.

## Smooth Delivery Notes

- Speak before you tap. Tell the viewer what they are about to see, then show it.
- Do not read every card on screen. Call out only the evidence that proves AI context or workspace connection.
- If the AI response takes time, narrate the contract: Viya is using the selected trip, staging changes, and waiting for review.
- Do not over-explain login, navigation, or button labels. The council is judging the product workflow.
- Keep the cursor still while AI text streams so the recording feels intentional.
- If something fails during a live recording, use the fallback line: "For the recording, I am going to continue with the prepared Singapore fixture state so the council can still evaluate the intended workspace behavior."

## Acceptance Checklist

- The recording starts on the getting started page.
- Login is shown briefly.
- Onboarding questions are answered.
- Home is shown and scrolled before trip creation.
- Trips tab is opened.
- New trip is created with the Singapore prompt.
- Viya asks focused setup questions.
- The Singapore Trip Blueprint is confirmed.
- Workspace Overview is shown.
- Itinerary is generated first.
- Budget AI/budget context is shown second.
- Vault fixture files are uploaded and reviewed third.
- Readiness audit is shown fourth.
- Main bottom-bar chat is used last with the Singapore trip selected.
- Final screen shows either 100% readiness or the connected workspace state.
