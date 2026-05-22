# Viya App Build Blueprint

## 0. Purpose of This Document

This Markdown file is the primary product, UX, and engineering context for building **Viya**, an AI-powered travel operations companion.

Use this as the source of truth for AI coding agents, Codex, Claude Code, Cursor, or any implementation assistant. The goal is to help the AI understand what Viya is, why it exists, what features matter, how the product should behave, and how to build the MVP without drifting into a generic itinerary planner.

Viya is not just a travel itinerary generator.

Viya is an AI travel operations companion that helps travelers move through the full travel life cycle:

1. Dreaming
2. Planning
3. Organizing
4. Readiness preparation
5. Pre-departure
6. Live travel
7. Moments capture
8. Post-trip wrap-up
9. Insights for future trips

Every phase should be heavily assisted by AI.

---

# 1. Product Summary

## Product Name

**Viya**

## Product Type

AI-powered travel planning, readiness, coordination, live assistance, and memory companion.

## Core Positioning

Viya helps travelers feel ready, guided, and remembered across the entire travel life cycle.

Most travel apps answer:

> Where should I go?

Viya answers:

> Am I ready, what should I do next, what could go wrong, and how can this trip become smoother and more memorable?

## Product Thesis

Travel is not just a planning problem. It is an operations problem.

Travelers deal with scattered bookings, documents, tasks, schedules, group decisions, weather risks, budget issues, and real-time changes. Viya turns this chaos into a guided, proactive, AI-assisted workflow.

---

# 2. Core Problem

Travelers currently manage trips using disconnected tools:

- ChatGPT for ideas
- Google Maps for places
- Booking apps for hotels
- Email for confirmations
- Notes for checklists
- Calendar for schedules
- Messenger or group chat for coordination
- Screenshots for important details
- Manual reminders for preparation

This creates scattered information and makes the traveler act like a project manager.

The biggest pain is not only creating an itinerary. The deeper pain is uncertainty:

- Did I forget something?
- Is my plan realistic?
- Are my documents complete?
- Are my bookings aligned?
- Is my group prepared?
- What should I do if the weather changes?
- What happens if my flight is delayed?
- What should I do next?
- How do I remember and share the trip afterward?

---

# 3. Product Solution

Viya acts as a proactive AI travel operations layer.

It should:

- Ask the right questions
- Generate realistic plans
- Detect missing information
- Build readiness checklists
- Monitor trip risks
- Proactively notify the traveler
- Help fix readiness issues
- Assist during the live trip
- Coordinate group travel
- Capture moments
- Generate a post-trip wrap-up
- Learn from the trip for future recommendations

The AI should not feel like a passive chatbot. It should feel like a companion that is actively helping the traveler move forward.

---

# 4. Key Differentiators

## 4.1 AI Across the Full Travel Life Cycle

AI is not limited to itinerary generation. It is used in every phase:

- Trip discovery
- Planning
- Booking organization
- Readiness scoring
- Packing
- Risk detection
- Live travel adjustments
- Group coordination
- Moment capture
- Post-trip recap
- Future trip insights

## 4.2 Viya Readiness Score

A visible preparedness score that answers:

> How ready am I for this trip?

The readiness score should evaluate itinerary, bookings, documents, packing, weather, budget, transportation, group sync, and safety.

## 4.3 Fix My Readiness

A primary AI action that turns missing preparation items into concrete tasks, reminders, suggestions, and changes.

The product should not only warn users. It should help fix the issue.

## 4.4 Risk Radar

A proactive risk system that detects:

- Weather risks
- Schedule conflicts
- Missing bookings
- Tight travel windows
- Budget risks
- Incomplete documents
- Overloaded days
- Group readiness problems

## 4.5 Travel Mode

A live trip assistant that helps users during the trip, not only before the trip.

## 4.6 TripSync

A group coordination layer for shared itineraries, voting, group readiness, shared tasks, and decision tracking.

## 4.7 Viya Wrapped

A post-trip recap that creates emotional value through memories, stats, insights, and shareable content.

---

# 5. Target Users

## 5.1 Busy Professionals

People who want efficient travel planning and preparation.

Needs:

- Fast itinerary generation
- Clear next actions
- Reminders
- Readiness status
- Less manual coordination

## 5.2 Group Travelers

Friends, couples, families, and teams planning together.

Needs:

- Shared itinerary
- Task assignments
- Voting
- Shared reminders
- Group readiness visibility
- Decision summaries

## 5.3 First-Time or Occasional Travelers

Travelers who need guidance and reassurance.

Needs:

- Step-by-step preparation
- Packing help
- Document reminders
- Risk alerts
- Simple explanations

