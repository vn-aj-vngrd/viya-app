# Viya Feature Tickets Blueprint

## Purpose

This document splits the Viya app blueprint into implementation-ready feature tickets for Jira, Linear, GitHub Issues, or an AI coding agent such as Codex, Claude Code, or Cursor.

Viya must be built as an AI travel operations companion, not just an itinerary planner. Every ticket should preserve the product identity: planning, readiness, proactive help, risk detection, live travel assistance, moments, and post-trip wrap-up.

---

# Epic 1: Foundation, App Shell, and Demo Data

## VIYA-001: Set up project structure and base app architecture

### Type
Feature / Foundation

### Priority
P0

### User Story
As a developer, I want a clean project structure so the app can scale across trip planning, readiness, risk, travel mode, moments, and wrapped features.

### Scope
Create the initial project structure, routing, layout system, shared components, mock data layer, type definitions, and feature folders.

### Implementation Notes
Recommended structure for a Next.js build:

```text
src/
├── app/
│   ├── page.tsx
│   ├── onboarding/
│   ├── trips/
│   └── api/
├── components/
│   ├── layout/
│   ├── trip/
│   ├── itinerary/
│   ├── readiness/
│   ├── risk/
│   ├── travel-mode/
│   ├── moments/
│   ├── wrapped/
│   └── ai/
├── features/
│   ├── trips/
│   ├── itinerary/
│   ├── readiness/
│   ├── risks/
│   ├── tasks/
│   ├── moments/
│   └── wrapped/
├── lib/
│   ├── ai/
│   ├── mock-data/
│   ├── utils/
│   └── validations/
├── types/
└── styles/
```

### Acceptance Criteria
- App has a working route structure.
- Shared layout components are available.
- Feature folders are created.
- Common TypeScript types are defined.
- Mock data utilities are available.
- App can run without external APIs.
- Code is organized by feature, not one large file.

### Dependencies
None

---

## VIYA-002: Create shared design system and core UI components

### Type
Feature / UI Foundation

### Priority
P0

### User Story
As a traveler, I want the app to feel clean, premium, calm, and productivity-focused so I can trust it with my trip planning.

### Scope
Create reusable UI components used throughout the app.

### Components
- AppShell
- MobileFrame or ResponsiveLayout
- TopNav
- BottomNav
- PageHeader
- SectionHeader
- EmptyState
- LoadingState
- ErrorState
- StatusBadge
- PriorityBadge
- ActionButton
- Card
- Modal / Drawer base

### UX Requirements
- Mobile-first layout.
- Clean spacing.
- Clear hierarchy.
- Calm and helpful tone.
- Smooth transitions where useful.

### Acceptance Criteria
- Core layout works on mobile and desktop.
- Navigation between main screens works.
- Shared card and badge components are reusable.
- Empty, loading, and error states exist.
- UI does not feel like a generic admin dashboard.

### Dependencies
VIYA-001

---

## VIYA-003: Add Palawan demo trip seed data

### Type
Feature / Demo Data

### Priority
P0

### User Story
As a demo user, I want a realistic sample trip so I can understand Viya quickly without entering all data manually.

### Scope
Create mock data for a Palawan trip used across dashboard, itinerary, readiness, risk, travel mode, moments, and wrapped screens.

### Demo Trip Data
- Destination: Palawan
- Dates: June 10–15
- Arrival: 4:35 PM
- Departure: 5:15 PM
- Group: Couple or friends
- Budget: Mid-range
- Travel style: Balanced, scenic, food, beach

### Seeded Risks
- Late arrival on Day 1
- Day 2 has too many activities
- Rain risk on Day 3
- Missing hotel booking for final night
- No airport transfer
- Packing checklist incomplete

### Seeded Readiness Scores
- Initial score: 68%
- After Fix My Readiness: 84%
- After completed tasks: 94%

### Acceptance Criteria
- Demo trip is available from landing or onboarding.
- Demo data is reusable across all screens.
- Seeded readiness, risks, tasks, itinerary, moments, and wrapped data are consistent.
- Data is typed and easy to replace with API data later.

### Dependencies
VIYA-001

---

# Epic 2: Landing, Onboarding, and Trip Creation

## VIYA-004: Build landing screen with product positioning

### Type
Feature

### Priority
P0

### User Story
As a new user, I want to immediately understand that Viya helps me plan, prepare, travel, and remember my trip.

### Scope
Build the landing screen introducing Viya as an AI travel operations companion.

### Required Sections
- Hero message
- Product value proposition
- Primary CTA: Plan your first trip
- Secondary CTA: Explore demo trip
- Short feature highlights:
  - AI itinerary
  - Readiness score
  - Risk Radar
  - Travel Mode
  - Viya Wrapped

### Acceptance Criteria
- User understands product value within 30 seconds.
- CTA to create trip works.
- CTA to load demo trip works.
- Copy emphasizes readiness and proactive help, not just itinerary generation.

