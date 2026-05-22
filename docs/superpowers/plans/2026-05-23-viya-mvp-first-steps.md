# Viya MVP First Steps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first executable Viya product slice: domain model, Palawan demo data, main navigation, trip dashboard, readiness scoring, and a reliable foundation for itinerary, risks, travel mode, moments, and wrapped.

**Architecture:** Keep the current Bun monorepo, Expo Router native app, HeroUI Native UI system, Clerk provider, and Convex backend. Start with deterministic typed demo data so the app can run without external AI, then mirror the same shapes into Convex schema and functions before adding live AI flows.

**Tech Stack:** Bun workspaces, Expo React Native, TypeScript, Expo Router, HeroUI Native, Uniwind, Convex, Zod, Vitest, Ultracite.

---

## Source Context

- Product source of truth: `docs/ai-context/01-product-blueprint.md`
- Feature tickets: `docs/ai-context/02-feature-tickets.md`
- Design system: `docs/ai-context/03-design-system.md`
- Architecture: `docs/ai-context/04-app-architecture.md`
- Data model: `docs/ai-context/05-data-model.md`
- AI behavior: `docs/ai-context/06-ai-behavior.md`
- Navigation: `docs/ai-context/07-screen-map-and-navigation.md`
- Component rules: `docs/ai-context/08-component-guidelines.md`
- Backend contracts: `docs/ai-context/09-api-contracts.md`
- MVP sequence: `docs/ai-context/11-mvp-build-plan.md`
- Quality checklist: `docs/ai-context/12-quality-checklist.md`

## Current Repo Baseline

- Native app entry: `apps/native/app/_layout.tsx`
- Current primary shell: `apps/native/app/(drawer)/_layout.tsx`
- Current starter home: `apps/native/app/(drawer)/index.tsx`
- Current starter tabs: `apps/native/app/(drawer)/(tabs)/_layout.tsx`
- Current AI chat screen: `apps/native/app/(drawer)/ai.tsx`
- Shared container: `apps/native/components/container.tsx`
- Convex schema is empty: `packages/backend/convex/schema.ts`
- Convex generated API is already imported from native code.

## File Structure For This First Slice

- Create `apps/native/src/types/viya.ts`: product domain types used by demo data, screens, and pure utilities.
- Create `apps/native/src/constants/viya.ts`: route constants, status labels, and category presentation metadata.
- Create `apps/native/src/data/palawan-demo.ts`: deterministic Palawan trip seed matching the AI context.
- Create `apps/native/src/features/readiness/scoring.ts`: pure readiness score calculation.
- Create `apps/native/src/features/readiness/scoring.test.ts`: tests for the readiness score math and status transitions.
- Create `apps/native/src/features/trips/selectors.ts`: pure dashboard selectors for next action, today plan, critical risks, and trip stats.
- Create `apps/native/src/features/trips/selectors.test.ts`: tests for dashboard selectors against the Palawan demo trip.
- Create `apps/native/src/components/trip/TripHeader.tsx`: trip identity and status summary.
- Create `apps/native/src/components/trip/NextBestActionCard.tsx`: the product-defining proactive action card.
- Create `apps/native/src/components/readiness/ReadinessScoreCard.tsx`: dashboard readiness summary.
- Create `apps/native/src/components/risk/RiskAlertCard.tsx`: compact risk preview.
- Create `apps/native/src/components/itinerary/ItineraryPreview.tsx`: upcoming day summary.
- Modify `apps/native/app/(drawer)/(tabs)/_layout.tsx`: replace starter tabs with Home, Trips, Viya, Moments, Profile.
- Modify `apps/native/app/(drawer)/(tabs)/index.tsx`: make Home the Viya product overview and demo entry.
- Create `apps/native/app/(drawer)/(tabs)/trips.tsx`: list the demo trip and future trip entry points.
- Create `apps/native/src/features/viya/ViyaChatScreen.tsx`: shared Viya-branded AI chat screen.
- Create `apps/native/app/(drawer)/(tabs)/viya.tsx`: route-level wrapper for the shared Viya chat screen.
- Create `apps/native/app/(drawer)/(tabs)/moments.tsx`: cross-trip moments overview using demo moments.
- Create `apps/native/app/(drawer)/(tabs)/profile.tsx`: traveler preference summary using demo preferences.
- Create `apps/native/app/(drawer)/trips/[tripId]/index.tsx`: trip dashboard for the Palawan demo.
- Create `apps/native/app/(drawer)/trips/[tripId]/itinerary.tsx`: itinerary screen shell populated by demo data.
- Create `apps/native/app/(drawer)/trips/[tripId]/readiness.tsx`: readiness screen shell populated by score utility.
- Create `apps/native/app/(drawer)/trips/[tripId]/risks.tsx`: Risk Radar screen shell populated by demo risks.
- Create `apps/native/app/(drawer)/trips/[tripId]/travel-mode.tsx`: Travel Mode screen shell populated by the current demo day.
- Create `apps/native/app/(drawer)/trips/[tripId]/moments.tsx`: trip moments screen shell.
- Create `apps/native/app/(drawer)/trips/[tripId]/wrapped.tsx`: wrapped recap screen shell.
- Modify `packages/backend/convex/schema.ts`: add Viya MVP tables using the names in `docs/ai-context/05-data-model.md`.
- Create `packages/backend/convex/trips.ts`: create, list, and get trip operations.
- Create `packages/backend/convex/readiness.ts`: list and update readiness operations plus score recalculation.
- Create `packages/backend/convex/risks.ts`: list, dismiss, and mitigate risk operations.

---

## Task 1: Add Test Runner For Pure Product Logic

**Files:**
- Modify: `apps/native/package.json`

- [ ] **Step 1: Add Vitest to the native workspace**

Run from repo root:

```bash
bun add -D --filter native vitest
```

Expected: `apps/native/package.json` includes `vitest` in `devDependencies`.

- [ ] **Step 2: Add native test scripts**

Modify `apps/native/package.json` scripts to include:

```json
{
  "scripts": {
    "start": "expo start",
    "dev": "expo start --clear",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "prebuild": "expo prebuild",
    "web": "expo start --web",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Verify the test command starts**

Run:

```bash
bun --filter native test
```

Expected: FAIL with a Vitest message indicating no test files were found. This is acceptable for this step because tests are added in Task 3.

- [ ] **Step 4: Commit**

```bash
git add apps/native/package.json bun.lock
git commit -m "test: Add native test runner"
```

---

## Task 2: Define Viya Domain Types And Presentation Constants

**Files:**
- Create: `apps/native/src/types/viya.ts`
- Create: `apps/native/src/constants/viya.ts`

- [ ] **Step 1: Create product domain types**

Create `apps/native/src/types/viya.ts`:

```ts
export type TravelStyle = "relaxed" | "balanced" | "packed" | "adventure" | "luxury" | "budget";
export type PacePreference = "slow" | "moderate" | "fast";
export type BudgetPreference = "budget" | "midRange" | "premium";
export type GroupType = "solo" | "couple" | "family" | "friends" | "work" | "custom";
export type TripStatus = "draft" | "planning" | "ready" | "active" | "completed" | "archived";
export type ItineraryPace = "light" | "balanced" | "packed";
export type ItineraryItemCategory =
  | "activity"
  | "food"
  | "transport"
  | "hotel"
  | "rest"
  | "shopping"
  | "note"
  | "flight"
  | "emergency";