## 5.4 Experience-Driven Travelers

Travelers who value memories, content, photos, and recaps.

Needs:

- Moment capture
- AI captions
- Travel journal
- Shareable wrapped recap
- Personal travel insights

---

# 6. App Principles

## 6.1 Product Principles

1. Reduce travel stress.
2. Make preparation visible.
3. Turn uncertainty into clear actions.
4. Keep the user productive.
5. Help the user before they ask.
6. Make planning realistic, not just exciting.
7. Support both solo and group travel.
8. Continue being useful during and after the trip.

## 6.2 AI Behavior Principles

The AI should:

- Ask contextual questions
- Detect missing information
- Suggest next best actions
- Explain risks clearly
- Avoid overwhelming the user
- Prioritize practical fixes
- Be proactive but not annoying
- Be concise and actionable
- Help the user complete tasks

## 6.3 UX Principles

The UI should feel:

- Clean
- Mobile-first
- Premium
- Fast
- Personal
- Calm
- Trustworthy
- Travel-oriented
- Productivity-focused

The user should always know:

- What is happening now
- What is missing
- What needs action
- What Viya recommends next

---

# 7. Core User Journey

## 7.1 End-to-End Flow

1. User opens Viya.
2. User creates a trip.
3. Viya asks onboarding questions.
4. Viya generates itinerary.
5. Viya builds trip dashboard.
6. Viya computes readiness score.
7. Viya identifies missing items and risks.
8. User clicks Fix My Readiness.
9. Viya creates tasks, reminders, and suggestions.
10. User organizes bookings, documents, and checklist.
11. Viya notifies user before departure.
12. During trip, Travel Mode guides the user.
13. Viya helps adjust plans when disruptions happen.
14. User captures moments.
15. After trip, Viya generates Wrapped.
16. Viya creates insights for next trip.

---

# 8. Main Feature Modules

## 8.1 Trip Creation and Onboarding

### Purpose

Collect essential trip information and preferences.

### Inputs

- Destination
- Travel dates
- Arrival time
- Departure time
- Budget range
- Number of travelers
- Travel type
- Travel style
- Interests
- Pace preference
- Accommodation status
- Flight status
- Group or solo travel

### Required UI

- Welcome screen
- Create trip form
- AI-guided question flow
- Skip/demo trip option
- Progress indicator

### AI Behavior

Viya should ask smart follow-up questions:

- Do you already have flights booked?
- Are you traveling alone or with a group?
- Do you prefer a relaxed or packed itinerary?
- Is your budget strict or flexible?
- Do you want me to optimize for comfort, cost, or experience?

---

## 8.2 AI Itinerary Builder

### Purpose

Generate a realistic, editable itinerary.

### Features

- Day-by-day itinerary
- Activity suggestions
- Food suggestions
- Travel time assumptions
- Budget estimate
- Rest periods
- Arrival-aware scheduling
- Departure-aware scheduling
- Weather-aware alternatives
- Different itinerary modes

### Itinerary Modes

- Balanced
- Budget
- Premium
- Relaxed
- Adventure
- Food-focused
- Family-friendly
- Rainy day
- Packed

### Required Actions

- Generate itinerary
- Regenerate itinerary
- Optimize day
- Make cheaper
- Make less tiring
- Add activity
- Replace activity
- Remove activity
- Move activity
- Create backup plan

### AI Review Behavior

After generating a plan, Viya should review it and point out possible issues.

Example:

> Day 2 looks overloaded because it has 5 activities across different locations. I recommend moving one activity to Day 3.

---

## 8.3 Trip Dashboard

### Purpose

Provide a central command center for the trip.

### Dashboard Sections

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

**Fix My Readiness**

### Secondary CTAs

- View itinerary
- Add booking
- Add document
- Open Travel Mode
- View Risk Radar
- Capture moment
- Generate Wrapped

---

## 8.4 Viya Readiness Score

### Purpose

Show how prepared the traveler is.

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

### Readiness Data Sources

- User-provided trip info
- Itinerary completeness
- Booking records
- Uploaded documents
- Checklist status
- Weather data
- Budget estimate
- Group member status
- AI-generated risk analysis

### Required UI

- Circular or card-based score
- Category breakdown
- Missing items list
- Recommended fixes
- Priority indicators
- Fix My Readiness button

### Example Output

```text
Readiness Score: 68%

Status: Needs attention

Missing:
- No airport transfer set
- Hotel booking missing for final night
- Packing checklist incomplete
- Rain risk on Day 3
- Group member confirmation pending
```

---

## 8.5 Fix My Readiness

### Purpose

Convert readiness gaps into concrete actions.

### Features