### Dependencies
VIYA-001, VIYA-002, VIYA-003

---

## VIYA-005: Build trip creation and onboarding flow

### Type
Feature

### Priority
P0

### User Story
As a traveler, I want to quickly create a trip by entering my destination, dates, budget, and preferences so Viya can generate a useful plan.

### Scope
Build the trip onboarding flow.

### Inputs
- Destination
- Start date
- End date
- Arrival time
- Departure time
- Budget range
- Number of travelers
- Group type
- Travel style
- Interests
- Pace preference
- Accommodation status
- Flight status

### UX Requirements
- Can be form-based or AI-guided question flow.
- Include progress indicator.
- Allow skipping into demo trip.
- Final confirmation screen should summarize trip details.

### Acceptance Criteria
- User can create a trip draft.
- Input validation exists.
- User can select travel style and interests.
- User can choose solo or group travel.
- Created trip can be passed into itinerary generation.
- Demo trip shortcut remains available.

### Dependencies
VIYA-001, VIYA-002

---

## VIYA-006: Build AI-guided onboarding assistant panel

### Type
Feature / AI UX

### Priority
P1

### User Story
As a traveler, I want Viya to ask helpful follow-up questions so I do not need to know every planning detail upfront.

### Scope
Create an assistant panel or guided question component inside onboarding.

### AI Questions
- Do you already have flights booked?
- Are you traveling alone or with a group?
- Do you prefer a relaxed or packed itinerary?
- Is your budget strict or flexible?
- Do you want to optimize for comfort, cost, or experience?

### Acceptance Criteria
- Assistant appears during onboarding.
- User can answer guided questions.
- Answers update trip preferences.
- The assistant feels proactive but not blocking.
- Can work with mock AI responses first.

### Dependencies
VIYA-005

---

# Epic 3: AI Service Layer and Structured Outputs

## VIYA-007: Create AI service abstraction

### Type
Feature / Architecture

### Priority
P0

### User Story
As a developer, I want all AI calls behind one service layer so the app can swap providers and keep outputs structured.

### Scope
Create a single AI service abstraction for itinerary generation, readiness analysis, risk detection, Fix My Readiness, travel replanning, captions, and wrapped.

### Interface
```ts
interface AIService {
  generateItinerary(input: GenerateItineraryInput): Promise<ItineraryResult>
  analyzeReadiness(input: AnalyzeReadinessInput): Promise<ReadinessResult>
  fixReadiness(input: FixReadinessInput): Promise<FixReadinessResult>
  detectRisks(input: DetectRisksInput): Promise<RiskResult>
  replanDay(input: ReplanDayInput): Promise<ReplanResult>
  generateMomentCaption(input: MomentCaptionInput): Promise<CaptionResult>
  generateWrapped(input: GenerateWrappedInput): Promise<WrappedResult>
}
```

### Acceptance Criteria
- AI service interface exists.
- Mock AI implementation exists.
- Provider-specific logic is isolated.
- AI outputs are typed.
- App can run with mock AI without API keys.
- Errors are handled gracefully.

### Dependencies
VIYA-001

---

## VIYA-008: Add structured AI response validation

### Type
Feature / Reliability

### Priority
P0

### User Story
As a developer, I want AI responses validated before saving them so the app does not break from malformed output.

### Scope
Add schema validation for AI outputs.

### Required Schemas
- ItineraryResult
- ReadinessResult
- FixReadinessResult
- RiskResult
- ReplanResult
- CaptionResult
- WrappedResult

### Acceptance Criteria
- AI outputs are parsed safely.
- Invalid responses show a helpful fallback message.
- No raw AI text is blindly saved as app state.
- Validation errors are logged for debugging.
- Mock responses follow the same schemas.

### Dependencies
VIYA-007

---

# Epic 4: Itinerary Planning

## VIYA-009: Build AI itinerary generation flow

### Type
Feature

### Priority
P0

### User Story
As a traveler, I want Viya to generate a realistic itinerary based on my destination, dates, arrival time, budget, and travel style.

### Scope
Implement itinerary generation using mock or real AI service.

### Features
- Day-by-day itinerary
- Activity suggestions
- Food suggestions
- Travel time assumptions
- Budget estimates
- Rest periods
- Arrival-aware scheduling
- Departure-aware scheduling
- Weather-aware alternatives where available

### Acceptance Criteria
- User can generate itinerary from onboarding data.
- Itinerary is grouped by day.
- Each activity has title, description, location, time, category, cost, and priority.
- Arrival and departure times affect the schedule.
- Itinerary avoids obviously overloaded days.
- Generated itinerary can be saved into app state.

### Dependencies
VIYA-005, VIYA-007, VIYA-008

---

## VIYA-010: Build itinerary screen and timeline UI

### Type
Feature / UI

### Priority
P0