export type ItineraryItemPriority = "required" | "recommended" | "optional";
export type ItineraryItemStatus = "planned" | "confirmed" | "skipped" | "completed";
export type ReadinessCategory =
  | "documents"
  | "bookings"
  | "packing"
  | "budget"
  | "schedule"
  | "transport"
  | "weather"
  | "safety"
  | "group"
  | "backupPlan";
export type WorkStatus = "todo" | "inProgress" | "done" | "blocked" | "ignored";
export type Priority = "low" | "medium" | "high" | "critical";
export type RiskType =
  | "weather"
  | "schedule"
  | "booking"
  | "budget"
  | "transport"
  | "safety"
  | "group"
  | "document"
  | "fatigue"
  | "unknown";
export type RiskSeverity = "low" | "medium" | "high" | "critical";
export type RiskStatus = "open" | "mitigated" | "dismissed";

export type UserPreferences = {
  travelStyle: TravelStyle;
  pacePreference: PacePreference;
  budgetPreference: BudgetPreference;
  foodPreference: string;
  accessibilityNeeds: string;
  notificationPreference: string;
  preferredStartTime: string;
  preferredRestLevel: string;
};

export type Trip = {
  id: string;
  ownerId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  arrivalTime: string;
  departureTime: string;
  budgetAmount: number;
  budgetCurrency: string;
  travelStyle: TravelStyle;
  pace: PacePreference;
  groupType: GroupType;
  status: TripStatus;
  readinessScore: number;
  coverImageUrl: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type ItineraryDay = {
  id: string;
  tripId: string;
  date: string;
  dayNumber: number;
  title: string;
  summary: string;
  theme: string;
  estimatedCost: number;
  pace: ItineraryPace;
  weatherNote: string;
};

export type ItineraryItem = {
  id: string;
  tripId: string;
  dayId: string;
  title: string;
  description: string;
  category: ItineraryItemCategory;
  locationName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  estimatedCost: number;
  bookingId: string | null;
  priority: ItineraryItemPriority;
  status: ItineraryItemStatus;
  aiReason: string;
};

export type ReadinessItem = {
  id: string;
  tripId: string;
  category: ReadinessCategory;
  title: string;
  description: string;
  status: WorkStatus;
  priority: Priority;
  dueDate: string;
  assignedToMemberId: string | null;
  aiReason: string;
  source: "system" | "ai" | "user";
};

export type ReadinessScore = {
  tripId: string;
  overallScore: number;
  categoryScores: Record<ReadinessCategory, number>;
  summary: string;
  updatedAt: string;
};

export type Risk = {
  id: string;
  tripId: string;
  type: RiskType;
  severity: RiskSeverity;
  title: string;
  message: string;
  suggestedAction: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: RiskStatus;
  aiReason: string;
  createdAt: string;
};

export type Moment = {
  id: string;
  tripId: string;
  dayId: string;
  title: string;
  caption: string;
  note: string;
  photoUrl: string;
  locationName: string;
  isHighlight: boolean;
  createdAt: string;
};

export type ViyaDemoTrip = {
  preferences: UserPreferences;
  trip: Trip;
  days: ItineraryDay[];
  items: ItineraryItem[];
  readinessItems: ReadinessItem[];
  risks: Risk[];
  moments: Moment[];
};
```

- [ ] **Step 2: Create constants for routes and labels**

Create `apps/native/src/constants/viya.ts`:

```ts
import type { Priority, ReadinessCategory, RiskSeverity, TripStatus } from "@/src/types/viya";

export const DEMO_TRIP_ID = "demo-palawan";

export const VIYA_ROUTES = {
  home: "/(drawer)/(tabs)",
  trips: "/(drawer)/(tabs)/trips",
  viya: "/(drawer)/(tabs)/viya",
  moments: "/(drawer)/(tabs)/moments",
  profile: "/(drawer)/(tabs)/profile",
  tripDashboard: "/(drawer)/trips/demo-palawan",
  tripItinerary: "/(drawer)/trips/demo-palawan/itinerary",
  tripReadiness: "/(drawer)/trips/demo-palawan/readiness",
  tripRisks: "/(drawer)/trips/demo-palawan/risks",
  tripTravelMode: "/(drawer)/trips/demo-palawan/travel-mode",
  tripMoments: "/(drawer)/trips/demo-palawan/moments",
  tripWrapped: "/(drawer)/trips/demo-palawan/wrapped",
} as const;

export const READINESS_CATEGORY_LABELS: Record<ReadinessCategory, string> = {
  documents: "Documents",
  bookings: "Bookings",
  packing: "Packing",
  budget: "Budget",
  schedule: "Schedule",
  transport: "Transport",
  weather: "Weather",
  safety: "Safety",
  group: "Group",
  backupPlan: "Backup plan",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const RISK_SEVERITY_LABELS: Record<RiskSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  draft: "Draft",
  planning: "Planning",
  ready: "Ready",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};
```

- [ ] **Step 3: Verify type imports**

Run:

```bash
bun --filter native exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/native/src/types/viya.ts apps/native/src/constants/viya.ts
git commit -m "feat: Add Viya domain types"
```

---

## Task 3: Add Palawan Demo Data And Readiness Scoring

**Files:**
- Create: `apps/native/src/data/palawan-demo.ts`
- Create: `apps/native/src/features/readiness/scoring.ts`
- Create: `apps/native/src/features/readiness/scoring.test.ts`

- [ ] **Step 1: Write failing readiness tests**

Create `apps/native/src/features/readiness/scoring.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { palawanDemoTrip } from "@/src/data/palawan-demo";
import { calculateReadinessScore } from "@/src/features/readiness/scoring";

describe("calculateReadinessScore", () => {
  it("returns the seeded Palawan readiness score before fixes", () => {
    const score = calculateReadinessScore(palawanDemoTrip.readinessItems);

    expect(score.overallScore).toBe(68);
    expect(score.categoryScores.transport).toBeLessThan(70);
    expect(score.categoryScores.bookings).toBeLessThan(80);
    expect(score.summary).toBe("68% ready. Fix 3 high-priority gaps before departure.");
  });

  it("raises the score when high-priority gaps are completed", () => {
    const fixedItems = palawanDemoTrip.readinessItems.map((item) =>
      item.priority === "high" || item.priority === "critical" ? { ...item, status: "done" as const } : item,
    );

    const score = calculateReadinessScore(fixedItems);

    expect(score.overallScore).toBe(84);
    expect(score.summary).toBe("84% ready. Core travel risks are reduced.");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
bun --filter native test apps/native/src/features/readiness/scoring.test.ts
```

Expected: FAIL because `palawanDemoTrip` and `calculateReadinessScore` do not exist.

- [ ] **Step 3: Create deterministic demo data**

Create `apps/native/src/data/palawan-demo.ts` with at least these exact entities:

```ts
import type { ViyaDemoTrip } from "@/src/types/viya";

export const palawanDemoTrip: ViyaDemoTrip = {
  preferences: {
    travelStyle: "balanced",
    pacePreference: "moderate",
    budgetPreference: "midRange",
    foodPreference: "Seafood, local cafes, relaxed dinners",
    accessibilityNeeds: "None",
    notificationPreference: "Important readiness and day-of travel alerts",
    preferredStartTime: "08:30",
    preferredRestLevel: "One slower block per day",
  },
  trip: {
    id: "demo-palawan",
    ownerId: "demo-user",
    title: "Palawan Escape",
    destination: "Palawan, Philippines",
    startDate: "2026-06-10",
    endDate: "2026-06-15",
    arrivalTime: "16:35",
    departureTime: "17:15",
    budgetAmount: 85000,
    budgetCurrency: "PHP",
    travelStyle: "balanced",
    pace: "moderate",
    groupType: "couple",
    status: "planning",
    readinessScore: 68,
    coverImageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
    summary: "A balanced scenic trip through Puerto Princesa and El Nido with beach time, food, and island hopping.",
    createdAt: "2026-05-23T00:00:00.000Z",
    updatedAt: "2026-05-23T00:00:00.000Z",
  },
  days: [
    {
      id: "day-1",
      tripId: "demo-palawan",
      date: "2026-06-10",
      dayNumber: 1,
      title: "Arrival and easy dinner",
      summary: "Land in Puerto Princesa, check in, and keep the evening light.",
      theme: "Arrival",
      estimatedCost: 4200,
      pace: "light",
      weatherNote: "Warm evening with possible light rain.",
    },
    {
      id: "day-2",
      tripId: "demo-palawan",
      date: "2026-06-11",
      dayNumber: 2,
      title: "Underground River and transfer planning",
      summary: "A packed nature day that needs tighter timing and transport confirmation.",
      theme: "Nature",
      estimatedCost: 12_500,
      pace: "packed",
      weatherNote: "Humid with afternoon rain risk.",
    },
    {
      id: "day-3",
      tripId: "demo-palawan",
      date: "2026-06-12",
      dayNumber: 3,
      title: "El Nido island hopping",
      summary: "Boat tour day with a weather-sensitive schedule.",
      theme: "Island hopping",
      estimatedCost: 16_000,
      pace: "balanced",
      weatherNote: "Rain risk could affect boat departures.",
    },
  ],
  items: [
    {
      id: "item-arrival-flight",
      tripId: "demo-palawan",
      dayId: "day-1",
      title: "Arrive at Puerto Princesa Airport",
      description: "Late-afternoon arrival leaves limited buffer for check-in and dinner.",
      category: "flight",
      locationName: "Puerto Princesa International Airport",
      address: "Puerto Princesa, Palawan",
      latitude: null,
      longitude: null,
      startTime: "16:35",
      endTime: "17:20",
      durationMinutes: 45,
      estimatedCost: 0,
      bookingId: null,
      priority: "required",
      status: "confirmed",
      aiReason: "Arrival timing affects transfer and dinner plans.",
    },
    {
      id: "item-underground-river",
      tripId: "demo-palawan",
      dayId: "day-2",
      title: "Underground River tour",
      description: "Reserve an early slot to reduce transfer pressure.",
      category: "activity",
      locationName: "Puerto Princesa Subterranean River National Park",
      address: "Sabang, Puerto Princesa",
      latitude: null,
      longitude: null,
      startTime: "07:30",
      endTime: "14:00",
      durationMinutes: 390,
      estimatedCost: 7000,
      bookingId: null,
      priority: "recommended",
      status: "planned",
      aiReason: "The day is full and should avoid late starts.",
    },
    {
      id: "item-island-hopping",
      tripId: "demo-palawan",
      dayId: "day-3",
      title: "El Nido island hopping",
      description: "Keep a backup indoor or cafe block if boat tours are delayed.",
      category: "activity",
      locationName: "El Nido",
      address: "El Nido, Palawan",
      latitude: null,
      longitude: null,
      startTime: "08:00",
      endTime: "15:30",
      durationMinutes: 450,
      estimatedCost: 10_500,
      bookingId: null,
      priority: "recommended",
      status: "planned",
      aiReason: "Weather can change the day-of plan.",
    },
  ],
  readinessItems: [
    {
      id: "ready-transfer",
      tripId: "demo-palawan",
      category: "transport",
      title: "Book airport transfer",
      description: "Late arrival makes pre-arranged pickup important.",
      status: "todo",
      priority: "high",
      dueDate: "2026-06-08",
      assignedToMemberId: null,
      aiReason: "No airport transfer is saved for a 4:35 PM arrival.",
      source: "ai",
    },
    {
      id: "ready-final-hotel",
      tripId: "demo-palawan",
      category: "bookings",
      title: "Confirm final night hotel",
      description: "The saved stay does not cover the full trip.",
      status: "blocked",
      priority: "critical",
      dueDate: "2026-06-07",
      assignedToMemberId: null,
      aiReason: "Hotel coverage appears incomplete for June 14.",
      source: "ai",
    },
    {
      id: "ready-rain-plan",
      tripId: "demo-palawan",
      category: "weather",
      title: "Add rain backup plan",
      description: "Day 3 boat activities need a weather fallback.",
      status: "todo",
      priority: "high",
      dueDate: "2026-06-10",
      assignedToMemberId: null,
      aiReason: "Rain risk may affect island hopping.",
      source: "ai",
    },
    {
      id: "ready-passport",
      tripId: "demo-palawan",
      category: "documents",
      title: "Check IDs and travel documents",
      description: "Keep valid IDs available for flights and hotel check-in.",
      status: "done",
      priority: "medium",
      dueDate: "2026-06-06",
      assignedToMemberId: null,
      aiReason: "Documents are a standard readiness requirement.",
      source: "system",
    },
  ],
  risks: [
    {
      id: "risk-final-hotel",
      tripId: "demo-palawan",
      type: "booking",
      severity: "critical",
      title: "Final night hotel is missing",
      message: "I do not see confirmed accommodation for the last night of the trip.",
      suggestedAction: "Confirm or add a hotel for June 14.",
      relatedEntityType: "readinessItem",
      relatedEntityId: "ready-final-hotel",
      status: "open",
      aiReason: "Trip ends June 15 but hotel coverage appears incomplete.",
      createdAt: "2026-05-23T00:00:00.000Z",
    },
    {
      id: "risk-rain",
      tripId: "demo-palawan",
      type: "weather",
      severity: "high",
      title: "Rain could disrupt island hopping",
      message: "Day 3 has weather risk and no backup plan saved.",
      suggestedAction: "Add a flexible indoor or cafe backup block.",
      relatedEntityType: "itineraryDay",
      relatedEntityId: "day-3",
      status: "open",
      aiReason: "Weather-sensitive boat activities need a fallback.",
      createdAt: "2026-05-23T00:00:00.000Z",
    },
  ],
  moments: [
    {
      id: "moment-sunset",
      tripId: "demo-palawan",
      dayId: "day-1",
      title: "First Palawan sunset",
      caption: "Soft skies, salt air, and the first quiet moment of the trip.",
      note: "Arrival day felt easy after check-in.",
      photoUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
      locationName: "Puerto Princesa Baywalk",
      isHighlight: true,
      createdAt: "2026-06-10T10:30:00.000Z",
    },
  ],
};
```

- [ ] **Step 4: Implement readiness scoring**

Create `apps/native/src/features/readiness/scoring.ts`:

```ts
import type { ReadinessCategory, ReadinessItem, ReadinessScore } from "@/src/types/viya";

const categories: ReadinessCategory[] = [
  "documents",
  "bookings",
  "packing",
  "budget",
  "schedule",
  "transport",
  "weather",
  "safety",
  "group",
  "backupPlan",
];

const priorityPenalty = {
  low: 6,
  medium: 10,
  high: 18,
  critical: 28,
} as const;

const incompleteStatuses = new Set(["todo", "inProgress", "blocked"]);

const getItemPenalty = (item: ReadinessItem): number => {
  if (!incompleteStatuses.has(item.status)) {
    return 0;
  }

  return priorityPenalty[item.priority];
};

const summarizeScore = (overallScore: number, highPriorityGapCount: number): string => {
  if (overallScore >= 90) {
    return `${overallScore}% ready. Final checks are in good shape.`;
  }

  if (overallScore >= 80) {
    return `${overallScore}% ready. Core travel risks are reduced.`;
  }

  return `${overallScore}% ready. Fix ${highPriorityGapCount} high-priority gaps before departure.`;
};

export const calculateReadinessScore = (items: ReadinessItem[]): ReadinessScore => {
  const categoryScores = Object.fromEntries(
    categories.map((category) => {
      const categoryItems = items.filter((item) => item.category === category);
      const penalty = categoryItems.reduce((total, item) => total + getItemPenalty(item), 0);
      const score = categoryItems.length === 0 ? 100 : Math.max(0, 100 - penalty);

      return [category, score];
    }),
  ) as Record<ReadinessCategory, number>;

  const activePenalties = items.reduce((total, item) => total + getItemPenalty(item), 0);
  const overallScore = Math.max(0, Math.min(100, 100 - activePenalties));
  const highPriorityGapCount = items.filter(
    (item) =>
      incompleteStatuses.has(item.status) && (item.priority === "high" || item.priority === "critical"),
  ).length;

  return {
    tripId: items[0]?.tripId ?? "unknown",
    overallScore,
    categoryScores,
    summary: summarizeScore(overallScore, highPriorityGapCount),
    updatedAt: new Date().toISOString(),
  };
};
```

- [ ] **Step 5: Run readiness tests**

Run:

```bash
bun --filter native test apps/native/src/features/readiness/scoring.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run static checks**

Run:

```bash
bun check
bun --filter native exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/native/src/data/palawan-demo.ts apps/native/src/features/readiness/scoring.ts apps/native/src/features/readiness/scoring.test.ts
git commit -m "feat: Add Palawan demo readiness model"
```

---

## Task 4: Add Dashboard Selectors For The Demo Trip

**Files:**
- Create: `apps/native/src/features/trips/selectors.ts`
- Create: `apps/native/src/features/trips/selectors.test.ts`

- [ ] **Step 1: Write selector tests**

Create `apps/native/src/features/trips/selectors.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { palawanDemoTrip } from "@/src/data/palawan-demo";
import {
  getCriticalOpenRisks,
  getNextBestAction,
  getUpcomingItineraryItems,
} from "@/src/features/trips/selectors";

describe("trip dashboard selectors", () => {
  it("uses the highest severity open risk as the next best action", () => {
    const action = getNextBestAction(palawanDemoTrip);

    expect(action.label).toBe("Confirm final night hotel");
    expect(action.reason).toBe("I do not see confirmed accommodation for the last night of the trip.");
    expect(action.href).toBe("/(drawer)/trips/demo-palawan/readiness");
  });

  it("returns critical open risks first", () => {
    const risks = getCriticalOpenRisks(palawanDemoTrip.risks);

    expect(risks.map((risk) => risk.id)).toEqual(["risk-final-hotel"]);
  });

  it("returns upcoming itinerary items in day order", () => {
    const items = getUpcomingItineraryItems(palawanDemoTrip, 2);

    expect(items.map((item) => item.id)).toEqual(["item-arrival-flight", "item-underground-river"]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
bun --filter native test apps/native/src/features/trips/selectors.test.ts
```

Expected: FAIL because the selectors do not exist.

- [ ] **Step 3: Implement selectors**

Create `apps/native/src/features/trips/selectors.ts`:

```ts
import { VIYA_ROUTES } from "@/src/constants/viya";
import type { ItineraryItem, Risk, ViyaDemoTrip } from "@/src/types/viya";

const severityRank = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
} as const;

export type NextBestAction = {
  label: string;
  reason: string;
  href: string;
};

export const getCriticalOpenRisks = (risks: Risk[]): Risk[] =>
  risks
    .filter((risk) => risk.status === "open" && risk.severity === "critical")
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

export const getUpcomingItineraryItems = (
  demoTrip: ViyaDemoTrip,
  limit: number,
): ItineraryItem[] => {
  const dayOrder = new Map(demoTrip.days.map((day) => [day.id, day.dayNumber]));

  return [...demoTrip.items]
    .sort((a, b) => {
      const dayDelta = (dayOrder.get(a.dayId) ?? 0) - (dayOrder.get(b.dayId) ?? 0);

      if (dayDelta !== 0) {
        return dayDelta;
      }

      return a.startTime.localeCompare(b.startTime);
    })
    .slice(0, limit);
};

export const getNextBestAction = (demoTrip: ViyaDemoTrip): NextBestAction => {
  const openRisk = [...demoTrip.risks]
    .filter((risk) => risk.status === "open")
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity])[0];

  if (openRisk?.relatedEntityId === "ready-final-hotel") {
    return {
      label: "Confirm final night hotel",
      reason: openRisk.message,
      href: VIYA_ROUTES.tripReadiness,
    };
  }

  const incompleteReadinessItem = demoTrip.readinessItems.find((item) => item.status !== "done");

  if (incompleteReadinessItem) {
    return {
      label: incompleteReadinessItem.title,
      reason: incompleteReadinessItem.aiReason,
      href: VIYA_ROUTES.tripReadiness,
    };
  }

  return {
    label: "Open Travel Mode",
    reason: "Your core planning items are ready. Use Travel Mode for the current day.",
    href: VIYA_ROUTES.tripTravelMode,
  };
};
```

- [ ] **Step 4: Run selector tests**

Run:

```bash
bun --filter native test apps/native/src/features/trips/selectors.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/native/src/features/trips/selectors.ts apps/native/src/features/trips/selectors.test.ts
git commit -m "feat: Add trip dashboard selectors"
```

---

## Task 5: Replace Starter Tabs With Viya Main Navigation

**Files:**
- Modify: `apps/native/app/(drawer)/(tabs)/_layout.tsx`
- Modify: `apps/native/app/(drawer)/_layout.tsx`
- Create: `apps/native/app/(drawer)/(tabs)/trips.tsx`
- Create: `apps/native/app/(drawer)/(tabs)/viya.tsx`
- Create: `apps/native/app/(drawer)/(tabs)/moments.tsx`
- Create: `apps/native/app/(drawer)/(tabs)/profile.tsx`
- Create: `apps/native/src/features/viya/ViyaChatScreen.tsx`
- Modify: `apps/native/app/(drawer)/ai.tsx`
- Delete: `apps/native/app/(drawer)/(tabs)/two.tsx`

- [ ] **Step 1: Update tab layout**

Replace `apps/native/app/(drawer)/(tabs)/_layout.tsx` with:

```tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";

export default function TabLayout() {
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: themeColorBackground },
        headerTintColor: themeColorForeground,
        headerTitleStyle: {
          color: themeColorForeground,
          fontWeight: "600",
        },
        tabBarStyle: { backgroundColor: themeColorBackground },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Trips",
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="viya"
        options={{
          title: "Viya",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="moments"
        options={{
          title: "Moments",
          tabBarIcon: ({ color, size }) => <Ionicons name="images-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Update drawer labels**

Modify `apps/native/app/(drawer)/_layout.tsx` so the drawer exposes:

```tsx
<Drawer.Screen
  name="(tabs)"
  options={{
    headerTitle: "Viya",
    drawerLabel: ({ color, focused }) => (
      <Text style={{ color: focused ? color : themeColorForeground }}>Viya</Text>
    ),
    drawerIcon: ({ size, color, focused }) => (
      <Ionicons name="compass-outline" size={size} color={focused ? color : themeColorForeground} />
    ),
  }}
/>
```

Keep the existing auth and theme behavior intact.

- [ ] **Step 3: Create route stubs with real demo data**

Each new tab file should import `Container`, `palawanDemoTrip`, and HeroUI Native primitives. Use concise screen titles and one primary action.

Create `apps/native/app/(drawer)/(tabs)/trips.tsx`:

```tsx
import { Link } from "expo-router";
import { Button, Card, Chip } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { VIYA_ROUTES } from "@/src/constants/viya";
import { palawanDemoTrip } from "@/src/data/palawan-demo";

export default function TripsScreen() {
  const { trip } = palawanDemoTrip;

  return (
    <Container className="px-4 py-6">
      <Text className="text-3xl font-semibold text-foreground">Trips</Text>
      <Text className="mt-1 text-sm text-muted">Upcoming, active, and completed trips.</Text>

      <Card variant="secondary" className="mt-6 p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Card.Title>{trip.title}</Card.Title>
            <Text className="mt-1 text-sm text-muted">{trip.destination}</Text>
          </View>
          <Chip color="primary" size="sm">
            <Chip.Label>{trip.readinessScore}% ready</Chip.Label>
          </Chip>
        </View>
        <Link href={VIYA_ROUTES.tripDashboard} asChild>
          <Button className="mt-4">
            <Button.Label>Open trip hub</Button.Label>
          </Button>
        </Link>
      </Card>
    </Container>
  );
}
```

- [ ] **Step 4: Move the AI entry into the Viya tab**

Create `apps/native/src/features/viya/ViyaChatScreen.tsx`:

```tsx
import { useSmoothText, useUIMessages } from "@convex-dev/agent/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import {
  Button,
  Input,
  Separator,
  Spinner,
  Surface,
  TextField,
  useThemeColor,
} from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { Container } from "@/components/container";

function MessageContent({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const [visibleText] = useSmoothText(text, {
    startStreaming: isStreaming,
  });

  return <Text className="text-sm leading-relaxed text-foreground">{visibleText}</Text>;
}

export function ViyaChatScreen() {
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const mutedColor = useThemeColor("muted");
  const foregroundColor = useThemeColor("foreground");

  const createThread = useMutation(api.chat.createNewThread);
  const sendMessage = useMutation(api.chat.sendMessage);

  const { results: messages } = useUIMessages(
    api.chat.listMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 50, stream: true },
  );

  const hasStreamingMessage = messages?.some((message) => message.status === "streaming");

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const onSubmit = async () => {
    const value = input.trim();

    if (!value || isLoading) {
      return;
    }

    setIsLoading(true);
    setInput("");
    setErrorMessage(null);

    try {
      let currentThreadId = threadId;

      if (!currentThreadId) {
        currentThreadId = await createThread();
        setThreadId(currentThreadId);
      }

      await sendMessage({ threadId: currentThreadId, prompt: value });
    } catch {
      setErrorMessage("Viya could not send that message. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container isScrollable={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-4 py-4">
          <View className="mb-4 py-4">
            <Text className="text-2xl font-semibold text-foreground">Ask Viya</Text>
            <Text className="mt-1 text-sm text-muted">Get concise help for the next travel decision.</Text>
          </View>

          <ScrollView
            ref={scrollViewRef}
            className="mb-4 flex-1"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!messages || messages.length === 0 ? (
              <Surface
                variant="secondary"
                className="flex-1 items-center justify-center rounded-xl py-8"
              >
                <Ionicons name="sparkles-outline" size={32} color={mutedColor} />
                <Text className="mt-3 text-sm text-muted">Ask Viya what to do next.</Text>
              </Surface>
            ) : (
              <View className="gap-3">
                {messages.map((message) => (
                  <Surface
                    key={message.key}
                    variant={message.role === "user" ? "tertiary" : "secondary"}
                    className={`rounded-xl p-3 ${message.role === "user" ? "ml-8" : "mr-8"}`}
                  >
                    <Text className="mb-1 text-xs font-medium text-muted">
                      {message.role === "user" ? "You" : "Viya"}
                    </Text>
                    <MessageContent
                      isStreaming={message.status === "streaming"}
                      text={(message.parts ?? [])
                        .map((part) => (part.type === "text" ? part.text : ""))
                        .join("")}
                    />
                  </Surface>
                ))}
                {isLoading && !hasStreamingMessage && (
                  <Surface variant="secondary" className="mr-10 rounded-lg p-3">
                    <Text className="mb-1 text-xs font-medium text-muted">Viya</Text>
                    <View className="flex-row items-center gap-2">
                      <Spinner size="sm" />
                      <Text className="text-sm text-muted">Checking your trip context...</Text>
                    </View>
                  </Surface>
                )}
              </View>
            )}
          </ScrollView>

          {errorMessage ? (
            <Text className="mb-3 text-sm text-danger">{errorMessage}</Text>
          ) : null}

          <Separator className="mb-3" />

          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <TextField>
                <Input
                  editable={!isLoading}
                  onChangeText={setInput}
                  onSubmitEditing={onSubmit}
                  placeholder="Ask about readiness, risks, or today's plan..."
                  returnKeyType="send"
                  value={input}
                />
              </TextField>
            </View>
            <Button
              isDisabled={!input.trim() || isLoading}
              isIconOnly
              onPress={onSubmit}
              size="sm"
              variant={input.trim() && !isLoading ? "primary" : "secondary"}
            >
              <Ionicons
                color={input.trim() && !isLoading ? foregroundColor : mutedColor}
                name="arrow-up"
                size={18}
              />
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
}
```

Create `apps/native/app/(drawer)/(tabs)/viya.tsx`:

```tsx
import { ViyaChatScreen } from "@/src/features/viya/ViyaChatScreen";

export default ViyaChatScreen;
```

Replace `apps/native/app/(drawer)/ai.tsx` with:

```tsx
import { ViyaChatScreen } from "@/src/features/viya/ViyaChatScreen";

export default ViyaChatScreen;
```

Expected: The AI tab and drawer AI route both render the same Viya-branded chat screen.

- [ ] **Step 5: Remove the starter tab**

Delete `apps/native/app/(drawer)/(tabs)/two.tsx`.

- [ ] **Step 6: Verify navigation compiles**

Run:

```bash
bun --filter native exec tsc --noEmit
bun check
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/native/app
git commit -m "feat: Add Viya main navigation"
```

---

## Task 6: Build The Home Screen And Trip Dashboard Slice

**Files:**
- Modify: `apps/native/app/(drawer)/(tabs)/index.tsx`
- Create: `apps/native/app/(drawer)/trips/[tripId]/index.tsx`
- Create: `apps/native/src/components/trip/TripHeader.tsx`
- Create: `apps/native/src/components/trip/NextBestActionCard.tsx`
- Create: `apps/native/src/components/readiness/ReadinessScoreCard.tsx`
- Create: `apps/native/src/components/risk/RiskAlertCard.tsx`
- Create: `apps/native/src/components/itinerary/ItineraryPreview.tsx`

- [ ] **Step 1: Create trip header component**

Create `apps/native/src/components/trip/TripHeader.tsx`:

```tsx
import { Chip } from "heroui-native";
import { Text, View } from "react-native";

import { TRIP_STATUS_LABELS } from "@/src/constants/viya";
import type { Trip } from "@/src/types/viya";

type Props = {
  trip: Trip;
};

export function TripHeader({ trip }: Props) {
  return (
    <View>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-3xl font-semibold text-foreground">{trip.title}</Text>
          <Text className="mt-1 text-sm text-muted">{trip.destination}</Text>
        </View>
        <Chip color="primary" size="sm">
          <Chip.Label>{TRIP_STATUS_LABELS[trip.status]}</Chip.Label>
        </Chip>
      </View>
      <Text className="mt-3 text-sm leading-5 text-muted">{trip.summary}</Text>
    </View>
  );
}
```

- [ ] **Step 2: Create dashboard cards**

Create the remaining components with these props:

```ts
// apps/native/src/components/trip/NextBestActionCard.tsx
import type { NextBestAction } from "@/src/features/trips/selectors";

type Props = {
  action: NextBestAction;
};
```

```ts
// apps/native/src/components/readiness/ReadinessScoreCard.tsx
import type { ReadinessScore } from "@/src/types/viya";

type Props = {
  score: ReadinessScore;
};
```

```ts
// apps/native/src/components/risk/RiskAlertCard.tsx
import type { Risk } from "@/src/types/viya";

type Props = {
  risk: Risk;
};
```

```ts
// apps/native/src/components/itinerary/ItineraryPreview.tsx
import type { ItineraryItem } from "@/src/types/viya";

type Props = {
  items: ItineraryItem[];
};
```

Each component must use HeroUI Native `Card`, `Button`, or `Chip` where appropriate and must include readable empty text when its data array is empty.

- [ ] **Step 3: Replace Home screen**

Modify `apps/native/app/(drawer)/(tabs)/index.tsx` so it:

- Shows `Viya` as the first-viewport product signal.
- Links to `VIYA_ROUTES.tripDashboard`.
- Shows the demo trip readiness score.
- Shows one next action.
- Avoids Better T Stack starter copy.

- [ ] **Step 4: Create trip dashboard route**

Create `apps/native/app/(drawer)/trips/[tripId]/index.tsx`:

```tsx
import { Link, useLocalSearchParams } from "expo-router";
import { Button, Separator } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { ItineraryPreview } from "@/src/components/itinerary/ItineraryPreview";
import { ReadinessScoreCard } from "@/src/components/readiness/ReadinessScoreCard";
import { RiskAlertCard } from "@/src/components/risk/RiskAlertCard";
import { NextBestActionCard } from "@/src/components/trip/NextBestActionCard";
import { TripHeader } from "@/src/components/trip/TripHeader";
import { VIYA_ROUTES } from "@/src/constants/viya";
import { palawanDemoTrip } from "@/src/data/palawan-demo";
import { calculateReadinessScore } from "@/src/features/readiness/scoring";
import {
  getCriticalOpenRisks,
  getNextBestAction,
  getUpcomingItineraryItems,
} from "@/src/features/trips/selectors";

export default function TripDashboardScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const score = calculateReadinessScore(palawanDemoTrip.readinessItems);
  const action = getNextBestAction(palawanDemoTrip);
  const risks = getCriticalOpenRisks(palawanDemoTrip.risks);
  const upcomingItems = getUpcomingItineraryItems(palawanDemoTrip, 3);

  if (tripId !== palawanDemoTrip.trip.id) {
    return (
      <Container className="px-4 py-6">
        <Text className="text-2xl font-semibold text-foreground">Trip not found</Text>
        <Text className="mt-2 text-sm text-muted">Open the Palawan demo trip to continue.</Text>
        <Link href={VIYA_ROUTES.trips} asChild>
          <Button className="mt-5">
            <Button.Label>Back to trips</Button.Label>
          </Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container className="px-4 py-6">
      <TripHeader trip={palawanDemoTrip.trip} />
      <View className="mt-6 gap-4">
        <ReadinessScoreCard score={score} />
        <NextBestActionCard action={action} />
        <ItineraryPreview items={upcomingItems} />
        {risks.map((risk) => (
          <RiskAlertCard key={risk.id} risk={risk} />
        ))}
      </View>
      <Separator className="my-6" />
      <View className="gap-3">
        <Link href={VIYA_ROUTES.tripTravelMode} asChild>
          <Button>
            <Button.Label>Open Travel Mode</Button.Label>
          </Button>
        </Link>
        <Link href={VIYA_ROUTES.tripReadiness} asChild>
          <Button variant="secondary">
            <Button.Label>Fix My Readiness</Button.Label>
          </Button>
        </Link>
      </View>
    </Container>
  );
}
```

- [ ] **Step 5: Verify dashboard route**

Run:

```bash
bun --filter native exec tsc --noEmit
bun check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/native/app apps/native/src/components
git commit -m "feat: Add Viya trip dashboard"
```

---

## Task 7: Add First Trip Detail Screens

**Files:**
- Create: `apps/native/app/(drawer)/trips/[tripId]/itinerary.tsx`
- Create: `apps/native/app/(drawer)/trips/[tripId]/readiness.tsx`
- Create: `apps/native/app/(drawer)/trips/[tripId]/risks.tsx`
- Create: `apps/native/app/(drawer)/trips/[tripId]/travel-mode.tsx`
- Create: `apps/native/app/(drawer)/trips/[tripId]/moments.tsx`
- Create: `apps/native/app/(drawer)/trips/[tripId]/wrapped.tsx`

- [ ] **Step 1: Build itinerary screen**

Create `apps/native/app/(drawer)/trips/[tripId]/itinerary.tsx` with:

- Screen title: `Itinerary`
- Day sections from `palawanDemoTrip.days`
- Items grouped by `dayId`
- Primary action button label: `Replan day`

- [ ] **Step 2: Build readiness screen**

Create `apps/native/app/(drawer)/trips/[tripId]/readiness.tsx` with:

- Overall readiness score from `calculateReadinessScore`
- Category rows using `READINESS_CATEGORY_LABELS`
- Readiness item cards from `palawanDemoTrip.readinessItems`
- Primary action button label: `Fix My Readiness`

- [ ] **Step 3: Build Risk Radar screen**

Create `apps/native/app/(drawer)/trips/[tripId]/risks.tsx` with:

- Screen title: `Risk Radar`
- Critical and high risks shown first
- Suggested action text visible on each risk
- Secondary action button label: `Mark mitigated`

- [ ] **Step 4: Build Travel Mode screen**

Create `apps/native/app/(drawer)/trips/[tripId]/travel-mode.tsx` with:

- Current day set to `palawanDemoTrip.days[0]`
- Now card set to `item-arrival-flight`
- Next activity card set to `item-underground-river`
- Quick action buttons: `Replan Today`, `Show bookings`, `Ask Viya`

- [ ] **Step 5: Build Moments screen**

Create `apps/native/app/(drawer)/trips/[tripId]/moments.tsx` with:

- Moment cards from `palawanDemoTrip.moments`
- Primary action button label: `Add moment`
- Caption text visible for each moment

- [ ] **Step 6: Build Wrapped screen**

Create `apps/native/app/(drawer)/trips/[tripId]/wrapped.tsx` with:

- Trip title and summary
- Stats: days, planned activities, readiness score, moments count
- Best moment from `palawanDemoTrip.moments.find((moment) => moment.isHighlight)`
- Next trip suggestion: `Plan a slower beach-focused return to Palawan`

- [ ] **Step 7: Verify route screens**

Run:

```bash
bun --filter native exec tsc --noEmit
bun check
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add 'apps/native/app/(drawer)/trips'
git commit -m "feat: Add trip detail screens"
```

---

## Task 8: Mirror MVP Entities Into Convex

**Files:**
- Modify: `packages/backend/convex/schema.ts`
- Create: `packages/backend/convex/trips.ts`
- Create: `packages/backend/convex/readiness.ts`
- Create: `packages/backend/convex/risks.ts`

- [ ] **Step 1: Add MVP schema tables**

Modify `packages/backend/convex/schema.ts`:

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  trips: defineTable({
    ownerId: v.string(),
    title: v.string(),
    destination: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    arrivalTime: v.optional(v.string()),
    departureTime: v.optional(v.string()),
    budgetAmount: v.optional(v.number()),
    budgetCurrency: v.optional(v.string()),
    travelStyle: v.string(),
    pace: v.string(),
    groupType: v.string(),
    status: v.string(),
    readinessScore: v.number(),
    coverImageUrl: v.optional(v.string()),
    summary: v.string(),
    isDemo: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),
  itineraryDays: defineTable({
    tripId: v.id("trips"),
    date: v.string(),
    dayNumber: v.number(),
    title: v.string(),
    summary: v.string(),
    theme: v.string(),
    estimatedCost: v.number(),
    pace: v.string(),
    weatherNote: v.string(),
  }).index("by_trip", ["tripId"]),
  itineraryItems: defineTable({
    tripId: v.id("trips"),
    dayId: v.id("itineraryDays"),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    locationName: v.string(),
    address: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    startTime: v.string(),
    endTime: v.string(),
    durationMinutes: v.number(),
    estimatedCost: v.number(),
    bookingId: v.optional(v.string()),
    priority: v.string(),
    status: v.string(),
    aiReason: v.string(),
  }).index("by_trip", ["tripId"]),
  readinessItems: defineTable({
    tripId: v.id("trips"),
    category: v.string(),
    title: v.string(),
    description: v.string(),
    status: v.string(),
    priority: v.string(),
    dueDate: v.string(),
    assignedToMemberId: v.optional(v.string()),
    aiReason: v.string(),
    source: v.string(),
  }).index("by_trip", ["tripId"]),
  risks: defineTable({
    tripId: v.id("trips"),
    type: v.string(),
    severity: v.string(),
    title: v.string(),
    message: v.string(),
    suggestedAction: v.string(),
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
    status: v.string(),
    aiReason: v.string(),
    createdAt: v.number(),
  }).index("by_trip", ["tripId"]),
  moments: defineTable({
    tripId: v.id("trips"),
    dayId: v.optional(v.string()),
    title: v.string(),
    caption: v.string(),
    note: v.string(),
    photoUrl: v.optional(v.string()),
    locationName: v.string(),
    isHighlight: v.boolean(),
    createdAt: v.number(),
  }).index("by_trip", ["tripId"]),
});
```

- [ ] **Step 2: Add trip functions**

Create `packages/backend/convex/trips.ts` with:

```ts
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const listTrips = query({
  args: {},
  handler: async (ctx) => ctx.db.query("trips").collect(),
});

export const getTripById = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => ctx.db.get(args.tripId),
});

export const createTrip = mutation({
  args: {
    title: v.optional(v.string()),
    destination: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    arrivalTime: v.optional(v.string()),
    departureTime: v.optional(v.string()),
    budgetAmount: v.optional(v.number()),
    budgetCurrency: v.optional(v.string()),
    travelStyle: v.optional(v.string()),
    groupType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const tripId = await ctx.db.insert("trips", {
      ownerId: "current-user",
      title: args.title ?? `${args.destination} Trip`,
      destination: args.destination,
      startDate: args.startDate,
      endDate: args.endDate,
      arrivalTime: args.arrivalTime,
      departureTime: args.departureTime,
      budgetAmount: args.budgetAmount,
      budgetCurrency: args.budgetCurrency ?? "PHP",
      travelStyle: args.travelStyle ?? "balanced",
      pace: "moderate",
      groupType: args.groupType ?? "solo",
      status: "draft",
      readinessScore: 0,
      summary: "Trip draft created from Viya onboarding.",
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    });

    return { tripId };
  },
});
```

- [ ] **Step 3: Add readiness and risk functions**

Create `packages/backend/convex/readiness.ts`:

```ts
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const readinessPenaltyByPriority = {
  low: 6,
  medium: 10,
  high: 18,
  critical: 28,
} as const;

const incompleteStatuses = new Set(["todo", "inProgress", "blocked"]);

const getReadinessPenalty = (status: string, priority: string): number => {
  if (!incompleteStatuses.has(status)) {
    return 0;
  }

  if (
    priority === "low" ||
    priority === "medium" ||
    priority === "high" ||
    priority === "critical"
  ) {
    return readinessPenaltyByPriority[priority];
  }

  return readinessPenaltyByPriority.medium;
};

export const listReadinessItems = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) =>
    ctx.db
      .query("readinessItems")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect(),
});

export const updateReadinessItem = mutation({
  args: {
    readinessItemId: v.id("readinessItems"),
    status: v.union(
      v.literal("todo"),
      v.literal("inProgress"),
      v.literal("done"),
      v.literal("blocked"),
      v.literal("ignored"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.readinessItemId, {
      status: args.status,
    });

    return ctx.db.get(args.readinessItemId);
  },
});

export const recalculateReadinessScore = mutation({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("readinessItems")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
    const totalPenalty = items.reduce(
      (total, item) => total + getReadinessPenalty(item.status, item.priority),
      0,
    );
    const readinessScore = Math.max(0, Math.min(100, 100 - totalPenalty));

    await ctx.db.patch(args.tripId, {
      readinessScore,
      updatedAt: Date.now(),
    });

    return {
      tripId: args.tripId,
      readinessScore,
    };
  },
});
```

Create `packages/backend/convex/risks.ts`:

```ts
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const listRisks = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) =>
    ctx.db
      .query("risks")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect(),
});

export const dismissRisk = mutation({
  args: {
    riskId: v.id("risks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.riskId, {
      status: "dismissed",
    });

    return ctx.db.get(args.riskId);
  },
});

export const mitigateRisk = mutation({
  args: {
    riskId: v.id("risks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.riskId, {
      status: "mitigated",
    });

    return ctx.db.get(args.riskId);
  },
});
```

- [ ] **Step 4: Verify Convex type generation**

Run:

```bash
bun dev:server
```

Expected: Convex dev starts, schema is accepted, and generated API types include `trips`, `readiness`, and `risks`.

Stop the server after generation succeeds.

- [ ] **Step 5: Verify static checks**

Run:

```bash
bun check
bun --filter native exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/convex/schema.ts packages/backend/convex/trips.ts packages/backend/convex/readiness.ts packages/backend/convex/risks.ts
git commit -m "feat: Add Viya Convex MVP schema"
```

---

## Task 9: First Manual Product Verification

**Files:**
- No source file changes expected.

- [ ] **Step 1: Start the native app**

Run:

```bash
bun dev:native
```

Expected: Expo starts and shows a local QR code or web target.

- [ ] **Step 2: Verify the demo path**

Open the native app and verify:

- Home screen says `Viya`.
- Home screen has `Plan your first trip` and `Explore demo trip` actions.
- `Explore demo trip` opens `/trips/demo-palawan`.
- Trip dashboard shows `Palawan Escape`.
- Readiness score shows `68%`.
- Next best action is `Confirm final night hotel`.
- Risk preview includes `Final night hotel is missing`.
- `Open Travel Mode` opens the Travel Mode screen.
- `Fix My Readiness` opens the Readiness screen.

- [ ] **Step 3: Verify quality checks**

Run:

```bash
bun check
bun --filter native exec tsc --noEmit
bun --filter native test
```

Expected: PASS.

- [ ] **Step 4: Commit verification polish if needed**

If verification finds text overflow, route errors, or failing checks, fix only those issues and commit:

```bash
git add apps/native packages/backend
git commit -m "fix: Polish Viya demo foundation"
```

---

## Execution Checkpoint

After these tasks, Viya has the first product-bearing vertical slice:

- Mobile app shell uses Viya tabs instead of starter screens.
- Palawan demo trip is typed and deterministic.
- Trip dashboard proves the core positioning: plan, readiness, next action, and risks.
- Readiness score is calculated by tested pure logic.
- Convex has the first persistent model aligned with the product data model.
- The implementation is ready for the next plan: AI itinerary generation, structured AI schemas, and deterministic AI fallback responses.

## Self-Review

- Spec coverage: This plan covers MVP phases 1, 2, and the foundation for phases 3 through 9. It intentionally stops before live AI generation so the first implementation slice remains reliable and demoable.
- Placeholder scan: The plan contains concrete files, commands, and expected outcomes. Remaining spread syntax and React `placeholder` props are valid code, not missing implementation markers.
- Type consistency: The same entity names are used across domain types, demo data, selectors, screen routes, and Convex table names.
