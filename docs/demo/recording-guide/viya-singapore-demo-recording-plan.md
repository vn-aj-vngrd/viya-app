# Viya Singapore Demo Recording Guide

This guide is grouped by the exact screen flow for the recording. Each flow includes what to do on screen, what to say in voiceover, and any answers, prompts, or files needed at that moment.

Record the silent iOS Simulator demo and save the raw MP4 here:

```txt
/Users/vanajvanguardia/Documents/viya/viya-app/outputs/demo-recordings/viya-singapore-demo-raw.mp4
```

Use this fixture folder when files are needed:

```txt
/Users/vanajvanguardia/Documents/viya/viya-app/docs/demo/fixtures/
```

## Flow 1: Intro Carousel

**Screen action**

1. Start screen recording.
2. Reload the app immediately.
3. Let the getting-started carousel play from the first slide for about 15 seconds.

**Voiceover**

> Viya starts with a simple promise: your trip should not live across random chats, screenshots, receipts, and notes.
>
> What I want to show here is the full trip story. Planning before departure, proof while the trip comes together, and AI help that stays connected to the workspace.
>
> I will let the intro breathe for a second, because this is the product frame: places, spend, files, readiness, and the trip assistant all in one place.

**Success check**

- Carousel starts from the first slide.
- Hold long enough for the intro to feel intentional before tapping `Get started`.

## Flow 2: Login

**Screen action**

1. Tap `Get started`.
2. Tap `Continue with Google`.
3. Tap `Continue` on the Expo/google.com prompt.
4. Choose the default Google account.

**Voiceover**

> I am signing in with Google using the default demo account on the simulator.
>
> This matters because Viya is not just a one-off prompt box. It needs a saved account so preferences, trips, files, and workspace state can follow the traveler.
>
> If the Google account picker appears, I will choose the saved account and continue back into Viya.

**Success check**

- Google login completes without password, MFA, or account recovery.
- If Google asks for password, MFA, or account recovery, pause recording and let the account owner take over.

## Flow 3: Onboarding

**Screen action**

Answer the onboarding questions with these demo choices:

| Screen | Demo answer |
| --- | --- |
| Trip vibe | Luxury |
| Pace | Moderate |
| Budget | Mid-range |
| Interests | Food, Culture, Hidden gems |
| Food | Local eats |
| Travel with | Work |
| Suggestions | Give me options |
| Needs | Rest breaks |

**Voiceover**

> Now I am giving Viya a few planning defaults.
>
> For this demo, the traveler wants something polished, moderate in pace, and useful for work travel. So I am choosing Luxury, Moderate, Mid-range, Food, Culture, Hidden gems, Local eats, Work, Give me options, and Rest breaks.
>
> These are small choices, but they become useful later. Viya can use them as defaults instead of asking the same planning questions every time.

**Success check**

- Onboarding finishes and lands on Home.

## Flow 4: Home

**Screen action**

1. Land on Home.
2. Scroll slowly.
3. Show contextual suggestions, active trip areas, and the path to Trips.
4. Go to the Trips screen.

**Voiceover**

> Home is where Viya starts to feel less blank.
>
> There are suggestions, active trip context, and places to continue from. I am not going to spend too long here, but this is important: the app is already guiding the next action instead of dropping me into an empty spreadsheet.
>
> From here, I will create the Singapore Tech Week trip.

**Success check**

- Home is visible before trip creation.
- The recording shows that Viya has user context before the workspace demo starts.

## Flow 5: Manual Trip Creation

**Screen action**

1. On Trips, tap `Create trip` or `New trip`.
2. Use the manual trip form, not the AI trip-creation conversation.
3. Enter the following trip details.

```txt
Trip name: Singapore Group Tech Week Reward
Destination: Singapore
Departing from: Manila
Trip dates: September 28 to October 1, 2026
Budget: 90000
Travelers: 4
Vibe: Luxury
Group: Work
Interests: Food, culture, skyline views, hidden gems, Tech Week
Requirements: Keep conference days focused, add airport transfer buffers, keep evenings light, track SG Arrival Card, passport validity, event badge pickup, and budget evidence.
Extra notes: Conference days are September 29 and September 30. Prefer Marina Bay or City Hall, with one small victory-lap moment and no packed evenings.
```

**Voiceover**