### User Story
As a traveler, I want to view my itinerary clearly by day so I know what is planned.

### Scope
Build the itinerary screen.

### Components
- ItineraryDayCard
- ActivityCard
- ActivityTimeline
- ActivityActions
- ReplanButton

### Actions
- View day
- View activity details
- Add activity
- Replace activity
- Remove activity
- Move activity
- Optimize day
- Create backup plan

### Acceptance Criteria
- Itinerary displays all days and activities.
- Activities show time, location, category, and cost estimate.
- Day pace is visible.
- User can trigger actions from activity cards.
- UI works with demo data and generated data.

### Dependencies
VIYA-009

---

## VIYA-011: Add itinerary optimization actions

### Type
Feature / AI Action

### Priority
P1

### User Story
As a traveler, I want to ask Viya to make my itinerary cheaper, more relaxed, or better organized.

### Scope
Add AI-assisted itinerary actions.

### Actions
- Regenerate itinerary
- Optimize day
- Make cheaper
- Make less tiring
- Add activity
- Replace activity
- Remove activity
- Move activity
- Create backup plan

### Acceptance Criteria
- User can select an optimization action.
- AI returns proposed changes.
- User can preview changes before applying.
- Applied changes update itinerary state.
- App handles failed AI responses gracefully.

### Dependencies
VIYA-010, VIYA-007, VIYA-008

---

# Epic 5: Trip Dashboard

## VIYA-012: Build trip dashboard command center

### Type
Feature

### Priority
P0

### User Story
As a traveler, I want one central dashboard that shows what is happening, what is missing, and what Viya recommends next.

### Scope
Build the main trip dashboard.

### Required Sections
- Trip title and dates
- Current readiness score
- Next best action
- Risk alerts
- Today or upcoming itinerary
- Pending tasks
- Bookings summary
- Documents summary
- Group status
- Viya suggestions

### Main CTA
Fix My Readiness

### Secondary CTAs
- View itinerary
- Add booking
- Add document
- Open Travel Mode
- View Risk Radar
- Capture moment
- Generate Wrapped

### Acceptance Criteria
- Dashboard loads selected trip.
- Readiness score is visible above the fold.
- Next best action is clear.
- Risk alerts appear when available.
- Pending tasks and itinerary preview are visible.
- Dashboard links to all major feature screens.

### Dependencies
VIYA-003, VIYA-010

---

## VIYA-013: Build Viya proactive suggestion cards

### Type
Feature / AI UX

### Priority
P1

### User Story
As a traveler, I want Viya to proactively suggest useful next actions so I do not have to figure out what to do next.

### Scope
Create reusable proactive suggestion cards for dashboard and other screens.

### Suggestion Types
- Missing booking
- Packing reminder
- Weather risk
- Overloaded day
- Group pending confirmation
- Budget warning
- Travel mode next action
- Wrapped ready

### Acceptance Criteria
- Suggestion cards show title, reason, and CTA.
- Cards can be dismissed.
- Cards can deep link to the relevant screen.
- Cards use calm, helpful copy.
- Cards are reusable across screens.

### Dependencies
VIYA-012

---

# Epic 6: Readiness Score and Fix My Readiness

## VIYA-014: Build readiness score engine

### Type
Feature / Core Product

### Priority
P0

### User Story
As a traveler, I want to know how ready I am for my trip so I can fix missing items before departure.

### Scope
Create readiness scoring logic using mock rules first, then AI analysis later.

### Readiness Categories
1. Documents
2. Bookings
3. Packing
4. Budget
5. Schedule
6. Transportation
7. Weather
8. Safety
9. Group Sync
10. Backup Plans

### Score Ranges
- 0–39: Not ready
- 40–69: Needs attention
- 70–89: Almost ready
- 90–100: Ready

### Acceptance Criteria
- Readiness score is calculated per trip.
- Category breakdown is available.
- Missing and at-risk items are identified.
- Score updates when tasks/items are completed.
- Score can be displayed on dashboard and readiness screen.

### Dependencies
VIYA-003, VIYA-007

---

## VIYA-015: Build readiness screen

### Type
Feature / UI

### Priority
P0

### User Story
As a traveler, I want to see which parts of my trip are ready, missing, or at risk.

### Scope
Build the readiness screen.

### Components
- ReadinessScoreCard
- ReadinessCategoryGrid
- ReadinessItemCard
- FixMyReadinessButton
- ReadinessProgressBar

### Acceptance Criteria
- Screen displays overall readiness score.
- Screen displays category breakdown.
- Missing items are listed with impact level.
- At-risk items are listed separately or clearly marked.
- User can mark items complete where applicable.
- Fix My Readiness CTA is prominent.

### Dependencies
VIYA-014

---

## VIYA-016: Build AI readiness analysis

### Type
Feature / AI Core

### Priority
P0

### User Story
As a traveler, I want Viya to analyze my trip and identify what is missing or risky.