When user clicks **Fix My Readiness**, Viya should:

- Generate missing tasks
- Suggest itinerary adjustments
- Create packing checklist
- Add reminders
- Recommend backup plans
- Highlight booking gaps
- Suggest transportation options
- Notify group members
- Update readiness score after completion

### Required Behavior

The AI should not simply describe the problem. It should propose structured fixes.

Example:

```text
I found 4 readiness issues. I can fix 3 now:

1. Create a packing checklist for your trip.
2. Add an airport transfer task.
3. Move the outdoor activity away from the rainy day.
4. Ask you to upload the missing hotel booking.
```

---

## 8.6 Risk Radar

### Purpose

Identify and explain risks before and during the trip.

### Risk Types

- Weather risk
- Flight risk
- Schedule risk
- Budget risk
- Booking risk
- Document risk
- Transportation risk
- Safety risk
- Group readiness risk
- Overloaded itinerary risk

### Risk Levels

- Low
- Medium
- High
- Critical

### Required UI

- Risk cards
- Severity badge
- Reason
- Suggested action
- Apply fix button

### Example

```text
Risk: High
Type: Weather
Message: Rain is likely on Day 3 during your island hopping schedule.
Suggested Fix: Move island hopping to Day 2 and keep Day 3 flexible.
```

---

## 8.7 Pre-Departure Assistant

### Purpose

Guide the traveler in the final days before the trip.

### Timeline

- 7 days before
- 72 hours before
- 48 hours before
- 24 hours before
- Day of trip

### Features

- Packing reminders
- Check-in reminders
- Document reminders
- Weather reminders
- Transportation reminders
- Budget reminders
- Group readiness reminders
- Flight reminders
- Final checklist

### Notification Examples

```text
Your flight is tomorrow at 4:35 PM. I recommend leaving for the airport by 1:30 PM.
```

```text
You still have 3 unresolved readiness items before your trip.
```

```text
Rain is likely on arrival day. Add an umbrella or light jacket to your packing list.
```

---

## 8.8 TripSync

### Purpose

Coordinate group trips.

### Features

- Shared itinerary
- Shared checklist
- Group member readiness
- Task assignment
- Voting
- Decision tracking
- Shared documents
- Group reminders
- Group announcements
- AI decision summaries

### Group Readiness

Each member may have a readiness status:

- Ready
- Needs action
- Not started
- Unknown

### AI Behavior

Viya should summarize group status:

```text
3 of 5 members are ready. Two members have not confirmed the island hopping activity. Should I remind them?
```

---

## 8.9 Travel Mode

### Purpose

Assist the traveler during the actual trip.

### Features

- Current day itinerary
- Next activity
- Time to leave
- Travel duration
- Booking quick access
- Emergency info
- Offline trip details
- Weather alert
- Quick replan
- Nearby suggestions
- Group update
- Budget tracker
- Delay handling

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

### AI Behavior

Viya should proactively react to disruptions:

```text
You are 35 minutes behind schedule. If you want to catch sunset, I recommend skipping the café stop and going directly to the viewpoint.
```

---

## 8.10 Moments

### Purpose

Capture meaningful trip memories.

### Features

- Add photo
- Add note
- Tag location
- Tag day
- Save highlight
- Save favorite activity
- Save food memory
- AI caption generation
- Daily summary
- Shareable post generation

### AI Behavior

Viya can suggest:

```text
This looks like one of your trip highlights. Want me to save it as a top moment and create a caption?
```

---

## 8.11 Viya Wrapped

### Purpose

Generate post-trip recap and shareable content.

### Features

- Trip summary
- Best moments
- Top places visited
- Favorite food
- Most active day
- Most relaxing day
- Budget summary
- Travel personality
- Shareable cards
- Next trip recommendation

### Example Wrapped Data

```text
Trip Vibe: Island Explorer
Places Visited: 12
Most Memorable Day: Day 3
Top Category Spend: Food and Activities
Next Recommended Trip: Siargao or Bohol
```

---

## 8.12 Viya Insights

### Purpose

Learn from completed trips and improve future planning.

### Features

- Budget insights
- Itinerary pacing insights
- Readiness history
- Travel style learning
- Missed tasks review
- Best planning habits
- Future trip suggestions

### AI Behavior

```text
You tend to enjoy relaxed mornings and activity-heavy afternoons. I’ll use this pattern when planning your next trip.
```

---

# 9. MVP Scope

## 9.1 MVP Goal

Build a demoable version of Viya that clearly communicates the product’s AI-first travel operations concept.

The MVP should prove that Viya is not just an itinerary generator. It should show planning, readiness, risk detection, live assistance, and post-trip wrap-up.