> I am using manual trip creation for this recording.
>
> That gives the workspace clean structured facts first: Singapore, Manila as the origin, September 28 to October 1, 2026, four travelers, a PHP 90,000 planning ceiling, and a work-trip tone.
>
> I am also adding the real constraints: Tech Week on September 29 and 30, Marina Bay or City Hall as the hotel area, light evenings, transfer buffers, SG Arrival Card, passport validity, event badge pickup, and budget evidence.
>
> This is the foundation Viya should use. The AI should build from these facts, not invent a trip from scratch.

**Success check**

- The trip is created from structured form fields.
- The demo stays product-led and does not use AI chat to create the trip.

## Flow 6: Trip Review

**Screen action**

1. Pause on the manual trip review or summary screen.
2. Create the trip.
3. Open the workspace.

**Voiceover**

> This is the handoff from setup into the product.
>
> The trip is no longer just text. It is now a workspace with dates, destination, travelers, budget, requirements, and a clear purpose.
>
> Next, I will show how the AI works inside the modules.

**Success check**

- The Singapore group business-conference reward trip opens into the trip workspace.

## Flow 7: Workspace Overview

**Screen action**

1. Show the workspace modules.
2. Do not use the removed Overview Autopilot or `Complete this trip` card.
3. Point toward the module flow: Itinerary, Vault, Budget, Readiness, then main chat.

**Voiceover**

> This workspace is the main demo.
>
> The key point is that Viya does not need one giant autopilot card to do everything at once. For the recording, each module has its own AI action.
>
> I will start with itinerary, then upload evidence into Vault, then sync budget and readiness, and finally ask questions from the main Viya chat.

**Success check**

- Workspace modules are visible.
- No Overview Autopilot card is used.

## Flow 8: Itinerary Module

**Screen action**

1. Open Itinerary.
2. Tap the module Viya chat button.
3. In `TRY ASKING`, tap `Generate itinerary`.
4. Return to Itinerary.
5. Show the generated days and stops.

**Expected AI action**

Use the built-in `Generate itinerary` action. If a prompt is needed, use:

```txt
Generate a realistic 4-day Singapore itinerary for this group business-conference reward trip. Use the flight, hotel, Tech Week pass, budget, readiness notes, and conference anchor. Keep conference days focused, add buffers, keep evenings light, and include one small victory-lap moment.
```

**Voiceover**

> First, itinerary.
>
> I am asking Viya to generate the plan from the trip context. The expected result is a detailed 4-day itinerary, not just one day and not a generic list of attractions.
>
> Each day should feel like a natural whole day: five or six timed stops on full days, at least four on arrival and departure days, plus meals, transfer buffers, estimated costs, and practical notes. The conference days should stay focused. Arrival and departure need buffers. Evenings should stay light. And there should be one small victory-lap moment, because this is a business-conference reward trip.
>
> Once it generates, I will pause on the days and stops so the viewer can see that the workspace now has real itinerary detail.

**Success check**

- Itinerary is multi-day, not only Day 1.
- Full days have 5-6 timed stops.
- Arrival or departure days have at least 4 timed stops.

## Flow 9: Vault Module

**Screen action**

1. Open Vault.
2. Tap the module Viya chat button.
3. In `TRY ASKING`, tap `Upload files`.
4. Upload each fixture file.
5. Confirm each TripSync review before uploading the next file.

**Files to upload**

| File | Demo category | Expected TripSync result |
| --- | --- | --- |
| `singapore-flight-confirmation.txt` | Booking proof / flight ticket | Confirmed flight booking, transport readiness evidence, document record |
| `singapore-hotel-voucher.txt` | Booking proof / hotel voucher | Confirmed hotel booking, schedule readiness evidence, document record |
| `singapore-tech-week-pass.txt` | Event proof / permit | Confirmed Tech Week activity booking, badge pickup readiness evidence, document record |
| `singapore-expense-receipt.txt` | Receipt / budget evidence | Linked SGD 82 transport expense and budget readiness evidence |
| `singapore-readiness-note.txt` | Readiness note / checklist evidence | Passport, SG Arrival Card, packing, weather, safety, group, and backup-plan readiness evidence |

**Voiceover**

> Next is Vault.
>
> Vault is the grounding layer. This is where Viya stops guessing and starts reading proof.
>
> I will upload five files: flight confirmation, hotel voucher, Tech Week pass, expense receipt, and readiness note.
>
> For each upload, TripSync extracts the important details and asks for review before saving anything. That review step is important. It keeps the AI useful, but still controlled.
>
> The flow is intentional: Viya generates the itinerary first, then uploaded evidence grounds budget and readiness.

**Success check**