### Scope
Use AI service to analyze trip context, itinerary, bookings, tasks, documents, and group status.

### Output
- Score
- Status
- Summary
- Readiness items
- Next best actions

### Acceptance Criteria
- AI returns structured readiness result.
- Result updates readiness score and items.
- AI does not invent confirmed bookings or documents.
- Missing info becomes a readiness item or task.
- User sees a concise summary of what matters most.

### Dependencies
VIYA-014, VIYA-007, VIYA-008

---

## VIYA-017: Build Fix My Readiness flow

### Type
Feature / Core AI Action

### Priority
P0

### User Story
As a traveler, I want Viya to turn my readiness gaps into concrete tasks, reminders, and suggested itinerary fixes.

### Scope
Implement the Fix My Readiness flow.

### Behavior
When user clicks Fix My Readiness, Viya should:
- Generate missing tasks
- Suggest itinerary adjustments
- Create packing checklist
- Add reminders
- Recommend backup plans
- Highlight booking gaps
- Suggest transportation options
- Update readiness score after completion

### Acceptance Criteria
- User can click Fix My Readiness.
- AI returns structured fixes.
- Created tasks are saved.
- Suggested itinerary changes are previewed before applying.
- Reminders are created or simulated.
- Questions for missing information are shown to the user.
- Readiness score can improve after fixes are completed.

### Dependencies
VIYA-015, VIYA-016

---

## VIYA-018: Build trip tasks and checklist system

### Type
Feature

### Priority
P0

### User Story
As a traveler, I want a checklist of tasks so I can complete preparation items before my trip.

### Scope
Create task model, task list UI, task status updates, and task generation from AI fixes.

### Task Fields
- Title
- Description
- Category
- Priority
- Status
- Due date
- Created by user or AI
- Assigned user for future group support

### Acceptance Criteria
- Tasks can be displayed by category and priority.
- User can mark tasks done.
- AI-created tasks are distinguishable.
- Task completion affects readiness score.
- Tasks appear on dashboard and readiness screen.

### Dependencies
VIYA-017

---

# Epic 7: Risk Radar

## VIYA-019: Build risk data model and risk detection engine

### Type
Feature / Core Product

### Priority
P0

### User Story
As a traveler, I want Viya to detect risks before they affect my trip.

### Scope
Create risk model and detection logic using mock rules first, then AI service.

### Risk Types
- Weather
- Flight
- Schedule
- Budget
- Booking
- Document
- Transportation
- Safety
- Group
- Overloaded itinerary

### Risk Levels
- Low
- Medium
- High
- Critical

### Acceptance Criteria
- Risks can be generated for a trip.
- Risks have type, level, message, suggested fix, and status.
- Risks can be open, resolved, or dismissed.
- Seeded Palawan risks appear correctly.
- Risk detection can be replaced by AI output later.

### Dependencies
VIYA-003, VIYA-007

---

## VIYA-020: Build Risk Radar screen

### Type
Feature / UI

### Priority
P0

### User Story
As a traveler, I want to view my trip risks and understand what actions I should take.

### Scope
Build Risk Radar UI.

### Components
- RiskRadarSummary
- RiskCard
- RiskSeverityBadge
- RiskFixAction
- RiskDetailModal

### Acceptance Criteria
- Risks are grouped or sorted by severity.
- Each risk shows type, reason, and suggested action.
- User can dismiss or resolve a risk.
- User can apply a suggested fix where available.
- High and critical risks are visually emphasized without feeling alarming.

### Dependencies
VIYA-019

---

## VIYA-021: Add AI risk detection

### Type
Feature / AI Core

### Priority
P1

### User Story
As a traveler, I want Viya to analyze my trip and proactively detect realistic risks.

### Scope
Use AI service to detect risks based on trip context, itinerary, bookings, weather, and group readiness.

### Acceptance Criteria
- AI returns structured risk list.
- Risks are saved to trip state.
- AI explains why each risk matters.
- Each risk includes a suggested fix.
- AI does not claim real weather or flight data unless integrations exist.

### Dependencies
VIYA-019, VIYA-020, VIYA-007, VIYA-008

---

# Epic 8: Bookings, Documents, and Trip Organization

## VIYA-022: Build bookings module

### Type
Feature

### Priority
P1

### User Story
As a traveler, I want to store my flights, hotel, activities, and transport bookings in one place.

### Scope
Create booking data model and bookings screen.

### Booking Types
- Flight
- Hotel
- Activity
- Transport
- Insurance
- Other

### Acceptance Criteria
- User can add a booking manually.
- User can view bookings grouped by type or date.
- Booking summary appears on dashboard.
- Missing booking gaps can affect readiness.
- Booking can include confirmation code, location, dates, notes, and attachment URL.

### Dependencies
VIYA-012, VIYA-014

---

## VIYA-023: Build documents and attachments module