## 9.2 MVP Must-Have

1. Trip onboarding
2. AI-generated itinerary
3. Trip dashboard
4. Readiness score
5. Fix My Readiness flow
6. Risk Radar
7. Travel Mode
8. Moments capture
9. Viya Wrapped

## 9.3 MVP Nice-to-Have

1. Group TripSync
2. Document parsing
3. Calendar sync
4. Email booking import
5. Real weather API
6. Real flight delay API
7. Push notifications
8. Offline mode

## 9.4 Demo Optimization

For hackathon/demo purposes, it is acceptable to simulate some integrations using seeded data.

Simulated data may include:

- Weather risk
- Flight delay
- Group member status
- Uploaded booking extraction
- Budget summary
- Location-based suggestions

The demo should still feel realistic.

---

# 10. Suggested Tech Stack

## 10.1 Frontend

Recommended:

- Next.js or React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Zustand or React Context for UI state
- TanStack Query if using API calls

For mobile-first prototype:

- React Native with Expo
- NativeWind
- Expo Router

## 10.2 Backend

Recommended options:

### Option A: Convex

Good for fast MVP development.

Use Convex for:

- Auth
- Database
- Realtime updates
- Trip data
- Tasks
- AI logs
- Group state
- Moments

### Option B: Next.js API Routes

Good for simple web prototype.

Use API routes for:

- AI calls
- mock integrations
- itinerary generation
- readiness analysis

## 10.3 AI Provider

Recommended for MVP:

- OpenRouter
- OpenAI
- Anthropic
- Gemini
- Groq for fast cheap inference

The app should isolate AI calls behind a service layer so the provider can be swapped.

## 10.4 Storage

Use storage for:

- Uploaded documents
- Trip photos
- Booking screenshots
- Moment images

For MVP:

- Convex file storage
- Supabase Storage
- UploadThing
- Local mock storage

## 10.5 Notifications

For MVP:

- In-app notification center
- Simulated proactive alerts

For production:

- Push notifications
- Email reminders
- Calendar reminders

---

# 11. Data Model Blueprint

Use these as conceptual entities. Adapt to the chosen database.

## 11.1 User

```ts
type User = {
  id: string
  name: string
  email: string
  avatarUrl?: string
  travelPreferences?: TravelPreferences
  createdAt: string
  updatedAt: string
}
```

## 11.2 TravelPreferences

```ts
type TravelPreferences = {
  defaultBudgetLevel?: "budget" | "mid_range" | "premium"
  preferredPace?: "relaxed" | "balanced" | "packed"
  interests?: string[]
  foodPreferences?: string[]
  accessibilityNeeds?: string[]
  preferredTransport?: string[]
}
```

## 11.3 Trip

```ts
type Trip = {
  id: string
  userId: string
  title: string
  destination: string
  startDate: string
  endDate: string
  arrivalTime?: string
  departureTime?: string
  budget?: number
  currency?: string
  groupType: "solo" | "couple" | "family" | "friends" | "team"
  travelStyle: string[]
  status: "draft" | "planning" | "ready" | "active" | "completed"
  readinessScore: number
  createdAt: string
  updatedAt: string
}
```

## 11.4 ItineraryDay

```ts
type ItineraryDay = {
  id: string
  tripId: string
  dayNumber: number
  date: string
  title: string
  summary?: string
  pace: "relaxed" | "balanced" | "packed"
  estimatedCost?: number
  notes?: string
}
```

## 11.5 ItineraryActivity

```ts
type ItineraryActivity = {
  id: string
  tripId: string
  dayId: string
  title: string
  description?: string
  location?: string
  startTime?: string
  endTime?: string
  category: "food" | "activity" | "transport" | "rest" | "hotel" | "flight" | "other"
  estimatedCost?: number
  priority: "optional" | "recommended" | "must_do"
  status: "planned" | "completed" | "skipped" | "moved"
  backupForActivityId?: string
}
```

## 11.6 Booking

```ts
type Booking = {
  id: string
  tripId: string
  type: "flight" | "hotel" | "activity" | "transport" | "insurance" | "other"
  title: string
  provider?: string
  confirmationCode?: string
  startDateTime?: string
  endDateTime?: string
  location?: string
  attachmentUrl?: string
  notes?: string
}
```

## 11.7 TripTask

```ts
type TripTask = {
  id: string
  tripId: string
  assignedToUserId?: string
  title: string
  description?: string
  category: "document" | "booking" | "packing" | "budget" | "transport" | "group" | "safety" | "other"
  priority: "low" | "medium" | "high" | "critical"
  status: "todo" | "in_progress" | "done" | "dismissed"
  dueDate?: string
  createdBy: "user" | "ai"
}
```