- All five files are uploaded.
- Each file is confirmed through TripSync review.
- If file upload shows the Expo Go blob error, stop and use a development build.

## Flow 10: Budget Module

**Screen action**

1. Open Budget.
2. Tap the module Viya chat button.
3. In `TRY ASKING`, tap `Sync budget`.
4. Return to Budget.
5. Show the PHP 90,000 planning ceiling, synced booking evidence, receipt evidence, and remaining room.

**Expected AI action**

Use the built-in `Sync budget` action. If a prompt is needed, use:

```txt
Review this Singapore trip budget against the PHP 90,000 planning ceiling. Use confirmed flight, hotel, and receipt evidence from Vault, call out remaining room, and suggest one practical budget move without overpacking the trip.
```

**Voiceover**

> Now that the files are in Vault, Budget has something real to work with.
>
> Viya should connect the confirmed flight, hotel, and receipt evidence back to the PHP 90,000 planning ceiling.
>
> The important behavior here is restraint. Viya should not invent confirmed costs. It should use what TripSync extracted, show what is known, and call out the remaining room.
>
> This is where the workspace starts to feel connected. The receipt is not just a file anymore. It affects the budget story.

**Success check**

- Budget references workspace evidence.
- Confirmed costs come from TripSync evidence, not invented AI values.

## Flow 11: Readiness Module

**Screen action**

1. Open Readiness.
2. Tap the module Viya chat button.
3. In `TRY ASKING`, tap `Complete readiness`.
4. Return to Readiness.
5. Hold on readiness at 100%.

**Expected AI action**

Use the built-in `Complete readiness` action. If a prompt is needed, use:

```txt
Audit this Singapore trip for 100% travel preparedness. Check passport validity, SG Arrival Card, flight, hotel, event badge pickup, budget, receipt evidence, airport transfer buffers, conference outfit, jet lag, and schedule overload. Create only the missing reviewable readiness actions.
```

**Voiceover**

> Readiness is the final product proof.
>
> Viya checks the trip against what a traveler actually needs before leaving: passport, SG Arrival Card, flight, hotel, event badge pickup, budget evidence, transfer buffers, conference outfit, weather backup, safety, and group coordination.
>
> In this demo, the five reviewed files cover every readiness category. So after the readiness action runs, the Singapore workspace should reach 100% prepared.
>
> That is the important moment to hold on screen. The AI did not just write a plan. It helped close the trip gaps using workspace evidence.

**Success check**

- Readiness reaches 100%.
- If Readiness does not reach 100% after the five TripSync reviews and `Complete readiness`, treat the take as failed.

## Flow 12: Main Bottom-Bar Viya Chat

**Screen action**

1. Go to the main bottom-bar Viya chat.
2. Open Viya actions if needed.
3. Choose the Singapore trip context.
4. Ask the first question.
5. Let Viya answer.
6. Ask the second question.
7. Let Viya answer.

**Questions to ask**

```txt
For my Singapore Tech Week trip, what is the smartest next thing to check before departure, and what evidence are you using from the workspace?
```

```txt
Now that readiness is at 100%, what should I watch on travel day so the conference schedule stays light and the budget stays on track?
```

**Voiceover**

> Last, I am leaving the trip workspace and using the main Viya chat from the bottom bar.
>
> I will select the Singapore trip as the context. That matters because the answer should come from the itinerary, Vault files, budget, and readiness state.
>
> First, I will ask what the smartest next thing is to check before departure, and what evidence Viya is using.
>
> Then I will ask what to watch on travel day now that readiness is at 100%, especially for keeping the conference schedule light and the budget on track.
>
> This is the final proof: Viya is not giving generic travel advice. It is answering from the selected trip workspace.

**Success check**

- Singapore trip context is selected.
- Main chat answers from itinerary, Vault, budget, and readiness evidence.
- Do not use or show a `Create trip` action in main chat.

## Flow 13: Closing Screen

**Screen action**

End on Readiness at 100% or on the connected workspace overview.

**Voiceover**

> That is Viya end to end.
>
> We signed in, set preferences, created a structured Singapore Tech Week trip, generated a detailed itinerary, uploaded evidence into Vault, synced budget, completed readiness, and asked trip-aware questions from the main AI chat.
>
> The product story is not just planning. It is an AI travel workspace that keeps the plan, proof, spend, and readiness connected.

**Success check**

- Final frame shows a connected workspace state.
- The demo has shown the full path: login, onboarding, Home, manual trip creation, itinerary generation, Vault upload, budget sync, readiness completion, and main trip-aware chat.