### Type
Feature

### Priority
P2

### User Story
As a traveler, I want to upload or attach important travel documents so they are easy to access.

### Scope
Create document/attachment support for bookings, trip documents, and moments.

### Document Types
- Passport / ID reminder
- Flight confirmation
- Hotel confirmation
- Activity voucher
- QR code
- Insurance
- Other

### Acceptance Criteria
- User can add document metadata.
- User can attach a file or mocked file URL.
- Documents appear in trip hub.
- Document readiness affects readiness score.
- Documents can be accessed from Travel Mode.

### Dependencies
VIYA-022

---

## VIYA-024: Add booking extraction from uploaded content

### Type
Feature / AI Nice-to-Have

### Priority
P3

### User Story
As a traveler, I want Viya to extract booking details from screenshots or documents so I do not need to manually type everything.

### Scope
Use AI or mock extraction for uploaded booking images/documents.

### Acceptance Criteria
- User can upload or simulate a booking document.
- AI extracts booking type, provider, confirmation code, dates, and location.
- User reviews extracted data before saving.
- Extraction failures show a helpful fallback.
- AI does not save unverified extraction silently.

### Dependencies
VIYA-022, VIYA-023, VIYA-007

---

# Epic 9: Pre-Departure Assistant and Notifications

## VIYA-025: Build in-app notification center

### Type
Feature

### Priority
P1

### User Story
As a traveler, I want to see important Viya reminders and alerts in one place.

### Scope
Create notification data model and notification center UI.

### Notification Types
- Readiness reminder
- Packing reminder
- Booking gap alert
- Weather risk alert
- Schedule conflict alert
- Flight reminder
- Group reminder
- Budget warning
- Moment suggestion
- Wrapped ready

### Acceptance Criteria
- Notifications can be listed.
- Notifications can be marked read.
- Notifications can link to relevant screens.
- Dashboard can show latest notifications.
- Demo notifications are seeded for the Palawan trip.

### Dependencies
VIYA-012, VIYA-019

---

## VIYA-026: Build pre-departure assistant timeline

### Type
Feature

### Priority
P1

### User Story
As a traveler, I want Viya to guide me in the final days before my trip so I do not forget important tasks.

### Scope
Create a pre-departure timeline and reminders.

### Timeline
- 7 days before
- 72 hours before
- 48 hours before
- 24 hours before
- Day of trip

### Reminder Categories
- Packing
- Check-in
- Documents
- Weather
- Transportation
- Budget
- Group readiness
- Flight
- Final checklist

### Acceptance Criteria
- Timeline shows preparation milestones.
- Reminders are generated from trip context and readiness gaps.
- Reminders appear in notification center.
- User can mark reminders complete.
- Completion updates readiness where applicable.

### Dependencies
VIYA-025, VIYA-018

---

# Epic 10: Travel Mode

## VIYA-027: Build Travel Mode screen

### Type
Feature / Core Product

### Priority
P0

### User Story
As a traveler, I want a live travel assistant during my trip so I know what to do next and can adjust when plans change.

### Scope
Build Travel Mode screen.

### Required Features
- Current day itinerary
- Next activity
- Time to leave
- Travel duration
- Booking quick access
- Emergency info
- Offline trip details section
- Weather alert placeholder
- Quick replan
- Nearby suggestions placeholder
- Group update placeholder
- Budget tracker summary
- Delay handling action

### Quick Actions
- What’s next?
- Replan today
- Find food nearby
- Move this activity
- Skip this activity
- Show booking
- Send update to group
- Open map
- Add moment

### Acceptance Criteria
- Travel Mode shows current day and next activity.
- User can access key booking and emergency info quickly.
- Quick actions are visible and tappable.
- Replan today action is available.
- Screen works with Palawan demo data.

### Dependencies
VIYA-010, VIYA-012, VIYA-022

---

## VIYA-028: Build AI travel replanning flow

### Type
Feature / AI Core

### Priority
P1

### User Story
As a traveler, I want Viya to replan my day when I am delayed, tired, or affected by weather.

### Scope
Use AI service to adjust the current day itinerary based on a situation.

### Situations
- Flight delayed
- User is behind schedule
- Weather changed
- Activity canceled
- User wants lighter day
- Budget issue

### Acceptance Criteria
- User can choose or type a current situation.
- AI returns updated activities, removed activities, new suggestions, and message to user.
- User can preview the new plan before applying.
- Applied changes update itinerary state.
- AI prioritizes reducing stress and preserving important activities.

### Dependencies
VIYA-027, VIYA-007, VIYA-008

---

## VIYA-029: Add live travel proactive alerts

### Type
Feature / AI UX

### Priority
P2

### User Story
As a traveler, I want Viya to proactively alert me when I am behind schedule or need to prepare for the next activity.

### Scope
Create simulated live alerts for demo and future real-time behavior.

