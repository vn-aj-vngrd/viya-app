# 09 API and Backend Contracts

## Purpose

This file defines expected backend and AI operations for Viya.

The recommended backend is Convex. Use Convex queries, mutations, and actions where possible.

## Contract principles

- Use structured input and output.
- Validate AI output before saving.
- Keep UI payloads predictable.
- Do not invent confirmed travel facts.
- Make demo data clearly marked.

## Trip operations

### `createTrip`

Input:

```ts
{
  title?: string;
  destination: string;
  startDate: string;
  endDate: string;
  arrivalTime?: string;
  departureTime?: string;
  budgetAmount?: number;
  budgetCurrency?: string;
  travelStyle?: string;
  groupType?: string;
}
```

Output:

```ts
{
  tripId: string;
}
```

### `updateTrip`

Updates core trip fields.

### `getTripById`

Returns trip with high-level dashboard data.

### `listTrips`

Returns upcoming, active, and completed trips.

### `deleteTrip`

Soft-delete or archive trip for MVP unless hard delete is required.

## Itinerary operations

### `generateItinerary`

AI action.

Input:

```ts
{
  tripId: string;
  preferences?: Record<string, unknown>;
}
```

Output:

```ts
{
  summary: string;
  assumptions: string[];
  days: Array<{
    date: string;
    title: string;
    summary: string;
    items: Array<{
      title: string;
      category: string;
      startTime?: string;
      endTime?: string;
      locationName?: string;
      estimatedCost?: number;
      notes?: string;
      aiReason?: string;
    }>;
  }>;
  warnings: string[];
  nextActions: string[];
}
```

### `saveGeneratedItinerary`

Saves validated itinerary output.

### `replanDay`

AI action for one day.

Input includes trip, day, reason, and constraints.

## Readiness operations

### `analyzeReadiness`

AI action.

Input:

```ts
{
  tripId: string;
}
```

Output:

```ts
{
  overallScore: number;
  categoryScores: {
    documents: number;
    bookings: number;
    packing: number;
    budget: number;
    schedule: number;
    transport: number;
    weather: number;
    safety: number;
    group: number;
    backupPlan: number;
  };
  summary: string;
  missingItems: Array<{
    category: string;
    title: string;
    priority: "low" | "medium" | "high" | "critical";
    reason: string;
  }>;
  suggestedActions: Array<{
    label: string;
    actionType: string;
  }>;
}
```

### `fixReadiness`

AI action.

Creates suggested tasks, reminders, backup plans, or itinerary modifications.

### `listReadinessItems`

Query.

### `updateReadinessItem`

Mutation.

### `recalculateReadinessScore`

Mutation or internal function.

## Risk operations

### `detectRisks`

AI action.

Output:

```ts
{
  risks: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    message: string;
    suggestedAction: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }>;
}
```

### `dismissRisk`

Mutation.

### `mitigateRisk`

Mutation.

## Booking operations

### `createBooking`

Manual booking creation.

### `extractBookingFromText`

AI action that extracts booking information from pasted text.

### `listBookings`

Query.

## TripSync operations

### `inviteTripMember`

Mutation.

### `assignTask`

Mutation.

### `createDecisionVote`

Mutation.

### `summarizeGroupDecisions`

AI action.

## Travel Mode operations

### `getTravelModeState`

Returns current day, next item, alerts, quick actions, and bookings.

### `replanToday`

AI action for active travel changes.

Input:

```ts
{
  tripId: string;
  reason: "delayed" | "weather" | "tired" | "budget" | "custom";
  userNote?: string;
}
```

## Moments operations

### `createMoment`

Mutation.

### `generateMomentCaption`

AI action.

### `summarizeDayMoments`

AI action.

### `listMoments`

Query.

## Wrapped operations

### `generateWrapped`

AI action for completed trips.

Output:

```ts
{
  title: string;
  summary: string;
  travelPersonality: string;
  stats: Array<{
    label: string;
    value: string;
    description?: string;
  }>;
  topMoments: Array<{
    title: string;
    caption: string;
  }>;
  budgetSummary?: string;
  nextTripRecommendations: string[];
}
```

## AI JSON validation rules

- Validate shape before saving.
- Reject missing required fields.
- Store raw AI output only for debugging if safe.
- Show user-friendly error when parsing fails.
- Provide retry action.

## Error response shape

```ts
{
  error: {
    code: string;
    message: string;
    retryable: boolean;
  }
}
```

## Demo mode

Demo mode may use seeded Palawan trip data.

Rules:

- Clearly mark demo data.
- Keep demo deterministic.
- Do not call paid AI endpoints unless explicitly required.
- Use cached AI-like responses for demo reliability if needed.