## 11.8 ReadinessItem

```ts
type ReadinessItem = {
  id: string
  tripId: string
  category: "documents" | "bookings" | "packing" | "budget" | "schedule" | "transportation" | "weather" | "safety" | "group_sync" | "backup_plans"
  title: string
  description: string
  status: "complete" | "missing" | "at_risk" | "not_applicable"
  impact: "low" | "medium" | "high"
  suggestedAction?: string
}
```

## 11.9 Risk

```ts
type Risk = {
  id: string
  tripId: string
  type: "weather" | "flight" | "schedule" | "budget" | "booking" | "document" | "transportation" | "safety" | "group" | "overload"
  level: "low" | "medium" | "high" | "critical"
  title: string
  message: string
  suggestedFix?: string
  status: "open" | "resolved" | "dismissed"
  source: "ai" | "system" | "integration"
}
```

## 11.10 Moment

```ts
type Moment = {
  id: string
  tripId: string
  dayId?: string
  title?: string
  note?: string
  imageUrl?: string
  location?: string
  tags?: string[]
  aiCaption?: string
  isHighlight: boolean
  createdAt: string
}
```

## 11.11 WrappedSummary

```ts
type WrappedSummary = {
  id: string
  tripId: string
  tripVibe: string
  summary: string
  placesVisited: number
  mostMemorableDay?: string
  topMoments: string[]
  budgetSummary?: string
  travelPersonality?: string
  nextTripRecommendation?: string
  shareCards: WrappedShareCard[]
}
```

---

# 12. Screen Map

## 12.1 Public / Entry Screens

- Landing screen
- Login screen
- Sign-up screen
- Demo trip entry
- Create first trip CTA

## 12.2 Onboarding Screens

- Destination input
- Date input
- Budget input
- Group type input
- Travel style input
- Interests input
- Existing booking status
- AI summary confirmation

## 12.3 Main App Screens

- Home / Trips list
- Trip dashboard
- Itinerary
- Readiness
- Risk Radar
- Bookings
- Tasks
- TripSync
- Travel Mode
- Moments
- Wrapped
- Insights
- Settings

## 12.4 Important Modal / Drawer Components

- AI assistant drawer
- Add booking modal
- Add task modal
- Add moment modal
- Replan day modal
- Fix readiness modal
- Risk detail modal
- Group member modal
- Share wrapped modal

---

# 13. Component Blueprint

## 13.1 Core Layout

- AppShell
- MobileFrame or ResponsiveLayout
- TopNav
- BottomNav
- PageHeader
- SectionHeader
- EmptyState
- LoadingState
- ErrorState

## 13.2 Trip Components

- `TripCard
- TripDashboardHeader
- TripStatusBadge
- NextBestActionCard
- TripTimeline
- TripQuickActions

## 13.3 AI Components

- ViyaAssistantPanel
- ViyaMessageCard
- AIRecommendationCard
- ProactiveAlertCard
- FixSuggestionCard
- AIThinkingState

## 13.4 Readiness Components

- ReadinessScoreCard
- ReadinessCategoryGrid
- ReadinessItemCard
- FixMyReadinessButton
- ReadinessProgressBar

## 13.5 Risk Components

- RiskRadarSummary
- RiskCard
- RiskSeverityBadge
- RiskFixAction

## 13.6 Itinerary Components

- ItineraryDayCard
- ActivityCard
- ActivityTimeline
- ActivityActions
- ReplanButton

## 13.7 Travel Mode Components

- CurrentActivityCard
- NextActivityCard
- TimeToLeaveCard
- TravelModeQuickActions
- LiveAlertCard

## 13.8 Moments Components

- MomentCard
- MomentGrid
- AddMomentButton
- CaptionGenerator
- DailySummaryCard

## 13.9 Wrapped Components

- WrappedIntro
- WrappedStatCard
- WrappedMomentCard
- WrappedPersonalityCard
- WrappedShareCard
- WrappedCarousel

---

# 14. AI Architecture Blueprint

## 14.1 AI Service Layer

Create a single AI service abstraction.

Example:

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

## 14.2 AI Output Rules

AI responses should return structured JSON whenever they affect app state.

Avoid storing raw prose when structured data is needed.

Example readiness output:

```ts
type ReadinessResult = {
  score: number
  status: "not_ready" | "needs_attention" | "almost_ready" | "ready"
  items: ReadinessItem[]
  summary: string
  nextBestActions: string[]
}
```

## 14.3 AI Prompting Principles

Prompts should include:

- Trip context
- User preferences
- Existing itinerary
- Existing bookings
- Existing tasks
- Readiness items
- Risks
- Desired output schema
- Constraints

## 14.4 Prompt Template: Itinerary Generation

```text
You are Viya, an AI travel operations companion.