### Alert Examples
- You are 35 minutes behind schedule.
- Leave in 20 minutes to reach the next activity.
- Rain may affect your outdoor plan.
- Your next booking is ready to view.

### Acceptance Criteria
- Live alert cards appear in Travel Mode.
- Alerts have clear CTAs.
- Alerts can be dismissed.
- Alerts can trigger replanning.
- Demo alerts feel realistic.

### Dependencies
VIYA-027, VIYA-025

---

# Epic 11: Moments and Captions

## VIYA-030: Build Moments screen

### Type
Feature

### Priority
P1

### User Story
As a traveler, I want to capture photos, notes, favorite places, and highlights during the trip.

### Scope
Build Moments feature.

### Features
- Add photo or mocked image
- Add note
- Tag location
- Tag day
- Save highlight
- Save favorite activity
- Save food memory
- View moment grid

### Components
- MomentCard
- MomentGrid
- AddMomentButton
- DailySummaryCard

### Acceptance Criteria
- User can add a moment.
- User can mark a moment as highlight.
- Moments can be filtered or grouped by day.
- Moments appear in Wrapped input data.
- UI feels emotional and visual, not like a task list.

### Dependencies
VIYA-003, VIYA-002

---

## VIYA-031: Add AI caption generation for moments

### Type
Feature / AI

### Priority
P1

### User Story
As a traveler, I want Viya to generate captions for my travel moments so I can share them easily.

### Scope
Use AI service to generate captions for moments.

### Caption Styles
- Short and simple
- Instagram-ready
- Funny
- Emotional
- Travel journal

### Acceptance Criteria
- User can request a caption for a moment.
- AI returns caption suggestions.
- User can save selected caption.
- Captions can be used in Wrapped/share cards later.
- Fallback mock captions exist for demo.

### Dependencies
VIYA-030, VIYA-007, VIYA-008

---

## VIYA-032: Build daily trip summary generation

### Type
Feature / AI

### Priority
P2

### User Story
As a traveler, I want Viya to summarize each day of my trip so my memories are organized automatically.

### Scope
Generate daily summaries from itinerary progress and moments.

### Acceptance Criteria
- User can generate a daily summary.
- Summary uses completed activities and moments.
- Summary can be edited or regenerated.
- Summary contributes to Viya Wrapped.

### Dependencies
VIYA-030, VIYA-031

---

# Epic 12: Viya Wrapped and Insights

## VIYA-033: Build Viya Wrapped screen

### Type
Feature / Emotional Value

### Priority
P0

### User Story
As a traveler, I want a beautiful post-trip recap so I can remember and share my trip.

### Scope
Build Wrapped screen using seeded or generated data.

### Required Sections
- Trip intro
- Trip vibe
- Places visited
- Best moments
- Most memorable day
- Budget summary
- Travel personality
- Next trip recommendation
- Shareable cards

### Components
- WrappedIntro
- WrappedStatCard
- WrappedMomentCard
- WrappedPersonalityCard
- WrappedShareCard
- WrappedCarousel

### Acceptance Criteria
- Wrapped screen displays a complete recap.
- Wrapped works with demo data.
- Wrapped feels visually engaging and shareable.
- Shareable card modal exists.
- Screen can be generated after trip completion.

### Dependencies
VIYA-030

---

## VIYA-034: Add AI Wrapped generation

### Type
Feature / AI

### Priority
P1

### User Story
As a traveler, I want Viya to generate a personalized trip recap from my itinerary, moments, and budget.

### Scope
Use AI service to generate Wrapped summary.

### Output
- Trip vibe
- Summary
- Places visited
- Top moments
- Most memorable day
- Budget summary
- Travel personality
- Next trip recommendation
- Share cards

### Acceptance Criteria
- AI returns structured Wrapped data.
- Wrapped data is saved.
- User can regenerate Wrapped.
- User can edit or choose share cards.
- AI output is emotional but concise.

### Dependencies
VIYA-033, VIYA-007, VIYA-008

---

## VIYA-035: Build Viya Insights screen

### Type
Feature

### Priority
P2

### User Story
As a traveler, I want to learn from my completed trips so my future trips become better.

### Scope
Build insights screen for completed trips.

### Insights
- Budget insights
- Itinerary pacing insights
- Readiness history
- Travel style learning
- Missed tasks review
- Best planning habits
- Future trip suggestions

### Acceptance Criteria
- Insights screen displays practical learnings.
- Insights are generated from trip data and wrapped summary.
- Insights include future trip recommendations.
- Insights preserve helpful and non-judgmental tone.

### Dependencies
VIYA-033, VIYA-034

---

# Epic 13: Group Travel and TripSync

## VIYA-036: Build TripSync group members and shared trip state

### Type
Feature

### Priority
P2

### User Story
As a group traveler, I want to invite members and see their readiness so the trip does not depend on one person managing everything.

### Scope
Create TripSync group model and shared state UI.

