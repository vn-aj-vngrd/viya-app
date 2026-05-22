# 08 Component Guidelines

## Purpose

This file defines how to use HeroUI Native and when to create custom Viya components.

## Main rule

Use HeroUI Native components first. Do not rebuild standard UI primitives unless there is a clear product-specific reason.

## Use HeroUI Native for

- Button
- Card
- Input / TextField
- Select
- Checkbox
- Radio
- Switch
- Avatar
- Badge
- Chip
- Modal / Dialog
- Tabs
- Accordion
- Progress
- Skeleton
- Toast
- Popover
- List-style controls

## Custom Viya components

Only create custom components for product-specific travel patterns.

Recommended components:

```txt
components/trip/
├── TripHeader.tsx
├── TripSummaryCard.tsx
├── TripStatusPill.tsx
└── NextBestActionCard.tsx

components/readiness/
├── ReadinessScoreCard.tsx
├── ReadinessCategoryRow.tsx
├── ReadinessItemCard.tsx
└── FixReadinessButton.tsx

components/risk/
├── RiskAlertCard.tsx
├── RiskSeverityBadge.tsx
└── RiskActionSheet.tsx

components/itinerary/
├── TripDayTimeline.tsx
├── ItineraryItemCard.tsx
├── DayPaceBadge.tsx
└── ReplanDayButton.tsx

components/travel-mode/
├── TravelModeNowCard.tsx
├── NextActivityCard.tsx
├── TravelQuickActions.tsx
└── BookingQuickAccess.tsx

components/moments/
├── MomentCard.tsx
├── AddMomentButton.tsx
└── CaptionSuggestionCard.tsx

components/wrapped/
├── WrappedHeroCard.tsx
├── WrappedStatCard.tsx
├── WrappedMomentCard.tsx
└── ShareableTravelCard.tsx
```

## Component design rules

### Cards

- Use generous padding.
- Prefer one primary idea per card.
- Avoid dense information.
- Use subtle borders and shadows.
- Use rounded corners.

### Buttons

- One primary action per screen section.
- Use clear labels: `Fix My Readiness`, `Replan Today`, `Ask Viya`.
- Avoid vague labels like `Submit` or `Continue` when a more specific action exists.

### Lists

- Keep rows readable.
- Use icons sparingly.
- Show status clearly.
- Use skeletons while loading.

### Progress and readiness

- Readiness score should be visual and easy to understand.
- Always pair a score with an explanation and next action.

### Empty states

Every empty state should include:

- What is missing
- Why it matters
- One action to fix it

Example:

> No bookings yet. Add your hotel or flight details so Viya can check your readiness.

### Error states

Every error state should include:

- Human-readable message
- Retry action if possible
- No stack traces in UI

## Apple-inspired layout rules

- Prioritize whitespace.
- Use calm typography.
- Avoid visual noise.
- Prefer simple hierarchy over heavy decoration.
- Use soft surfaces and subtle separation.
- Make screens feel native and touch-friendly.

## HeroUI Native usage rules

- Import from `heroui-native`.
- Prefer granular imports when practical.
- Do not use web HeroUI patterns in the native app.
- Do not mix unrelated UI libraries unless necessary.
- Wrap product styling around HeroUI primitives instead of creating new primitives.

## Component naming

Use clear product names:

Good:

- `ReadinessScoreCard`
- `RiskAlertCard`
- `TravelModeNowCard`

Bad:

- `Card2`
- `InfoBox`
- `CustomContainer`
- `NewButton`

## Accessibility rules

- Buttons must have clear accessible labels.
- Interactive rows must be large enough for touch.
- Do not rely on color alone to communicate status.
- Text must have sufficient contrast.
- Important alerts must be readable by screen readers.

## Motion rules

Use subtle motion for:

- Screen transitions
- Card reveal
- Readiness score updates
- Wrapped recap
- AI loading states

Avoid excessive animations that make the app feel noisy.