Generate a realistic itinerary for the trip below.

Trip:
- Destination: {{destination}}
- Dates: {{startDate}} to {{endDate}}
- Arrival: {{arrivalTime}}
- Departure: {{departureTime}}
- Budget: {{budget}}
- Group type: {{groupType}}
- Travel style: {{travelStyle}}
- Interests: {{interests}}

Rules:
- Keep the itinerary realistic.
- Account for arrival and departure times.
- Avoid overloaded days.
- Add rest periods.
- Cluster nearby activities.
- Include estimated cost when possible.
- Include backup suggestions when useful.
- Return structured JSON only.

Output schema:
{
  "summary": string,
  "days": [
    {
      "dayNumber": number,
      "date": string,
      "title": string,
      "pace": "relaxed" | "balanced" | "packed",
      "summary": string,
      "activities": [
        {
          "title": string,
          "description": string,
          "location": string,
          "startTime": string,
          "endTime": string,
          "category": string,
          "estimatedCost": number,
          "priority": string
        }
      ]
    }
  ],
  "planningNotes": string[],
  "potentialRisks": string[]
}
```

## 14.5 Prompt Template: Readiness Analysis

```text
You are Viya, an AI travel readiness assistant.

Analyze this trip and calculate a readiness score from 0 to 100.

Trip context:
{{tripContext}}

Itinerary:
{{itinerary}}

Bookings:
{{bookings}}

Tasks:
{{tasks}}

Documents:
{{documents}}

Group status:
{{groupStatus}}

Rules:
- Identify missing or risky preparation items.
- Score based on documents, bookings, packing, budget, schedule, transportation, weather, safety, group sync, and backup plans.
- Prioritize actionable items.
- Return structured JSON only.

Output schema:
{
  "score": number,
  "status": "not_ready" | "needs_attention" | "almost_ready" | "ready",
  "summary": string,
  "items": [
    {
      "category": string,
      "title": string,
      "description": string,
      "status": "complete" | "missing" | "at_risk" | "not_applicable",
      "impact": "low" | "medium" | "high",
      "suggestedAction": string
    }
  ],
  "nextBestActions": string[]
}
```

## 14.6 Prompt Template: Fix My Readiness

```text
You are Viya, an AI travel operations assistant.

The user wants to improve their trip readiness.

Trip context:
{{tripContext}}

Readiness issues:
{{readinessItems}}

Existing tasks:
{{tasks}}

Risks:
{{risks}}

Create practical fixes.

Rules:
- Convert issues into tasks, reminders, itinerary changes, or suggestions.
- Do not invent confirmed bookings.
- If information is missing, create a task asking the user to provide it.
- Return structured JSON only.

Output schema:
{
  "summary": string,
  "createdTasks": [
    {
      "title": string,
      "description": string,
      "category": string,
      "priority": "low" | "medium" | "high" | "critical",
      "dueDate": string
    }
  ],
  "suggestedItineraryChanges": [
    {
      "reason": string,
      "change": string
    }
  ],
  "reminders": [
    {
      "title": string,
      "scheduledFor": string
    }
  ],
  "questionsForUser": string[]
}
```

## 14.7 Prompt Template: Risk Detection

```text
You are Viya, an AI risk radar for travel.

Analyze the trip and detect risks.

Trip:
{{tripContext}}

Itinerary:
{{itinerary}}

Bookings:
{{bookings}}

Weather:
{{weather}}

Group readiness:
{{groupStatus}}

Rules:
- Identify realistic risks.
- Explain why each risk matters.
- Suggest a fix.
- Return structured JSON only.

Output schema:
{
  "risks": [
    {
      "type": string,
      "level": "low" | "medium" | "high" | "critical",
      "title": string,
      "message": string,
      "suggestedFix": string
    }
  ]
}
```

## 14.8 Prompt Template: Travel Mode Replanning

```text
You are Viya, a live travel assistant.

The user needs help adjusting the current travel day.

Current situation:
{{situation}}

Today itinerary:
{{todayItinerary}}

Trip constraints:
{{tripContext}}

Rules:
- Preserve the most important activities if possible.
- Reduce stress.
- Keep the plan realistic.
- Explain what changed.
- Return structured JSON only.

Output schema:
{
  "summary": string,
  "updatedActivities": [],
  "removedActivities": [],
  "newSuggestions": [],
  "messageToUser": string
}
```

## 14.9 Prompt Template: Viya Wrapped

```text
You are Viya, an AI travel memory companion.