### Features
- Add group members
- Member readiness status
- Shared itinerary visibility
- Shared checklist visibility
- Member task assignments

### Member Readiness Status
- Ready
- Needs action
- Not started
- Unknown

### Acceptance Criteria
- Trip can have members.
- Members can have readiness statuses.
- Tasks can be assigned to members.
- Group readiness appears on dashboard.
- Works with mock data first.

### Dependencies
VIYA-018, VIYA-012

---

## VIYA-037: Build TripSync voting and decision tracking

### Type
Feature

### Priority
P2

### User Story
As a group traveler, I want the group to vote on activities and track decisions so planning is less chaotic.

### Scope
Add voting and decision tracking.

### Features
- Activity voting
- Decision status
- Pending decisions
- Lock selected activity
- Decision history

### Acceptance Criteria
- Users can create a vote for activity choices.
- Vote results are displayed.
- Pending decisions are visible.
- Selected decisions can update itinerary.
- Works with mock members.

### Dependencies
VIYA-036, VIYA-010

---

## VIYA-038: Add AI group summary and reminders

### Type
Feature / AI

### Priority
P2

### User Story
As a group traveler, I want Viya to summarize group status and remind people who still need to act.

### Scope
Add AI group coordination support.

### AI Behaviors
- Summarize group readiness
- Identify pending confirmations
- Suggest reminders
- Summarize decisions
- Generate group announcement copy

### Acceptance Criteria
- AI can summarize group readiness.
- AI identifies members with pending tasks.
- User can generate a reminder message.
- AI does not send notifications without user action in MVP.
- Group summary appears in TripSync and dashboard.

### Dependencies
VIYA-036, VIYA-037, VIYA-007

---

# Epic 14: Budget and Expense Support

## VIYA-039: Build budget summary and estimate module

### Type
Feature

### Priority
P2

### User Story
As a traveler, I want to see estimated trip costs so I can plan within my budget.

### Scope
Create budget estimate based on itinerary activities, bookings, and manual expenses.

### Features
- Estimated activity cost
- Booking cost placeholders
- Daily cost summary
- Total estimated spend
- Budget risk indicator

### Acceptance Criteria
- Budget summary appears on dashboard or dedicated section.
- Itinerary activity costs contribute to total estimate.
- User can add manual expense.
- Budget risk can appear in Risk Radar.
- Budget summary contributes to Wrapped.

### Dependencies
VIYA-010, VIYA-019

---

# Epic 15: Demo Flow and Presentation Readiness

## VIYA-040: Build end-to-end demo mode flow

### Type
Feature / Demo

### Priority
P0

### User Story
As a judge or evaluator, I want to experience the full Viya journey quickly from planning to wrapped.

### Scope
Create a guided demo mode that moves through the Palawan scenario.

### Demo Steps
1. Start from landing page.
2. Create or open Palawan demo trip.
3. Show AI itinerary.
4. Show Viya reviewing the plan.
5. Show readiness score at 68%.
6. Click Fix My Readiness.
7. Show score improving to 84%.
8. Show Risk Radar warning.
9. Open Travel Mode.
10. Simulate delay or weather change.
11. Replan day.
12. Add a moment.
13. Generate Viya Wrapped.

### Acceptance Criteria
- Demo can be completed in 3–5 minutes.
- Demo clearly shows AI across the full travel life cycle.
- Each step has polished UI and strong copy.
- Demo does not require real integrations.
- Demo mode can reset data.

### Dependencies
VIYA-003, VIYA-012, VIYA-017, VIYA-020, VIYA-027, VIYA-030, VIYA-033

---

## VIYA-041: Add demo controls for prototype navigation

### Type
Feature / Demo UX

### Priority
P1

### User Story
As a presenter, I want controls to jump between demo phases so I can present the product smoothly.

### Scope
Create hidden or visible demo controls.

### Controls
- Previous phase
- Next phase
- Jump to planning
- Jump to dashboard
- Jump to readiness
- Jump to risk
- Jump to travel mode
- Jump to moments
- Jump to wrapped
- Reset demo

### Acceptance Criteria
- Presenter can navigate demo states quickly.
- Demo controls do not disrupt normal UI.
- Demo state updates data consistently.
- Controls can be hidden for production mode.

### Dependencies
VIYA-040

---

# Epic 16: External Integrations and Production Enhancements

## VIYA-042: Add real weather integration

### Type
Feature / Integration

### Priority
P3

### User Story
As a traveler, I want Viya to use real weather forecasts so risk alerts are more accurate.

### Scope
Integrate weather provider for destination and travel dates.

### Acceptance Criteria
- Weather can be fetched for trip destination.
- Weather data can feed Risk Radar.
- Weather alerts do not claim certainty beyond available forecast.
- App falls back gracefully if API fails.

### Dependencies
VIYA-019, VIYA-021

---

