# 07 Screen Map and Navigation

## Purpose

This file defines the app routes, screen responsibilities, and navigation rules.

## Navigation model

Use Expo Router.

Recommended app groups:

```txt
app/
├── _layout.tsx
├── index.tsx
├── onboarding/
│   ├── index.tsx
│   ├── preferences.tsx
│   ├── create-trip.tsx
│   └── generating.tsx
├── trips/
│   ├── index.tsx
│   └── [tripId]/
│       ├── index.tsx
│       ├── itinerary.tsx
│       ├── readiness.tsx
│       ├── risks.tsx
│       ├── tripsync.tsx
│       ├── travel-mode.tsx
│       ├── moments.tsx
│       └── wrapped.tsx
├── viya/
│   └── index.tsx
├── moments/
│   └── index.tsx
└── profile/
    └── index.tsx
```

## Main app tabs

### Home

Purpose: Personal overview, active trips, next actions, and Viya suggestions.

### Trips

Purpose: List upcoming, active, and completed trips.

### Viya

Purpose: Global AI companion/chat. Can be trip-specific or general.

### Moments

Purpose: Memory library across trips.

### Profile

Purpose: User preferences, travel style, settings.

## Onboarding flow

### Welcome screen

Goal: Introduce Viya.

Primary action: `Plan your first trip`

Secondary action: `Explore demo trip`

### Preferences screen

Collect:

- Travel style
- Pace
- Budget preference
- Group type
- Interests

### Create trip screen

Collect:

- Destination
- Dates
- Arrival/departure details
- Budget
- Group size
- Travel style

### Generating screen

Show Viya creating the plan.

Should communicate:

- Building itinerary
- Checking timing
- Creating readiness checklist
- Detecting risks

## Trip dashboard

Route: `/trips/[tripId]`

Purpose: Main source of truth for a trip.

Sections:

1. Trip header
2. Readiness score
3. Next best action
4. Today/upcoming plan
5. Risk alerts
6. Checklist preview
7. Bookings preview
8. Moments preview
9. Viya suggestions

Primary actions:

- Open Travel Mode
- Fix My Readiness
- View Itinerary
- Ask Viya

## Itinerary screen

Route: `/trips/[tripId]/itinerary`

Purpose: View and edit day-by-day plan.

Actions:

- Optimize day
- Replan day
- Add activity
- Replace activity
- Make cheaper
- Make relaxed
- Add backup plan

## Readiness screen

Route: `/trips/[tripId]/readiness`

Purpose: Show preparedness score and missing items.

Sections:

- Overall score
- Category scores
- Critical gaps
- Checklist
- Fix My Readiness

## Risk Radar screen

Route: `/trips/[tripId]/risks`

Purpose: Show risks by severity.

Sections:

- Critical risks
- High risks
- Medium/low risks
- Mitigated risks

## TripSync screen

Route: `/trips/[tripId]/tripsync`

Purpose: Group coordination.

Sections:

- Members
- Member readiness
- Assigned tasks
- Pending decisions
- Votes
- Group announcements

## Travel Mode screen

Route: `/trips/[tripId]/travel-mode`

Purpose: Live assistance during the trip.

Sections:

- Current day
- Now/next activity
- Quick actions
- Booking quick access
- Risk alert
- Replan action
- Emergency info

## Moments screen

Route: `/trips/[tripId]/moments`

Purpose: Capture trip memories.

Sections:

- Daily moments
- Highlight moments
- Add note/photo
- AI captions
- Favorite places

## Wrapped screen

Route: `/trips/[tripId]/wrapped`

Purpose: Post-trip recap.

Sections:

- Trip summary
- Stats
- Best moments
- Budget recap
- Travel personality
- Shareable cards
- Next trip suggestions

## Navigation rules

- Trip dashboard is the main source of truth.
- Readiness, Risk Radar, and Travel Mode must be accessible from the dashboard.
- Viya AI should be globally accessible.
- Each trip-specific screen should include a clear way back to the dashboard.
- Avoid deep navigation stacks for MVP.
- Avoid hiding critical actions in menus.

## Demo route recommendation

Add a demo mode route or toggle to show the Palawan scenario quickly:

- Destination: Palawan
- Dates: June 10–15
- Arrival: 4:35 PM
- Departure: 5:15 PM
- Travel style: Balanced and scenic