Generate a post-trip wrapped summary.

Trip:
{{tripContext}}

Completed itinerary:
{{completedItinerary}}

Moments:
{{moments}}

Budget:
{{budget}}

Rules:
- Make it emotional, concise, and shareable.
- Include practical insights.
- Suggest a next trip.
- Return structured JSON only.

Output schema:
{
  "tripVibe": string,
  "summary": string,
  "placesVisited": number,
  "topMoments": string[],
  "mostMemorableDay": string,
  "budgetSummary": string,
  "travelPersonality": string,
  "nextTripRecommendation": string,
  "shareCards": [
    {
      "title": string,
      "subtitle": string,
      "value": string
    }
  ]
}
```

---

# 15. Proactive Notification Blueprint

## 15.1 Notification Types

- Readiness reminder
- Packing reminder
- Booking gap alert
- Weather risk alert
- Schedule conflict alert
- Flight reminder
- Group reminder
- Budget warning
- Moment suggestion
- Post-trip wrap-up notification

## 15.2 Notification Timing

### Before Trip

- 7 days before
- 72 hours before
- 48 hours before
- 24 hours before
- Morning of trip

### During Trip

- Morning summary
- Before next activity
- If user is behind schedule
- If risk appears
- If group member has pending action

### After Trip

- End-of-trip recap
- Viya Wrapped ready
- Insights generated

## 15.3 Notification Examples

```text
Your trip starts in 3 days. You still have 4 readiness items to complete.
```

```text
Rain is likely tomorrow afternoon. I created a backup indoor activity suggestion.
```

```text
You are behind schedule. Want me to replan the rest of the day?
```

```text
Your trip has ended. Viya Wrapped is ready.
```

---

# 16. Demo Data Blueprint

Use this scenario for MVP demos.

## Demo Trip

```text
Destination: Palawan
Dates: June 10–15
Arrival: 4:35 PM
Departure: 5:15 PM
Group: Couple or friends
Budget: Mid-range
Travel style: Balanced, scenic, food, beach
```

## Seeded Risks

- Arrival is late on Day 1
- Day 2 has too many activities
- Rain risk on Day 3
- Missing hotel booking for final night
- No airport transfer
- Packing checklist incomplete

## Seeded Readiness Score

```text
Initial score: 68%
After Fix My Readiness: 84%
After user completes tasks: 94%
```

## Seeded Moments

- Arrival dinner
- Underground River
- Island hopping
- Sunset viewpoint
- Local food discovery

## Seeded Wrapped

```text
Trip Vibe: Island Explorer
Places Visited: 12
Most Memorable Day: Day 3
Top Spend: Food and Island Activities
Next Recommendation: Siargao or Bohol
```

---

# 17. Build Phases

## Phase 1: Static Prototype

Goal:

Build the core screens with mocked data.

Screens:

- Landing
- Onboarding
- Trip dashboard
- Itinerary
- Readiness
- Risk Radar
- Travel Mode
- Moments
- Wrapped

Deliverable:

A beautiful clickable demo that explains the product.

## Phase 2: AI-Generated Itinerary

Goal:

Connect real AI generation for itinerary creation.

Build:

- AI service layer
- Itinerary prompt
- Structured JSON parsing
- Itinerary save flow
- Error handling

## Phase 3: Readiness and Risk Engine

Goal:

Make Viya feel proactive.

Build:

- Readiness analysis
- Risk detection
- Fix My Readiness
- AI-generated tasks
- Dashboard updates

## Phase 4: Travel Mode

Goal:

Show live usefulness.

Build:

- Current day view
- Quick replan
- Delay handling
- Weather mock or API
- Next activity assistant

## Phase 5: Moments and Wrapped

Goal:

Add emotional product value.

Build:

- Moment capture
- AI captions
- Wrapped generation
- Shareable cards

## Phase 6: Group TripSync

Goal:

Add coordination layer.

Build:

- Shared trip members
- Task assignment
- Voting
- Group readiness
- AI group summary

---

# 18. Implementation Priorities

## Priority 1

- Clean visual design
- Trip creation flow
- Dashboard
- AI itinerary generation
- Readiness score
- Fix My Readiness

## Priority 2

- Risk Radar
- Travel Mode
- Moments
- Wrapped

## Priority 3

- TripSync
- Notifications
- Document parsing
- Calendar sync
- Real external APIs

---

# 19. UX Copy Guidelines

Use simple and reassuring language.

Avoid sounding robotic.

Preferred tone:

- Helpful
- Calm
- Proactive
- Practical
- Friendly
- Confident

Examples:

```text
Your trip is almost ready. I found a few things we can fix before you go.
```

```text
This day looks a little packed. I can make it more relaxed.
```

```text
Rain may affect your outdoor plan. I created a backup option.
```

```text
You are ready to travel. I’ll keep monitoring your trip for changes.
```

Avoid:

```text
Error: missing required itinerary details.
```

Prefer:

```text
I need one more detail before I can finish your itinerary.
```

---

# 20. Important Product Guardrails

## 20.1 Do Not Build Viya as Only a Chatbot

The chat is a supporting interface. The main product should be structured around cards, screens, scores, tasks, timelines, and actions.

## 20.2 Do Not Make AI Output Only Text

Whenever AI creates something useful, convert it into app state:

- Itinerary items
- Tasks
- Risks
- Readiness items
- Moments
- Wrapped cards

## 20.3 Do Not Overload the User

Viya should prioritize next best actions, not show every possible issue at once.

## 20.4 Do Not Fake Confirmed Real-World Data

If using mock data, label internally as simulated. The AI should not claim it has confirmed real bookings, weather, or flight statuses unless actual integrations exist.

## 20.5 Do Not Make the Product Generic

Keep the core product identity:

- Readiness
- Proactive travel help
- Full life cycle assistance
- Travel operations
- Memories and wrap-up

---

# 21. Success Metrics

## MVP Demo Metrics

- User understands the product within 30 seconds
- User can create a trip quickly
- Readiness score is visible and understandable
- Fix My Readiness feels useful
- Risk Radar feels proactive
- Travel Mode feels practical
- Wrapped feels emotional and shareable

## Product Metrics

- Trip creation completion rate
- Itinerary generation completion rate
- Readiness score improvement
- Tasks completed before trip
- Risk alerts acted on
- Travel Mode usage during trip
- Moments captured per trip
- Wrapped shares
- Repeat trip creation

---

# 22. Suggested App Information Architecture

```text
App
├── Auth
│   ├── Login
│   └── Sign Up
├── Onboarding
│   ├── Welcome
│   ├── Create Trip
│   └── Trip Preferences
├── Trips
│   ├── Trip List
│   └── Trip Dashboard
├── Trip Detail
│   ├── Itinerary
│   ├── Readiness
│   ├── Risk Radar
│   ├── Bookings
│   ├── Tasks
│   ├── TripSync
│   ├── Travel Mode
│   ├── Moments
│   ├── Wrapped
│   └── Insights
└── Settings
```

---

# 23. Suggested Folder Structure

## For Next.js

```text
src/
├── app/
│   ├── page.tsx
│   ├── trips/
│   ├── onboarding/
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