## VIYA-043: Add calendar integration

### Type
Feature / Integration

### Priority
P3

### User Story
As a traveler, I want to sync trip activities and reminders to my calendar.

### Scope
Add calendar export or integration.

### Acceptance Criteria
- User can export itinerary to calendar format or provider.
- Calendar events include title, time, location, and notes.
- Reminders can be added where supported.
- Calendar sync is optional.

### Dependencies
VIYA-010, VIYA-026

---

## VIYA-044: Add push notification support

### Type
Feature / Integration

### Priority
P3

### User Story
As a traveler, I want Viya to notify me outside the app when important travel actions are needed.

### Scope
Implement push notifications for supported platforms.

### Acceptance Criteria
- User can enable or disable notifications.
- Notifications are generated from readiness, risks, travel mode, and wrapped events.
- Notification permissions are handled properly.
- In-app notification center remains source of truth.

### Dependencies
VIYA-025, VIYA-026, VIYA-029

---

# Recommended MVP Sprint Plan

## Sprint 1: Foundation and Demo Core

### Goal
Build the app shell, demo data, landing, onboarding, and dashboard.

### Tickets
- VIYA-001
- VIYA-002
- VIYA-003
- VIYA-004
- VIYA-005
- VIYA-012

### Outcome
A user can open Viya, understand the product, create/open a trip, and see the dashboard.

---

## Sprint 2: Itinerary and Readiness

### Goal
Make the product feel AI-powered and readiness-oriented.

### Tickets
- VIYA-007
- VIYA-008
- VIYA-009
- VIYA-010
- VIYA-014
- VIYA-015
- VIYA-016
- VIYA-017
- VIYA-018

### Outcome
A user can generate/view an itinerary, see readiness score, and use Fix My Readiness.

---

## Sprint 3: Risk and Live Travel

### Goal
Make Viya feel proactive and useful during the trip.

### Tickets
- VIYA-019
- VIYA-020
- VIYA-021
- VIYA-025
- VIYA-026
- VIYA-027
- VIYA-028
- VIYA-029

### Outcome
A user can view risks, receive proactive alerts, and use Travel Mode to replan.

---

## Sprint 4: Moments, Wrapped, and Demo Polish

### Goal
Complete the emotional lifecycle and make the app presentation-ready.

### Tickets
- VIYA-030
- VIYA-031
- VIYA-032
- VIYA-033
- VIYA-034
- VIYA-040
- VIYA-041

### Outcome
A user can capture moments, generate Viya Wrapped, and present the full product story.

---

## Sprint 5: Optional Expansion

### Goal
Add collaboration and production-level enhancements.

### Tickets
- VIYA-022
- VIYA-023
- VIYA-024
- VIYA-035
- VIYA-036
- VIYA-037
- VIYA-038
- VIYA-039
- VIYA-042
- VIYA-043
- VIYA-044

### Outcome
Viya becomes more complete for group travel, integrations, and production readiness.

---

# MVP Cutline

## Must Build for Winning Demo

- VIYA-001: Project structure
- VIYA-002: Shared UI
- VIYA-003: Demo data
- VIYA-004: Landing
- VIYA-005: Trip onboarding
- VIYA-007: AI service abstraction
- VIYA-008: AI output validation
- VIYA-009: AI itinerary generation
- VIYA-010: Itinerary screen
- VIYA-012: Trip dashboard
- VIYA-014: Readiness score engine
- VIYA-015: Readiness screen
- VIYA-017: Fix My Readiness
- VIYA-018: Tasks/checklist
- VIYA-019: Risk model
- VIYA-020: Risk Radar screen
- VIYA-027: Travel Mode
- VIYA-030: Moments
- VIYA-033: Viya Wrapped
- VIYA-040: End-to-end demo mode

## Can Mock or Simulate

- Real AI calls
- Real weather API
- Real flight delay API
- Real push notifications
- Real document parsing
- Real group invites
- Real calendar sync

## Can Defer

- TripSync full collaboration
- Booking document extraction
- Production push notifications
- Calendar sync
- Real-time location
- Advanced budget tracking
- User accounts if demo is local-only

---

# AI Coding Agent Instructions

When implementing these tickets:

1. Always keep Viya as an AI travel operations companion, not only an itinerary generator.
2. Prioritize dashboard, readiness score, Fix My Readiness, Risk Radar, Travel Mode, Moments, and Wrapped.
3. Build mock-first, integration-ready.
4. Use structured data for every AI output.
5. Convert AI responses into app state: itinerary items, tasks, risks, readiness items, moments, and wrapped cards.
6. Keep UI mobile-first and demo-friendly.
7. Avoid overengineering the MVP.
8. Prefer clear feature folders and reusable components.
9. Do not let AI claim real-world confirmation unless the app has actual integrations.
10. The demo should tell the story: plan, prepare, detect risks, travel, capture, wrap up.