## For Expo React Native

```text
src/
├── app/
│   ├── index.tsx
│   ├── onboarding/
│   ├── trips/
│   └── trip/
├── components/
│   ├── ui/
│   ├── trip/
│   ├── itinerary/
│   ├── readiness/
│   ├── risk/
│   ├── travel-mode/
│   ├── moments/
│   └── wrapped/
├── features/
├── services/
│   └── ai/
├── stores/
├── types/
└── constants/
```

---

# 24. Build Instructions for AI Coding Agent

When building Viya, follow these instructions:

1. Always preserve the product identity: Viya is an AI travel operations companion, not just a planner.
2. Build mobile-first.
3. Use structured components, not one large file.
4. Keep data types clear and reusable.
5. Use mock data first if integrations are not available.
6. Make AI outputs structured and persistable.
7. Prioritize dashboard, readiness score, Fix My Readiness, Risk Radar, and Travel Mode.
8. Make the UI feel proactive through cards, alerts, and next actions.
9. Use optimistic UI where appropriate.
10. Keep flows demo-friendly and visually polished.
11. Avoid overengineering the MVP.
12. Build with future integrations in mind.

---

# 25. Recommended MVP Build Order for Codex

## Step 1

Set up project structure, routes, layout, and shared UI components.

## Step 2

Create mock trip data for the Palawan demo.

## Step 3

Build the Trip Dashboard with:

- Readiness score
- Next best action
- Risk alerts
- Itinerary preview
- Pending tasks

## Step 4

Build Itinerary screen.

## Step 5

Build Readiness screen and Fix My Readiness UI.

## Step 6

Build Risk Radar screen.

## Step 7

Build Travel Mode screen.

## Step 8

Build Moments screen.

## Step 9

Build Viya Wrapped screen.

## Step 10

Connect AI service layer and replace mock outputs gradually.

---

# 26. Final Product North Star

Viya should make the traveler feel:

```text
I know what to do.
I know what is missing.
I know what could go wrong.
I know how to fix it.
I have help during the trip.
I can remember and share the trip afterward.
```

That is the product experience to build.
