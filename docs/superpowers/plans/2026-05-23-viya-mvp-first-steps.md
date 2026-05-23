# Viya MVP First Steps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first executable Viya product slice: domain model, Palawan demo data, AI provider foundation, authenticated navigation, Viya Vault storage, trip dashboard, readiness scoring, and a reliable foundation for itinerary, risks, travel mode, moments, and wrapped.

**Architecture:** Keep the current Bun monorepo, Expo Router native app, HeroUI Native UI system, Clerk provider, Convex backend, and AI SDK. Put portable product types, constants, schemas, deterministic demo data, and pure decision logic in `packages/domain` so native and backend share one model; keep UI routing/presentation in native and Convex table definitions in backend. Put all model/provider selection behind a backend AI service boundary so OpenRouter, Google, or future AI SDK-compatible providers can be swapped without rewriting Viya features.

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

## Duplication Boundaries

These must be shared through `@viya-app/domain`:

- Domain entity types: trip, itinerary, readiness, risks, moments, wrapped.
- Domain constants: enum-like arrays, score weights, status labels, category labels, severity rank.
- Pure business logic: readiness scoring, dashboard next-best-action selection, upcoming itinerary selection, risk sorting.
- Deterministic demo data: Palawan seed used by native UI and backend seed/import flows.
- Zod schemas: AI structured outputs, onboarding payloads, and Convex input/output DTOs where they are not Convex-specific.

These must stay native-only:

- Expo Router paths and route params.
- HeroUI Native components, chips, colors, icons, layout, empty/error/loading presentation.
- Screen-specific copy placement and button composition.

These must stay backend-only:

- Convex `defineSchema`, `defineTable`, indexes, generated `Id<"table">` document types, auth/user resolution, mutations, queries, and actions.
- Convex validators using `v.*`; these duplicate schema shape at the framework boundary by necessity, but should import domain constants and pure helpers when possible.

AI provider rule:

- The backend uses Vercel AI SDK as the single AI abstraction.
- OpenRouter is the preferred provider for production flexibility, with Google retained as a fallback because the repo already has `@ai-sdk/google`.
- Native must never call provider APIs directly or hold AI provider keys.
- Streaming chat uses `@convex-dev/agent` and `streamText` through the backend.
- Structured product features use AI SDK `generateObject` / `streamObject` with shared Zod schemas from `@viya-app/domain`.
- Critical demo paths must have deterministic fallback responses so the product remains demoable without a live AI provider.

Storage and Vault rule:

- Convex Storage is the source of truth for uploaded files.
- Viya Vault owns file metadata, trip links, document status, booking attachments, and moment media references.
- Native uploads must request a Convex upload URL, POST the local file/blob to that URL, then save metadata through an authenticated mutation.
- Vault mutations must verify Clerk auth and trip ownership before saving, listing, serving, or deleting files.
- AI extraction may read Vault metadata and uploaded file URLs from backend actions only; native never sends provider keys or raw provider requests.

Auth ownership rule:

- Clerk is the identity provider and route gate in native.
- Convex is the source of truth for app user profile rows and trip ownership.
- Native may read Clerk session/user state for UI, but trip queries and mutations must enforce ownership from `ctx.auth.getUserIdentity()` on the backend.

## File Structure For This First Slice

- Create `packages/domain/package.json`: internal shared domain package.
- Create `packages/domain/tsconfig.json`: strict TypeScript config for portable domain code.
- Create `packages/domain/src/index.ts`: public exports for native and backend.
- Create `packages/domain/src/types.ts`: product domain types used by demo data, screens, backend functions, and pure utilities.
- Create `packages/domain/src/constants.ts`: shared labels, category arrays, score weights, and severity rank.
- Create `packages/domain/src/demo/palawan.ts`: deterministic Palawan trip seed matching the AI context.
- Create `packages/domain/src/readiness.ts`: pure readiness score calculation.
- Create `packages/domain/src/readiness.test.ts`: tests for the readiness score math and status transitions.
- Create `packages/domain/src/dashboard.ts`: pure dashboard selectors for next action, today plan, critical risks, and trip stats.
- Create `packages/domain/src/dashboard.test.ts`: tests for dashboard selectors against the Palawan demo trip.
- Create `packages/domain/src/schemas/itinerary.ts`: shared Zod schema for itinerary AI output.
- Create `packages/domain/src/schemas/readiness.ts`: shared Zod schema for readiness AI output and fix suggestions.
- Create `packages/domain/src/schemas/risks.ts`: shared Zod schema for Risk Radar AI output.
- Create `packages/domain/src/schemas/vault.ts`: shared Zod schema for booking/document extraction from Vault files.
- Create `packages/domain/src/schemas/wrapped.ts`: shared Zod schema for Wrapped AI output.
- Create `apps/native/src/constants/routes.ts`: Expo Router paths only.
- Create `apps/native/src/features/auth/auth-routing.ts`: Clerk decorated URL navigation helper.
- Create `apps/native/src/features/auth/AuthScreenShell.tsx`: Viya-branded auth layout using HeroUI Native.
- Modify `apps/native/app/(auth)/_layout.tsx`: redirect signed-in users and hide auth headers.
- Modify `apps/native/app/(auth)/sign-in.tsx`: Clerk sign-in flow using Viya design-system primitives.
- Modify `apps/native/app/(auth)/sign-up.tsx`: Clerk sign-up and email verification flow using Viya design-system primitives.
- Modify `apps/native/app/(drawer)/_layout.tsx`: protect app routes behind Clerk auth.
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
- Create `packages/backend/convex/ai/provider.ts`: provider-agnostic AI SDK model factory for OpenRouter and fallback providers.
- Create `packages/backend/convex/ai/prompts.ts`: Viya system prompts and task-specific prompt builders.
- Create `packages/backend/convex/ai/fallbacks.ts`: deterministic demo fallback outputs.
- Create `packages/backend/convex/ai/structured.ts`: typed `generateObject` / `streamObject` helpers.
- Create `packages/backend/convex/ai/features.ts`: AI actions for itinerary, readiness, risks, and wrapped drafts.
- Modify `packages/backend/convex/agent.ts`: use the shared AI model factory and Viya assistant instructions.
- Modify `packages/backend/convex/chat.ts`: keep streaming chat and add auth-aware thread creation.
- Create `packages/backend/convex/vault.ts`: authenticated Convex Storage upload, metadata, URL, delete, and trip-linked list functions.
- Create `apps/native/src/features/vault/useVaultUpload.ts`: native upload hook for documents and moment media.
- Create `apps/native/src/features/vault/VaultPreviewCard.tsx`: reusable Vault file preview card.
- Create `apps/native/app/(drawer)/trips/[tripId]/vault.tsx`: Viya Vault screen for trip files, bookings, documents, and uploads.
- Create `packages/backend/convex/lib/auth.ts`: shared Convex auth helpers for identity and user profile sync.
- Create `packages/backend/convex/users.ts`: authenticated user lookup and create-or-update profile sync from Clerk identity.
- Create `packages/backend/convex/trips.ts`: create, list, and get trip operations.
- Create `packages/backend/convex/readiness.ts`: list and update readiness operations plus score recalculation.
- Create `packages/backend/convex/risks.ts`: list, dismiss, and mitigate risk operations.

---

## Task 1: Create The Shared Domain Package

**Files:**
- Create: `packages/domain/package.json`
- Create: `packages/domain/tsconfig.json`
- Create: `packages/domain/src/index.ts`

- [ ] **Step 1: Create package manifest**

Create `packages/domain/package.json`:

```json
{
  "name": "@viya-app/domain",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./demo/palawan": "./src/demo/palawan.ts"
  },
  "scripts": {
    "check-types": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "zod": "catalog:"
  },
  "devDependencies": {
    "@viya-app/config": "workspace:*",
    "typescript": "catalog:",
    "vitest": "^4.0.13"
  }
}
```

- [ ] **Step 2: Create TypeScript config**

Create `packages/domain/tsconfig.json`:

```json
{
  "extends": "@viya-app/config/tsconfig.base.json",
  "compilerOptions": {
    "strictNullChecks": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create public export file**

Create `packages/domain/src/index.ts`:

```ts
export * from "./constants";
export * from "./dashboard";
export * from "./readiness";
export * from "./schemas/readiness";
export * from "./types";
```

- [ ] **Step 4: Install workspace dependencies**

Run from repo root:

```bash
bun install
```

Expected: `bun.lock` includes the new `@viya-app/domain` workspace package.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/package.json packages/domain/tsconfig.json packages/domain/src/index.ts bun.lock
git commit -m "feat: Add shared domain package"
```

---

## Task 2: Define Shared Viya Types And Constants

**Files:**
- Create: `packages/domain/src/types.ts`
- Create: `packages/domain/src/constants.ts`
- Create: `apps/native/src/constants/routes.ts`

- [ ] **Step 1: Create shared product domain types**

Create `packages/domain/src/types.ts`:

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
export type NextBestActionTarget = "readiness" | "risks" | "itinerary" | "travelMode" | "moments";

export type User = {
  id: string;
  clerkSubject: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

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

export type VaultItemKind = "booking" | "document" | "momentPhoto" | "receipt" | "noteAttachment" | "other";
export type VaultLinkedEntityType = "trip" | "booking" | "travelDocument" | "moment" | "readinessItem";
export type VaultItemStatus = "uploaded" | "processing" | "ready" | "failed" | "archived";
export type TravelDocumentType =
  | "passport"
  | "id"
  | "visa"
  | "insurance"
  | "ticket"
  | "voucher"
  | "qr"
  | "permit"
  | "other";
export type TravelDocumentStatus = "missing" | "uploaded" | "verified" | "expired";

export type VaultItem = {
  id: string;
  ownerId: string;
  tripId: string | null;
  storageId: string;
  kind: VaultItemKind;
  fileName: string;
  mimeType: string;
  fileSize: number;
  title: string;
  note: string | null;
  status: VaultItemStatus;
  linkedEntityType: VaultLinkedEntityType | null;
  linkedEntityId: string | null;
  extractedSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TravelDocument = {
  id: string;
  tripId: string;
  vaultItemId: string | null;
  type: TravelDocumentType;
  title: string;
  fileUrl: string | null;
  status: TravelDocumentStatus;
  expiryDate: string | null;
  notes: string | null;
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

export type NextBestAction = {
  label: string;
  reason: string;
  target: NextBestActionTarget;
};
```

- [ ] **Step 2: Create shared constants**

Create `packages/domain/src/constants.ts`:

```ts
import type { Priority, ReadinessCategory, RiskSeverity, TripStatus } from "./types";

export const DEMO_TRIP_ID = "demo-palawan";

export const READINESS_CATEGORIES = [
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
] as const satisfies ReadinessCategory[];

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

export const RISK_SEVERITY_RANK: Record<RiskSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  draft: "Draft",
  planning: "Planning",
  ready: "Ready",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export const READINESS_PRIORITY_PENALTY: Record<Priority, number> = {
  low: 6,
  medium: 10,
  high: 18,
  critical: 28,
};

export const INCOMPLETE_READINESS_STATUSES = ["todo", "inProgress", "blocked"] as const;

export const VAULT_ITEM_KIND_LABELS = {
  booking: "Booking",
  document: "Document",
  momentPhoto: "Moment photo",
  noteAttachment: "Note attachment",
  other: "Other",
  receipt: "Receipt",
} as const;
```

- [ ] **Step 3: Create native-only route constants**

Create `apps/native/src/constants/routes.ts`:

```ts
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
  tripVault: "/(drawer)/trips/demo-palawan/vault",
  tripWrapped: "/(drawer)/trips/demo-palawan/wrapped",
} as const;
```

- [ ] **Step 4: Add shared package dependencies**

Modify `apps/native/package.json` dependencies:

```json
{
  "dependencies": {
    "@viya-app/domain": "workspace:*"
  }
}
```

Modify `packages/backend/package.json` dependencies:

```json
{
  "dependencies": {
    "@viya-app/domain": "workspace:*"
  }
}
```

- [ ] **Step 5: Verify shared types compile**

Run:

```bash
bun --filter @viya-app/domain check-types
bun --filter native exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/types.ts packages/domain/src/constants.ts apps/native/src/constants/routes.ts apps/native/package.json packages/backend/package.json
git commit -m "feat: Add shared Viya domain model"
```

## Task 3: Add Palawan Demo Data And Readiness Scoring

**Files:**
- Create: `packages/domain/src/demo/palawan.ts`
- Create: `packages/domain/src/readiness.ts`
- Create: `packages/domain/src/readiness.test.ts`
- Create: `packages/domain/src/schemas/readiness.ts`

- [ ] **Step 1: Write failing readiness tests**

Create `packages/domain/src/readiness.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { palawanDemoTrip } from "./demo/palawan";
import { calculateReadinessScore } from "./readiness";

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
bun --filter @viya-app/domain test packages/domain/src/readiness.test.ts
```

Expected: FAIL because `palawanDemoTrip` and `calculateReadinessScore` do not exist.

- [ ] **Step 3: Create deterministic demo data**

Create `packages/domain/src/demo/palawan.ts`:

```ts
import type { ViyaDemoTrip } from "../types";

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

Create `packages/domain/src/readiness.ts`:

```ts
import {
  INCOMPLETE_READINESS_STATUSES,
  READINESS_CATEGORIES,
  READINESS_PRIORITY_PENALTY,
} from "./constants";
import type { ReadinessCategory, ReadinessItem, ReadinessScore } from "./types";

const incompleteStatuses = new Set<string>(INCOMPLETE_READINESS_STATUSES);

const getItemPenalty = (item: ReadinessItem): number => {
  if (!incompleteStatuses.has(item.status)) {
    return 0;
  }

  return READINESS_PRIORITY_PENALTY[item.priority];
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
    READINESS_CATEGORIES.map((category) => {
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
bun --filter @viya-app/domain test packages/domain/src/readiness.test.ts
```

Expected: PASS.

- [ ] **Step 6: Add readiness Zod schema**

Create `packages/domain/src/schemas/readiness.ts`:

```ts
import { z } from "zod";

export const readinessAiOutputSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  categoryScores: z.object({
    documents: z.number().int().min(0).max(100),
    bookings: z.number().int().min(0).max(100),
    packing: z.number().int().min(0).max(100),
    budget: z.number().int().min(0).max(100),
    schedule: z.number().int().min(0).max(100),
    transport: z.number().int().min(0).max(100),
    weather: z.number().int().min(0).max(100),
    safety: z.number().int().min(0).max(100),
    group: z.number().int().min(0).max(100),
    backupPlan: z.number().int().min(0).max(100),
  }),
  summary: z.string().min(1),
  missingItems: z.array(
    z.object({
      category: z.enum([
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
      ]),
      title: z.string().min(1),
      priority: z.enum(["low", "medium", "high", "critical"]),
      reason: z.string().min(1),
    }),
  ),
  suggestedActions: z.array(
    z.object({
      label: z.string().min(1),
      actionType: z.string().min(1),
    }),
  ),
});

export type ReadinessAiOutput = z.infer<typeof readinessAiOutputSchema>;
```

- [ ] **Step 7: Run static checks**

Run:

```bash
bun check
bun --filter @viya-app/domain check-types
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/domain/src/demo/palawan.ts packages/domain/src/readiness.ts packages/domain/src/readiness.test.ts packages/domain/src/schemas/readiness.ts
git commit -m "feat: Add Palawan demo readiness model"
```

---

## Task 4: Add Dashboard Selectors For The Demo Trip

**Files:**
- Create: `packages/domain/src/dashboard.ts`
- Create: `packages/domain/src/dashboard.test.ts`

- [ ] **Step 1: Write selector tests**

Create `packages/domain/src/dashboard.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { palawanDemoTrip } from "./demo/palawan";
import {
  getCriticalOpenRisks,
  getNextBestAction,
  getUpcomingItineraryItems,
} from "./dashboard";

describe("trip dashboard selectors", () => {
  it("uses the highest severity open risk as the next best action", () => {
    const action = getNextBestAction(palawanDemoTrip);

    expect(action.label).toBe("Confirm final night hotel");
    expect(action.reason).toBe("I do not see confirmed accommodation for the last night of the trip.");
    expect(action.target).toBe("readiness");
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
bun --filter @viya-app/domain test packages/domain/src/dashboard.test.ts
```

Expected: FAIL because the selectors do not exist.

- [ ] **Step 3: Implement selectors**

Create `packages/domain/src/dashboard.ts`:

```ts
import { RISK_SEVERITY_RANK } from "./constants";
import type { ItineraryItem, NextBestAction, Risk, ViyaDemoTrip } from "./types";

export const getCriticalOpenRisks = (risks: Risk[]): Risk[] =>
  risks
    .filter((risk) => risk.status === "open" && risk.severity === "critical")
    .sort((a, b) => RISK_SEVERITY_RANK[b.severity] - RISK_SEVERITY_RANK[a.severity]);

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
    .sort((a, b) => RISK_SEVERITY_RANK[b.severity] - RISK_SEVERITY_RANK[a.severity])[0];

  if (openRisk?.relatedEntityId === "ready-final-hotel") {
    return {
      label: "Confirm final night hotel",
      reason: openRisk.message,
      target: "readiness",
    };
  }

  const incompleteReadinessItem = demoTrip.readinessItems.find((item) => item.status !== "done");

  if (incompleteReadinessItem) {
    return {
      label: incompleteReadinessItem.title,
      reason: incompleteReadinessItem.aiReason,
      target: "readiness",
    };
  }

  return {
    label: "Open Travel Mode",
    reason: "Your core planning items are ready. Use Travel Mode for the current day.",
    target: "travelMode",
  };
};
```

- [ ] **Step 4: Run selector tests**

Run:

```bash
bun --filter @viya-app/domain test packages/domain/src/dashboard.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/dashboard.ts packages/domain/src/dashboard.test.ts
git commit -m "feat: Add trip dashboard selectors"
```

---

## Task 5: Establish Provider-Agnostic AI Backend Foundation

**Files:**
- Modify: `packages/domain/src/index.ts`
- Create: `packages/domain/src/schemas/itinerary.ts`
- Create: `packages/domain/src/schemas/risks.ts`
- Create: `packages/domain/src/schemas/vault.ts`
- Create: `packages/domain/src/schemas/wrapped.ts`
- Modify: `packages/backend/package.json`
- Create: `packages/backend/convex/ai/provider.ts`
- Create: `packages/backend/convex/ai/prompts.ts`
- Create: `packages/backend/convex/ai/fallbacks.ts`
- Create: `packages/backend/convex/ai/structured.ts`
- Create: `packages/backend/convex/ai/features.ts`
- Modify: `packages/backend/convex/agent.ts`
- Modify: `packages/backend/convex/chat.ts`

- [ ] **Step 1: Add OpenRouter provider dependency**

Run:

```bash
bun add --filter @viya-app/backend @openrouter/ai-sdk-provider
```

Expected: `packages/backend/package.json` includes:

```json
{
  "dependencies": {
    "@openrouter/ai-sdk-provider": "^0.7.5"
  }
}
```

- [ ] **Step 2: Add shared AI output schemas**

Create `packages/domain/src/schemas/itinerary.ts`:

```ts
import { z } from "zod";

export const generatedItinerarySchema = z.object({
  summary: z.string().min(1),
  assumptions: z.array(z.string().min(1)),
  days: z.array(
    z.object({
      date: z.string().min(1),
      title: z.string().min(1),
      summary: z.string().min(1),
      theme: z.string().min(1),
      estimatedCost: z.number().nonnegative(),
      pace: z.enum(["light", "balanced", "packed"]),
      items: z.array(
        z.object({
          title: z.string().min(1),
          description: z.string().min(1),
          category: z.enum([
            "activity",
            "food",
            "transport",
            "hotel",
            "rest",
            "shopping",
            "note",
            "flight",
            "emergency",
          ]),
          startTime: z.string().min(1),
          endTime: z.string().min(1),
          locationName: z.string().min(1),
          estimatedCost: z.number().nonnegative(),
          priority: z.enum(["required", "recommended", "optional"]),
          aiReason: z.string().min(1),
        }),
      ),
    }),
  ),
  warnings: z.array(z.string().min(1)),
  nextActions: z.array(z.string().min(1)),
});

export type GeneratedItinerary = z.infer<typeof generatedItinerarySchema>;
```

Create `packages/domain/src/schemas/risks.ts`:

```ts
import { z } from "zod";

export const detectedRisksSchema = z.object({
  risks: z.array(
    z.object({
      type: z.enum([
        "weather",
        "schedule",
        "booking",
        "budget",
        "transport",
        "safety",
        "group",
        "document",
        "fatigue",
        "unknown",
      ]),
      severity: z.enum(["low", "medium", "high", "critical"]),
      title: z.string().min(1),
      message: z.string().min(1),
      suggestedAction: z.string().min(1),
      relatedEntityType: z.string().nullable(),
      relatedEntityId: z.string().nullable(),
      aiReason: z.string().min(1),
    }),
  ),
});

export type DetectedRisks = z.infer<typeof detectedRisksSchema>;
```

Create `packages/domain/src/schemas/vault.ts`:

```ts
import { z } from "zod";

export const vaultExtractionSchema = z.object({
  booking: z
    .object({
      confirmationCode: z.string().nullable(),
      endDateTime: z.string().nullable(),
      locationName: z.string().nullable(),
      provider: z.string().nullable(),
      startDateTime: z.string().nullable(),
      title: z.string().min(1),
      type: z.enum(["flight", "hotel", "activity", "transport", "restaurant", "insurance", "other"]),
    })
    .nullable(),
  confidence: z.number().min(0).max(1),
  documentType: z.enum([
    "passport",
    "id",
    "visa",
    "insurance",
    "ticket",
    "voucher",
    "qr",
    "permit",
    "other",
  ]),
  extractedTitle: z.string().min(1),
  readinessSuggestions: z.array(
    z.object({
      category: z.enum([
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
      ]),
      priority: z.enum(["low", "medium", "high", "critical"]),
      reason: z.string().min(1),
      title: z.string().min(1),
    }),
  ),
  summary: z.string().min(1),
});

export type VaultExtraction = z.infer<typeof vaultExtractionSchema>;
```

Create `packages/domain/src/schemas/wrapped.ts`:

```ts
import { z } from "zod";

export const wrappedSummarySchema = z.object({
  tripSummary: z.string().min(1),
  stats: z.object({
    days: z.number().int().nonnegative(),
    plannedActivities: z.number().int().nonnegative(),
    momentsCaptured: z.number().int().nonnegative(),
    readinessScore: z.number().int().min(0).max(100),
  }),
  bestMoments: z.array(
    z.object({
      title: z.string().min(1),
      caption: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
  travelPersonality: z.string().min(1),
  shareableCards: z.array(
    z.object({
      title: z.string().min(1),
      body: z.string().min(1),
    }),
  ),
  nextTripSuggestions: z.array(z.string().min(1)),
});

export type WrappedSummary = z.infer<typeof wrappedSummarySchema>;
```

Modify `packages/domain/src/index.ts`:

```ts
export * from "./constants";
export * from "./dashboard";
export * from "./readiness";
export * from "./schemas/itinerary";
export * from "./schemas/readiness";
export * from "./schemas/risks";
export * from "./schemas/vault";
export * from "./schemas/wrapped";
export * from "./types";
```

- [ ] **Step 3: Create AI provider factory**

Create `packages/backend/convex/ai/provider.ts`:

```ts
import { google } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

export type AiProviderName = "openrouter" | "google";
export type AiModelPurpose =
  | "chat"
  | "itinerary"
  | "readiness"
  | "risk"
  | "travelMode"
  | "moments"
  | "wrapped"
  | "vault";

const getProviderName = (): AiProviderName => {
  const provider = process.env.AI_PROVIDER;

  if (provider === "google") {
    return "google";
  }

  return "openrouter";
};

const getModelId = (purpose: AiModelPurpose): string => {
  const purposeKey = `AI_MODEL_${purpose.toUpperCase()}`;
  const purposeModel = process.env[purposeKey];

  if (purposeModel) {
    return purposeModel;
  }

  return process.env.AI_MODEL ?? process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";
};

export const getLanguageModel = (purpose: AiModelPurpose): LanguageModel => {
  const provider = getProviderName();
  const modelId = getModelId(purpose);

  if (provider === "google") {
    return google(process.env.GOOGLE_GENERATIVE_AI_MODEL ?? "gemini-2.5-flash");
  }

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    appName: "Viya",
    appUrl: process.env.OPENROUTER_APP_URL,
    compatibility: "compatible",
  });

  return openrouter(modelId);
};
```

- [ ] **Step 4: Create Viya prompt builders**

Create `packages/backend/convex/ai/prompts.ts`:

```ts
export const VIYA_SYSTEM_PROMPT = [
  "You are Viya, an AI travel operations companion.",
  "Be calm, concise, proactive, and specific to the trip context.",
  "Do not invent confirmed bookings, documents, weather, safety facts, or prices.",
  "When uncertain, say what is missing from the current trip hub.",
  "Prefer next actions that improve readiness, reduce risk, or help the traveler decide.",
].join("\n");

export const buildItineraryPrompt = (tripContext: string) =>
  [
    VIYA_SYSTEM_PROMPT,
    "Mode: Planner.",
    "Generate a realistic, route-aware itinerary as strict structured data.",
    "Respect arrival and departure timing, budget, group type, pace, and rest.",
    tripContext,
  ].join("\n\n");

export const buildReadinessPrompt = (tripContext: string) =>
  [
    VIYA_SYSTEM_PROMPT,
    "Mode: Readiness.",
    "Analyze missing bookings, documents, packing, budget, schedule, transport, weather, safety, group, and backup-plan items.",
    "Return concrete gaps and actions only.",
    tripContext,
  ].join("\n\n");

export const buildRiskPrompt = (tripContext: string) =>
  [
    VIYA_SYSTEM_PROMPT,
    "Mode: Risk Radar.",
    "Detect weather, schedule, booking, budget, transport, safety, group, document, and fatigue risks.",
    "Explain why each risk matters and the smallest useful mitigation.",
    tripContext,
  ].join("\n\n");

export const buildWrappedPrompt = (tripContext: string) =>
  [
    VIYA_SYSTEM_PROMPT,
    "Mode: Wrapped.",
    "Create a concise post-trip recap with stats, best moments, personality, shareable cards, and next-trip suggestions.",
    tripContext,
  ].join("\n\n");

export const buildVaultExtractionPrompt = (vaultContext: string) =>
  [
    VIYA_SYSTEM_PROMPT,
    "Mode: Organizer.",
    "Extract useful booking or travel-document details from the Vault file context.",
    "Never mark uncertain facts as confirmed. Use null for fields that are not visible or not provided.",
    "Return readiness suggestions only when the file reveals a concrete missing or risky item.",
    vaultContext,
  ].join("\n\n");
```

- [ ] **Step 5: Create deterministic AI fallbacks**

Create `packages/backend/convex/ai/fallbacks.ts`:

```ts
import type {
  DetectedRisks,
  GeneratedItinerary,
  ReadinessAiOutput,
  VaultExtraction,
  WrappedSummary,
} from "@viya-app/domain";
import { palawanDemoTrip } from "@viya-app/domain/demo/palawan";

export const fallbackItinerary: GeneratedItinerary = {
  summary: palawanDemoTrip.trip.summary,
  assumptions: ["Using the seeded Palawan demo trip because live AI is unavailable."],
  days: palawanDemoTrip.days.map((day) => ({
    date: day.date,
    estimatedCost: day.estimatedCost,
    items: palawanDemoTrip.items
      .filter((item) => item.dayId === day.id)
      .map((item) => ({
        aiReason: item.aiReason,
        category: item.category,
        description: item.description,
        endTime: item.endTime,
        estimatedCost: item.estimatedCost,
        locationName: item.locationName,
        priority: item.priority,
        startTime: item.startTime,
        title: item.title,
      })),
    pace: day.pace,
    summary: day.summary,
    theme: day.theme,
    title: day.title,
  })),
  nextActions: ["Confirm final night hotel", "Book airport transfer", "Add rain backup plan"],
  warnings: ["Final night accommodation is not confirmed.", "Day 3 needs a weather backup."],
};

export const fallbackReadiness: ReadinessAiOutput = {
  overallScore: 68,
  categoryScores: {
    backupPlan: 100,
    bookings: 72,
    budget: 100,
    documents: 100,
    group: 100,
    packing: 100,
    safety: 100,
    schedule: 100,
    transport: 82,
    weather: 82,
  },
  missingItems: [
    {
      category: "bookings",
      priority: "critical",
      reason: "The saved hotel coverage does not appear to include the final night.",
      title: "Confirm final night hotel",
    },
    {
      category: "transport",
      priority: "high",
      reason: "Arrival is late and no airport transfer is saved.",
      title: "Book airport transfer",
    },
    {
      category: "weather",
      priority: "high",
      reason: "Day 3 island hopping is weather-sensitive.",
      title: "Add rain backup plan",
    },
  ],
  suggestedActions: [
    { actionType: "create_task", label: "Create hotel confirmation task" },
    { actionType: "create_task", label: "Create airport transfer reminder" },
  ],
  summary: "Almost ready, but 3 important items need attention.",
};

export const fallbackRisks: DetectedRisks = {
  risks: palawanDemoTrip.risks.map((risk) => ({
    aiReason: risk.aiReason,
    message: risk.message,
    relatedEntityId: risk.relatedEntityId,
    relatedEntityType: risk.relatedEntityType,
    severity: risk.severity,
    suggestedAction: risk.suggestedAction,
    title: risk.title,
    type: risk.type,
  })),
};

export const fallbackWrapped: WrappedSummary = {
  bestMoments: [
    {
      caption: "Soft skies, salt air, and the first quiet moment of the trip.",
      reason: "It marks the emotional start of the journey.",
      title: "First Palawan sunset",
    },
  ],
  nextTripSuggestions: ["Plan a slower beach-focused return to Palawan"],
  shareableCards: [
    {
      body: "A scenic, balanced Palawan escape with island time and practical planning wins.",
      title: "Palawan Escape",
    },
  ],
  stats: {
    days: palawanDemoTrip.days.length,
    momentsCaptured: palawanDemoTrip.moments.length,
    plannedActivities: palawanDemoTrip.items.length,
    readinessScore: 68,
  },
  travelPersonality: "Balanced scenic planner",
  tripSummary: palawanDemoTrip.trip.summary,
};

export const fallbackVaultExtraction: VaultExtraction = {
  booking: null,
  confidence: 0.4,
  documentType: "other",
  extractedTitle: "Uploaded travel file",
  readinessSuggestions: [
    {
      category: "documents",
      priority: "medium",
      reason: "A new Vault file was added and should be reviewed before departure.",
      title: "Review uploaded travel file",
    },
  ],
  summary: "Viya saved this file to the trip Vault. Review it to confirm whether it is a booking, ID, voucher, or note.",
};
```

- [ ] **Step 6: Create typed structured generation helper**

Create `packages/backend/convex/ai/structured.ts`:

```ts
import { generateObject, streamObject, type LanguageModel } from "ai";
import type { z } from "zod";

type StructuredOptions<TSchema extends z.ZodType> = {
  fallback: z.infer<TSchema>;
  model: LanguageModel;
  prompt: string;
  schema: TSchema;
  schemaName: string;
};

export const generateStructuredObject = async <TSchema extends z.ZodType>({
  fallback,
  model,
  prompt,
  schema,
  schemaName,
}: StructuredOptions<TSchema>): Promise<z.infer<TSchema>> => {
  try {
    const result = await generateObject({
      model,
      prompt,
      schema,
      schemaName,
    });

    return result.object;
  } catch {
    return fallback;
  }
};

export const streamStructuredObject = <TSchema extends z.ZodType>({
  fallback,
  model,
  prompt,
  schema,
  schemaName,
}: StructuredOptions<TSchema>) => {
  try {
    return streamObject({
      model,
      prompt,
      schema,
      schemaName,
    });
  } catch {
    return {
      object: Promise.resolve(fallback),
      partialObjectStream: (async function* () {
        yield fallback;
      })(),
    };
  }
};
```

- [ ] **Step 7: Add AI feature actions**

Create `packages/backend/convex/ai/features.ts`:

```ts
import {
  detectedRisksSchema,
  generatedItinerarySchema,
  readinessAiOutputSchema,
  vaultExtractionSchema,
  wrappedSummarySchema,
} from "@viya-app/domain";
import { palawanDemoTrip } from "@viya-app/domain/demo/palawan";
import { v } from "convex/values";

import { action } from "../_generated/server";
import {
  fallbackItinerary,
  fallbackReadiness,
  fallbackRisks,
  fallbackVaultExtraction,
  fallbackWrapped,
} from "./fallbacks";
import { getLanguageModel } from "./provider";
import {
  buildItineraryPrompt,
  buildReadinessPrompt,
  buildRiskPrompt,
  buildVaultExtractionPrompt,
  buildWrappedPrompt,
} from "./prompts";
import { generateStructuredObject } from "./structured";

const getDemoTripContext = () => JSON.stringify(palawanDemoTrip);

export const generateItineraryDraft = action({
  args: {
    tripId: v.string(),
    useFallback: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    if (args.useFallback) {
      return fallbackItinerary;
    }

    return generateStructuredObject({
      fallback: fallbackItinerary,
      model: getLanguageModel("itinerary"),
      prompt: buildItineraryPrompt(getDemoTripContext()),
      schema: generatedItinerarySchema,
      schemaName: "GeneratedItinerary",
    });
  },
});

export const analyzeReadinessDraft = action({
  args: {
    tripId: v.string(),
    useFallback: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    if (args.useFallback) {
      return fallbackReadiness;
    }

    return generateStructuredObject({
      fallback: fallbackReadiness,
      model: getLanguageModel("readiness"),
      prompt: buildReadinessPrompt(getDemoTripContext()),
      schema: readinessAiOutputSchema,
      schemaName: "ReadinessAnalysis",
    });
  },
});

export const detectRisksDraft = action({
  args: {
    tripId: v.string(),
    useFallback: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    if (args.useFallback) {
      return fallbackRisks;
    }

    return generateStructuredObject({
      fallback: fallbackRisks,
      model: getLanguageModel("risk"),
      prompt: buildRiskPrompt(getDemoTripContext()),
      schema: detectedRisksSchema,
      schemaName: "DetectedRisks",
    });
  },
});

export const generateWrappedDraft = action({
  args: {
    tripId: v.string(),
    useFallback: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    if (args.useFallback) {
      return fallbackWrapped;
    }

    return generateStructuredObject({
      fallback: fallbackWrapped,
      model: getLanguageModel("wrapped"),
      prompt: buildWrappedPrompt(getDemoTripContext()),
      schema: wrappedSummarySchema,
      schemaName: "WrappedSummary",
    });
  },
});

export const extractVaultItemDraft = action({
  args: {
    fileName: v.string(),
    mimeType: v.string(),
    title: v.string(),
    useFallback: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    if (args.useFallback) {
      return fallbackVaultExtraction;
    }

    const vaultContext = JSON.stringify({
      fileName: args.fileName,
      mimeType: args.mimeType,
      title: args.title,
    });

    return generateStructuredObject({
      fallback: fallbackVaultExtraction,
      model: getLanguageModel("vault"),
      prompt: buildVaultExtractionPrompt(vaultContext),
      schema: vaultExtractionSchema,
      schemaName: "VaultExtraction",
    });
  },
});
```

- [ ] **Step 8: Update streaming chat agent to use the provider factory**

Replace `packages/backend/convex/agent.ts` with:

```ts
import { Agent } from "@convex-dev/agent";

import { components } from "./_generated/api";
import { getLanguageModel } from "./ai/provider";
import { VIYA_SYSTEM_PROMPT } from "./ai/prompts";

export const chatAgent = new Agent(components.agent, {
  instructions: VIYA_SYSTEM_PROMPT,
  languageModel: getLanguageModel("chat"),
  name: "Viya",
});
```

Modify `packages/backend/convex/chat.ts` so `createNewThread` requires auth and stores the Clerk subject in thread metadata:

```ts
export const createNewThread = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await getRequiredIdentity(ctx);
    const threadId = await createThread(ctx, components.agent, {
      userId: identity.subject,
    });

    return threadId;
  },
});
```

Also import the helper:

```ts
import { getRequiredIdentity } from "./lib/auth";
```

- [ ] **Step 9: Document required AI environment variables**

Add this note to `packages/backend/convex/README.md`:

```md
## AI provider

Viya uses the Vercel AI SDK behind a backend provider boundary.

Recommended Convex environment variables:

- `AI_PROVIDER=openrouter`
- `OPENROUTER_API_KEY=<secret>`
- `OPENROUTER_MODEL=<provider/model>`
- `OPENROUTER_APP_URL=<optional app URL>`

Fallback Google variables:

- `AI_PROVIDER=google`
- `GOOGLE_GENERATIVE_AI_API_KEY=<secret>`
- `GOOGLE_GENERATIVE_AI_MODEL=gemini-2.5-flash`

Native must not receive provider API keys. AI calls go through Convex actions or Convex Agent streams.
```

- [ ] **Step 10: Verify AI foundation**

Run:

```bash
bun --filter @viya-app/domain check-types
bun --filter @viya-app/backend exec tsc --noEmit -p convex/tsconfig.json
bun check
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add packages/domain/src/index.ts packages/domain/src/schemas packages/backend/package.json packages/backend/convex/README.md packages/backend/convex/agent.ts packages/backend/convex/chat.ts packages/backend/convex/ai bun.lock
git commit -m "feat: Add Viya AI provider foundation"
```

---

## Task 6: Add Auth-Gated App Shell And Viya Auth UI

**Files:**
- Modify: `apps/native/app/(drawer)/_layout.tsx`
- Modify: `apps/native/app/(auth)/_layout.tsx`
- Create: `apps/native/src/features/auth/auth-routing.ts`
- Create: `apps/native/src/features/auth/AuthScreenShell.tsx`
- Modify: `apps/native/app/(auth)/sign-in.tsx`
- Modify: `apps/native/app/(auth)/sign-up.tsx`

- [ ] **Step 1: Extract Clerk decorated route helper**

Create `apps/native/src/features/auth/auth-routing.ts`:

```ts
import type { Href, useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

export const pushDecoratedUrl = (
  router: Router,
  decorateUrl: (url: string) => string,
  href: string,
) => {
  const url = decorateUrl(href);
  const nextHref = url.startsWith("http") ? new URL(url).pathname : url;

  router.replace(nextHref as Href);
};
```

- [ ] **Step 2: Create Viya-styled auth shell**

Create `apps/native/src/features/auth/AuthScreenShell.tsx`:

```tsx
import { Surface } from "heroui-native";
import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";

import { Container } from "@/components/container";

type Props = PropsWithChildren<{
  title: string;
  subtitle: string;
}>;

export function AuthScreenShell({ children, title, subtitle }: Props) {
  return (
    <Container className="px-4 py-8">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center"
      >
        <View className="mb-8">
          <Text className="text-4xl font-semibold text-foreground">Viya</Text>
          <Text className="mt-2 text-base leading-6 text-muted">
            Your AI travel operations companion for planning, readiness, and live trip help.
          </Text>
        </View>
        <Surface variant="secondary" className="rounded-xl p-5">
          <Text className="text-2xl font-semibold text-foreground">{title}</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">{subtitle}</Text>
          <View className="mt-6 gap-4">{children}</View>
        </Surface>
      </KeyboardAvoidingView>
    </Container>
  );
}
```

- [ ] **Step 3: Protect drawer routes**

Modify `apps/native/app/(drawer)/_layout.tsx` so `DrawerLayout` redirects signed-out users before rendering app navigation:

```tsx
import { useAuth } from "@clerk/expo";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Link, Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { Spinner, useThemeColor } from "heroui-native";
import React, { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { ThemeToggle } from "@/components/theme-toggle";

function DrawerLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");

  const renderThemeToggle = useCallback(() => <ThemeToggle />, []);

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Drawer
      screenOptions={{
        headerTintColor: themeColorForeground,
        headerStyle: { backgroundColor: themeColorBackground },
        headerTitleStyle: {
          color: themeColorForeground,
          fontWeight: "600",
        },
        headerRight: renderThemeToggle,
        drawerStyle: { backgroundColor: themeColorBackground },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          headerTitle: "Home",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Home</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              color={focused ? color : themeColorForeground}
              name="home-outline"
              size={size}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerTitle: "Viya",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Viya</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <MaterialIcons
              color={focused ? color : themeColorForeground}
              name="travel-explore"
              size={size}
            />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable className="mr-4">
                <Ionicons color={themeColorForeground} name="add-outline" size={24} />
              </Pressable>
            </Link>
          ),
        }}
      />
      <Drawer.Screen
        name="ai"
        options={{
          headerTitle: "Ask Viya",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Ask Viya</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              color={focused ? color : themeColorForeground}
              name="chatbubble-ellipses-outline"
              size={size}
            />
          ),
        }}
      />
    </Drawer>
  );
}

export default DrawerLayout;
```

- [ ] **Step 4: Make auth layout visually quiet**

Replace `apps/native/app/(auth)/_layout.tsx` with:

```tsx
import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { Spinner } from "heroui-native";
import { View } from "react-native";

export default function AuthRoutesLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(drawer)/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 5: Replace sign-in screen with HeroUI Native composition**

Replace `apps/native/app/(auth)/sign-in.tsx` with:

```tsx
import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { Button, Input, Spinner, TextField } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { AuthScreenShell } from "@/src/features/auth/AuthScreenShell";
import { pushDecoratedUrl } from "@/src/features/auth/auth-routing";

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const emailCodeFactor = signIn.supportedSecondFactors.find(
    (factor) => factor.strategy === "email_code",
  );
  const requiresEmailCode =
    signIn.status === "needs_client_trust" ||
    (signIn.status === "needs_second_factor" && !!emailCodeFactor);
  const isSubmitting = fetchStatus === "fetching";

  const handleSubmit = async () => {
    setStatusMessage(null);

    const { error } = await signIn.password({
      emailAddress,
      password,
    });

    if (error) {
      setStatusMessage(error.longMessage ?? "Unable to sign in. Please try again.");
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            setStatusMessage("Finish the required account step before continuing.");
            return;
          }

          pushDecoratedUrl(router, decorateUrl, "/(drawer)/(tabs)");
        },
      });
      return;
    }

    if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode();
        setStatusMessage(`We sent a verification code to ${emailCodeFactor.safeIdentifier}.`);
        return;
      }

      setStatusMessage("A second factor is required, but this screen only supports email codes.");
      return;
    }

    setStatusMessage("Sign-in could not be completed. Please try again.");
  };

  const handleVerify = async () => {
    setStatusMessage(null);

    try {
      await signIn.mfa.verifyEmailCode({ code });
    } catch {
      setStatusMessage("That code could not be verified. Please try again.");
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            setStatusMessage("Finish the required account step before continuing.");
            return;
          }

          pushDecoratedUrl(router, decorateUrl, "/(drawer)/(tabs)");
        },
      });
      return;
    }

    setStatusMessage("That code did not complete sign-in. Please try again.");
  };

  if (requiresEmailCode) {
    return (
      <AuthScreenShell
        subtitle="Enter the code Clerk sent to your email."
        title="Verify your account"
      >
        {statusMessage ? <Text className="text-sm text-muted">{statusMessage}</Text> : null}
        <TextField>
          <Input
            editable={!isSubmitting}
            keyboardType="numeric"
            onChangeText={setCode}
            placeholder="Verification code"
            value={code}
          />
        </TextField>
        {errors.fields.code ? (
          <Text className="text-sm text-danger">{errors.fields.code.message}</Text>
        ) : null}
        <Button isDisabled={isSubmitting || !code} onPress={handleVerify}>
          {isSubmitting ? <Spinner size="sm" /> : <Button.Label>Verify</Button.Label>}
        </Button>
        <Button isDisabled={isSubmitting} onPress={() => signIn.mfa.sendEmailCode()} variant="ghost">
          <Button.Label>I need a new code</Button.Label>
        </Button>
      </AuthScreenShell>
    );
  }

  return (
    <AuthScreenShell
      subtitle="Sign in to keep your trips, readiness, risks, and moments synced."
      title="Sign in"
    >
      {statusMessage ? <Text className="text-sm text-muted">{statusMessage}</Text> : null}
      <View className="gap-2">
        <Text className="text-sm font-medium text-foreground">Email address</Text>
        <TextField>
          <Input
            autoCapitalize="none"
            editable={!isSubmitting}
            keyboardType="email-address"
            onChangeText={setEmailAddress}
            placeholder="you@example.com"
            value={emailAddress}
          />
        </TextField>
        {errors.fields.identifier ? (
          <Text className="text-sm text-danger">{errors.fields.identifier.message}</Text>
        ) : null}
      </View>
      <View className="gap-2">
        <Text className="text-sm font-medium text-foreground">Password</Text>
        <TextField>
          <Input
            editable={!isSubmitting}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry={true}
            value={password}
          />
        </TextField>
        {errors.fields.password ? (
          <Text className="text-sm text-danger">{errors.fields.password.message}</Text>
        ) : null}
      </View>
      <Button
        isDisabled={isSubmitting || !emailAddress || !password}
        onPress={handleSubmit}
      >
        {isSubmitting ? <Spinner size="sm" /> : <Button.Label>Sign in</Button.Label>}
      </Button>
      <View className="flex-row justify-center gap-1">
        <Text className="text-sm text-muted">No account yet?</Text>
        <Link href="/(auth)/sign-up">
          <Text className="text-sm font-semibold text-foreground">Sign up</Text>
        </Link>
      </View>
    </AuthScreenShell>
  );
}
```

- [ ] **Step 6: Replace sign-up screen with HeroUI Native composition**

Replace `apps/native/app/(auth)/sign-up.tsx` with:

```tsx
import { useAuth, useSignUp } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { Button, Input, Spinner, TextField } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { AuthScreenShell } from "@/src/features/auth/AuthScreenShell";
import { pushDecoratedUrl } from "@/src/features/auth/auth-routing";

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isSubmitting = fetchStatus === "fetching";
  const needsEmailCode =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  const handleSubmit = async () => {
    setStatusMessage(null);

    const { error } = await signUp.password({
      emailAddress,
      password,
    });

    if (error) {
      setStatusMessage(error.longMessage ?? "Unable to sign up. Please try again.");
      return;
    }

    await signUp.verifications.sendEmailCode();
    setStatusMessage(`We sent a verification code to ${emailAddress}.`);
  };

  const handleVerify = async () => {
    setStatusMessage(null);

    try {
      await signUp.verifications.verifyEmailCode({ code });
    } catch {
      setStatusMessage("That code could not be verified. Please try again.");
      return;
    }

    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            setStatusMessage("Finish the required account step before continuing.");
            return;
          }

          pushDecoratedUrl(router, decorateUrl, "/(drawer)/(tabs)");
        },
      });
      return;
    }

    setStatusMessage("That code did not complete sign-up. Please try again.");
  };

  if (signUp.status === "complete" || isSignedIn) {
    return null;
  }

  if (needsEmailCode) {
    return (
      <AuthScreenShell
        subtitle="Enter the code Clerk sent to your email."
        title="Verify your email"
      >
        {statusMessage ? <Text className="text-sm text-muted">{statusMessage}</Text> : null}
        <TextField>
          <Input
            editable={!isSubmitting}
            keyboardType="numeric"
            onChangeText={setCode}
            placeholder="Verification code"
            value={code}
          />
        </TextField>
        {errors.fields.code ? (
          <Text className="text-sm text-danger">{errors.fields.code.message}</Text>
        ) : null}
        <Button isDisabled={isSubmitting || !code} onPress={handleVerify}>
          {isSubmitting ? <Spinner size="sm" /> : <Button.Label>Verify email</Button.Label>}
        </Button>
        <Button
          isDisabled={isSubmitting}
          onPress={() => signUp.verifications.sendEmailCode()}
          variant="ghost"
        >
          <Button.Label>I need a new code</Button.Label>
        </Button>
      </AuthScreenShell>
    );
  }

  return (
    <AuthScreenShell
      subtitle="Create an account so Viya can keep your trip hub synced."
      title="Create account"
    >
      {statusMessage ? <Text className="text-sm text-muted">{statusMessage}</Text> : null}
      <View className="gap-2">
        <Text className="text-sm font-medium text-foreground">Email address</Text>
        <TextField>
          <Input
            autoCapitalize="none"
            editable={!isSubmitting}
            keyboardType="email-address"
            onChangeText={setEmailAddress}
            placeholder="you@example.com"
            value={emailAddress}
          />
        </TextField>
        {errors.fields.emailAddress ? (
          <Text className="text-sm text-danger">{errors.fields.emailAddress.message}</Text>
        ) : null}
      </View>
      <View className="gap-2">
        <Text className="text-sm font-medium text-foreground">Password</Text>
        <TextField>
          <Input
            editable={!isSubmitting}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry={true}
            value={password}
          />
        </TextField>
        {errors.fields.password ? (
          <Text className="text-sm text-danger">{errors.fields.password.message}</Text>
        ) : null}
      </View>
      <Button
        isDisabled={isSubmitting || !emailAddress || !password}
        onPress={handleSubmit}
      >
        {isSubmitting ? <Spinner size="sm" /> : <Button.Label>Create account</Button.Label>}
      </Button>
      <View className="flex-row justify-center gap-1">
        <Text className="text-sm text-muted">Already have an account?</Text>
        <Link href="/(auth)/sign-in">
          <Text className="text-sm font-semibold text-foreground">Sign in</Text>
        </Link>
      </View>
      <View nativeID="clerk-captcha" />
    </AuthScreenShell>
  );
}
```

- [ ] **Step 7: Verify auth flow compiles**

Run:

```bash
bun --filter native exec tsc --noEmit
bun check
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add 'apps/native/app/(drawer)/_layout.tsx' 'apps/native/app/(auth)' apps/native/src/features/auth
git commit -m "feat: Add Viya auth shell"
```

---

## Task 7: Replace Starter Tabs With Viya Main Navigation

**Files:**
- Modify: `apps/native/app/(drawer)/(tabs)/_layout.tsx`
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

- [ ] **Step 2: Create route stubs with real demo data**

Each new tab file should import `Container`, `palawanDemoTrip`, and HeroUI Native primitives. Use concise screen titles and one primary action.

Create `apps/native/app/(drawer)/(tabs)/trips.tsx`:

```tsx
import { palawanDemoTrip } from "@viya-app/domain/demo/palawan";
import { Link } from "expo-router";
import { Button, Card, Chip } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { VIYA_ROUTES } from "@/src/constants/routes";

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

- [ ] **Step 3: Move the AI entry into the Viya tab**

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

- [ ] **Step 4: Remove the starter tab**

Delete `apps/native/app/(drawer)/(tabs)/two.tsx`.

- [ ] **Step 5: Verify navigation compiles**

Run:

```bash
bun --filter native exec tsc --noEmit
bun check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/native/app
git commit -m "feat: Add Viya main navigation"
```

---

## Task 8: Build The Home Screen And Trip Dashboard Slice

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

import { TRIP_STATUS_LABELS, type Trip } from "@viya-app/domain";

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
import type { NextBestAction } from "@viya-app/domain";

type Props = {
  action: NextBestAction;
  href: string;
};
```

```ts
// apps/native/src/components/readiness/ReadinessScoreCard.tsx
import type { ReadinessScore } from "@viya-app/domain";

type Props = {
  score: ReadinessScore;
};
```

```ts
// apps/native/src/components/risk/RiskAlertCard.tsx
import type { Risk } from "@viya-app/domain";

type Props = {
  risk: Risk;
};
```

```ts
// apps/native/src/components/itinerary/ItineraryPreview.tsx
import type { ItineraryItem } from "@viya-app/domain";

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
import {
  calculateReadinessScore,
  getCriticalOpenRisks,
  getNextBestAction,
  getUpcomingItineraryItems,
  type NextBestActionTarget,
} from "@viya-app/domain";
import { palawanDemoTrip } from "@viya-app/domain/demo/palawan";
import { Link, useLocalSearchParams } from "expo-router";
import { Button, Separator } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { ItineraryPreview } from "@/src/components/itinerary/ItineraryPreview";
import { ReadinessScoreCard } from "@/src/components/readiness/ReadinessScoreCard";
import { RiskAlertCard } from "@/src/components/risk/RiskAlertCard";
import { NextBestActionCard } from "@/src/components/trip/NextBestActionCard";
import { TripHeader } from "@/src/components/trip/TripHeader";
import { VIYA_ROUTES } from "@/src/constants/routes";

const nextBestActionHrefByTarget: Record<NextBestActionTarget, string> = {
  readiness: VIYA_ROUTES.tripReadiness,
  risks: VIYA_ROUTES.tripRisks,
  itinerary: VIYA_ROUTES.tripItinerary,
  travelMode: VIYA_ROUTES.tripTravelMode,
  moments: VIYA_ROUTES.tripMoments,
};

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
        <NextBestActionCard action={action} href={nextBestActionHrefByTarget[action.target]} />
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
        <Link href={VIYA_ROUTES.tripVault} asChild>
          <Button variant="secondary">
            <Button.Label>Open Viya Vault</Button.Label>
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

## Task 9: Add First Trip Detail Screens

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

## Task 10: Mirror MVP Entities Into Convex

**Files:**
- Modify: `packages/backend/convex/schema.ts`
- Create: `packages/backend/convex/lib/auth.ts`
- Create: `packages/backend/convex/users.ts`
- Create: `packages/backend/convex/trips.ts`
- Create: `packages/backend/convex/readiness.ts`
- Create: `packages/backend/convex/risks.ts`

- [ ] **Step 1: Add MVP schema tables**

Modify `packages/backend/convex/schema.ts`:

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkSubject: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_subject", ["clerkSubject"]),
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
    .index("by_owner_status", ["ownerId", "status"])
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

- [ ] **Step 2: Add backend auth helpers**

Create `packages/backend/convex/lib/auth.ts` with:

```ts
import { ConvexError } from "convex/values";

import type { MutationCtx, QueryCtx } from "../_generated/server";

export const getRequiredIdentity = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError("AUTH_REQUIRED");
  }

  return identity;
};

export const ensureUserRecord = async (ctx: MutationCtx) => {
  const identity = await getRequiredIdentity(ctx);
  const now = Date.now();
  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_clerk_subject", (q) => q.eq("clerkSubject", identity.subject))
    .unique();

  const email = identity.email ?? undefined;
  const name = identity.name ?? undefined;
  const avatarUrl = identity.pictureUrl ?? undefined;

  if (existingUser) {
    await ctx.db.patch(existingUser._id, {
      avatarUrl,
      email,
      name,
      updatedAt: now,
    });

    return ctx.db.get(existingUser._id);
  }

  const userId = await ctx.db.insert("users", {
    avatarUrl,
    clerkSubject: identity.subject,
    createdAt: now,
    email,
    name,
    updatedAt: now,
  });

  return ctx.db.get(userId);
};
```

- [ ] **Step 3: Add authenticated user functions**

Create `packages/backend/convex/users.ts` with:

```ts
import { mutation, query } from "./_generated/server";
import { ensureUserRecord, getRequiredIdentity } from "./lib/auth";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getRequiredIdentity(ctx);

    return ctx.db
      .query("users")
      .withIndex("by_clerk_subject", (q) => q.eq("clerkSubject", identity.subject))
      .unique();
  },
});

export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => ensureUserRecord(ctx),
});
```

- [ ] **Step 4: Add authenticated trip functions**

Create `packages/backend/convex/trips.ts` with:

```ts
import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { ensureUserRecord, getRequiredIdentity } from "./lib/auth";

export const listTrips = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getRequiredIdentity(ctx);

    return ctx.db
      .query("trips")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .collect();
  },
});

export const getTripById = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const identity = await getRequiredIdentity(ctx);
    const trip = await ctx.db.get(args.tripId);

    if (!trip || trip.ownerId !== identity.subject) {
      throw new ConvexError("TRIP_NOT_FOUND");
    }

    return trip;
  },
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
    const identity = await getRequiredIdentity(ctx);
    await ensureUserRecord(ctx);
    const now = Date.now();
    const tripId = await ctx.db.insert("trips", {
      ownerId: identity.subject,
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

- [ ] **Step 5: Add readiness and risk functions**

Create `packages/backend/convex/readiness.ts`:

```ts
import {
  calculateReadinessScore,
  type Priority,
  type ReadinessCategory,
  type ReadinessItem,
  type WorkStatus,
} from "@viya-app/domain";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

const toDomainReadinessItem = (item: Doc<"readinessItems">): ReadinessItem => ({
  id: item._id,
  tripId: item.tripId,
  category: item.category as ReadinessCategory,
  title: item.title,
  description: item.description,
  status: item.status as WorkStatus,
  priority: item.priority as Priority,
  dueDate: item.dueDate,
  assignedToMemberId: item.assignedToMemberId ?? null,
  aiReason: item.aiReason,
  source: item.source as ReadinessItem["source"],
});

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
    const readiness = calculateReadinessScore(items.map(toDomainReadinessItem));

    await ctx.db.patch(args.tripId, {
      readinessScore: readiness.overallScore,
      updatedAt: Date.now(),
    });

    return {
      tripId: args.tripId,
      readinessScore: readiness.overallScore,
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

- [ ] **Step 6: Verify Convex type generation**

Run:

```bash
bun dev:server
```

Expected: Convex dev starts, schema is accepted, and generated API types include `users`, `trips`, `readiness`, `risks`, and `ai/features`.

Stop the server after generation succeeds.

- [ ] **Step 7: Verify static checks**

Run:

```bash
bun check
bun --filter @viya-app/domain check-types
bun --filter @viya-app/backend exec tsc --noEmit -p convex/tsconfig.json
bun --filter native exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/backend/convex/schema.ts packages/backend/convex/lib/auth.ts packages/backend/convex/users.ts packages/backend/convex/trips.ts packages/backend/convex/readiness.ts packages/backend/convex/risks.ts
git commit -m "feat: Add authenticated Viya Convex schema"
```

---

## Task 11: Add Viya Vault Storage Foundation

**Files:**
- Modify: `apps/native/package.json`
- Modify: `packages/backend/convex/schema.ts`
- Create: `packages/backend/convex/vault.ts`
- Create: `apps/native/src/features/vault/useVaultUpload.ts`
- Create: `apps/native/src/features/vault/VaultPreviewCard.tsx`
- Create: `apps/native/app/(drawer)/trips/[tripId]/vault.tsx`

- [ ] **Step 1: Add native file picker dependencies**

Run:

```bash
bun --filter native expo install expo-document-picker expo-image-picker
```

Expected: `apps/native/package.json` includes compatible Expo SDK versions for `expo-document-picker` and `expo-image-picker`.

- [ ] **Step 2: Add Vault tables to Convex schema**

Extend `packages/backend/convex/schema.ts` inside `defineSchema({ ... })`:

```ts
  vaultItems: defineTable({
    ownerId: v.string(),
    tripId: v.optional(v.id("trips")),
    storageId: v.id("_storage"),
    kind: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
    title: v.string(),
    note: v.optional(v.string()),
    status: v.string(),
    linkedEntityType: v.optional(v.string()),
    linkedEntityId: v.optional(v.string()),
    extractedSummary: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_trip", ["tripId"])
    .index("by_owner_trip", ["ownerId", "tripId"]),
  travelDocuments: defineTable({
    tripId: v.id("trips"),
    vaultItemId: v.optional(v.id("vaultItems")),
    type: v.string(),
    title: v.string(),
    status: v.string(),
    expiryDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_trip", ["tripId"]),
  bookings: defineTable({
    tripId: v.id("trips"),
    vaultItemId: v.optional(v.id("vaultItems")),
    type: v.string(),
    title: v.string(),
    provider: v.optional(v.string()),
    confirmationCode: v.optional(v.string()),
    startDateTime: v.optional(v.string()),
    endDateTime: v.optional(v.string()),
    locationName: v.optional(v.string()),
    address: v.optional(v.string()),
    cost: v.optional(v.number()),
    currency: v.optional(v.string()),
    status: v.string(),
    notes: v.optional(v.string()),
    extractedFrom: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_trip", ["tripId"]),
```

- [ ] **Step 3: Add authenticated Vault backend functions**

Create `packages/backend/convex/vault.ts`:

```ts
import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getRequiredIdentity } from "./lib/auth";

const ensureTripAccess = async (
  ctx: MutationCtx | QueryCtx,
  tripId: Id<"trips"> | undefined,
  ownerId: string,
) => {
  if (!tripId) {
    return;
  }

  const trip = await ctx.db.get(tripId);

  if (!trip || trip.ownerId !== ownerId) {
    throw new ConvexError("TRIP_NOT_FOUND");
  }
};

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getRequiredIdentity(ctx);

    return ctx.storage.generateUploadUrl();
  },
});

export const saveVaultItem = mutation({
  args: {
    fileName: v.string(),
    fileSize: v.number(),
    kind: v.union(
      v.literal("booking"),
      v.literal("document"),
      v.literal("momentPhoto"),
      v.literal("receipt"),
      v.literal("noteAttachment"),
      v.literal("other"),
    ),
    linkedEntityId: v.optional(v.string()),
    linkedEntityType: v.optional(v.string()),
    mimeType: v.string(),
    note: v.optional(v.string()),
    storageId: v.id("_storage"),
    title: v.string(),
    tripId: v.optional(v.id("trips")),
  },
  handler: async (ctx, args) => {
    const identity = await getRequiredIdentity(ctx);
    await ensureTripAccess(ctx, args.tripId, identity.subject);

    const now = Date.now();

    return ctx.db.insert("vaultItems", {
      createdAt: now,
      extractedSummary: undefined,
      fileName: args.fileName,
      fileSize: args.fileSize,
      kind: args.kind,
      linkedEntityId: args.linkedEntityId,
      linkedEntityType: args.linkedEntityType,
      mimeType: args.mimeType,
      note: args.note,
      ownerId: identity.subject,
      status: "ready",
      storageId: args.storageId,
      title: args.title,
      tripId: args.tripId,
      updatedAt: now,
    });
  },
});

export const listTripVaultItems = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const identity = await getRequiredIdentity(ctx);
    await ensureTripAccess(ctx, args.tripId, identity.subject);
    const items = await ctx.db
      .query("vaultItems")
      .withIndex("by_owner_trip", (q) =>
        q.eq("ownerId", identity.subject).eq("tripId", args.tripId),
      )
      .collect();

    return Promise.all(
      items.map(async (item) => ({
        ...item,
        url: await ctx.storage.getUrl(item.storageId),
      })),
    );
  },
});

export const deleteVaultItem = mutation({
  args: {
    vaultItemId: v.id("vaultItems"),
  },
  handler: async (ctx, args) => {
    const identity = await getRequiredIdentity(ctx);
    const item = await ctx.db.get(args.vaultItemId);

    if (!item || item.ownerId !== identity.subject) {
      throw new ConvexError("VAULT_ITEM_NOT_FOUND");
    }

    await ctx.storage.delete(item.storageId);
    await ctx.db.delete(args.vaultItemId);

    return null;
  },
});
```

- [ ] **Step 4: Add native Vault upload hook**

Create `apps/native/src/features/vault/useVaultUpload.ts`:

```ts
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";

type UploadKind = "booking" | "document" | "momentPhoto" | "receipt" | "noteAttachment" | "other";

type UploadInput = {
  kind: UploadKind;
  tripId: Id<"trips">;
};

type PickedFile = {
  fileName: string;
  fileSize: number;
  mimeType: string;
  uri: string;
};

const uploadPickedFile = async (uploadUrl: string, file: PickedFile) => {
  const response = await fetch(file.uri);
  const blob = await response.blob();
  const uploadResponse = await fetch(uploadUrl, {
    body: blob,
    headers: { "Content-Type": file.mimeType },
    method: "POST",
  });

  if (!uploadResponse.ok) {
    throw new Error("Vault upload failed.");
  }

  return (await uploadResponse.json()) as { storageId: Id<"_storage"> };
};

export const useVaultUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const generateUploadUrl = useMutation(api.vault.generateUploadUrl);
  const saveVaultItem = useMutation(api.vault.saveVaultItem);

  const uploadDocument = async ({ kind, tripId }: UploadInput) => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    setIsUploading(true);

    try {
      const uploadUrl = await generateUploadUrl();
      const { storageId } = await uploadPickedFile(uploadUrl, {
        fileName: asset.name,
        fileSize: asset.size ?? 0,
        mimeType: asset.mimeType ?? "application/octet-stream",
        uri: asset.uri,
      });

      return saveVaultItem({
        fileName: asset.name,
        fileSize: asset.size ?? 0,
        kind,
        mimeType: asset.mimeType ?? "application/octet-stream",
        storageId,
        title: asset.name,
        tripId,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const uploadMomentPhoto = async ({ tripId }: { tripId: Id<"trips"> }) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    const fileName = asset.fileName ?? "moment-photo.jpg";
    setIsUploading(true);

    try {
      const uploadUrl = await generateUploadUrl();
      const { storageId } = await uploadPickedFile(uploadUrl, {
        fileName,
        fileSize: asset.fileSize ?? 0,
        mimeType: asset.mimeType ?? "image/jpeg",
        uri: asset.uri,
      });

      return saveVaultItem({
        fileName,
        fileSize: asset.fileSize ?? 0,
        kind: "momentPhoto",
        mimeType: asset.mimeType ?? "image/jpeg",
        storageId,
        title: "Moment photo",
        tripId,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isUploading,
    uploadDocument,
    uploadMomentPhoto,
  };
};
```

- [ ] **Step 5: Add Vault UI foundation**

Create `apps/native/src/features/vault/VaultPreviewCard.tsx`:

```tsx
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Chip } from "heroui-native";
import { Text, View } from "react-native";

type Props = {
  fileName: string;
  kind: string;
  onOpen?: () => void;
  title: string;
};

export function VaultPreviewCard({ fileName, kind, onOpen, title }: Props) {
  return (
    <Card variant="secondary" className="p-4">
      <View className="flex-row items-start gap-3">
        <Ionicons name="document-text-outline" size={22} />
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">{title}</Text>
          <Text className="mt-1 text-sm text-muted">{fileName}</Text>
          <Chip className="mt-3" size="sm" variant="secondary">
            <Chip.Label>{kind}</Chip.Label>
          </Chip>
        </View>
      </View>
      {onOpen ? (
        <Button className="mt-4" onPress={onOpen} variant="secondary">
          <Button.Label>Open</Button.Label>
        </Button>
      ) : null}
    </Card>
  );
}
```

Create `apps/native/app/(drawer)/trips/[tripId]/vault.tsx`:

```tsx
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { Button, Spinner } from "heroui-native";
import { Linking, Text, View } from "react-native";

import { Container } from "@/components/container";
import { useVaultUpload } from "@/src/features/vault/useVaultUpload";
import { VaultPreviewCard } from "@/src/features/vault/VaultPreviewCard";

export default function TripVaultScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const canUsePersistentVault = Boolean(tripId && !tripId.startsWith("demo-"));
  const convexTripId = canUsePersistentVault ? (tripId as Id<"trips">) : null;
  const vaultItems = useQuery(
    api.vault.listTripVaultItems,
    convexTripId ? { tripId: convexTripId } : "skip",
  );
  const { isUploading, uploadDocument, uploadMomentPhoto } = useVaultUpload();

  return (
    <Container className="px-4 py-6">
      <Text className="text-3xl font-semibold text-foreground">Viya Vault</Text>
      <Text className="mt-1 text-sm leading-5 text-muted">
        Store confirmations, travel documents, receipts, and trip photos in one secure trip hub.
      </Text>

      <View className="mt-6 flex-row gap-3">
        <Button
          isDisabled={isUploading || !convexTripId}
          onPress={() => {
            if (convexTripId) {
              uploadDocument({ kind: "document", tripId: convexTripId });
            }
          }}
        >
          <Button.Label>Add document</Button.Label>
        </Button>
        <Button
          isDisabled={isUploading || !convexTripId}
          onPress={() => {
            if (convexTripId) {
              uploadMomentPhoto({ tripId: convexTripId });
            }
          }}
          variant="secondary"
        >
          <Button.Label>Add photo</Button.Label>
        </Button>
      </View>

      {isUploading ? (
        <View className="mt-6 items-center">
          <Spinner />
        </View>
      ) : null}

      <View className="mt-6 gap-3">
        {!convexTripId ? (
          <Text className="text-sm text-muted">
            Vault uploads are ready for persisted Convex trips. The Palawan demo uses deterministic files.
          </Text>
        ) : vaultItems === undefined ? (
          <Spinner />
        ) : vaultItems.length === 0 ? (
          <Text className="text-sm text-muted">
            No Vault files yet. Add a booking, travel document, receipt, or moment photo.
          </Text>
        ) : (
          vaultItems.map((item) => (
            <VaultPreviewCard
              fileName={item.fileName}
              key={item._id}
              kind={item.kind}
              onOpen={item.url ? () => Linking.openURL(item.url) : undefined}
              title={item.title}
            />
          ))
        )}
      </View>
    </Container>
  );
}
```

- [ ] **Step 6: Verify Vault foundation**

Run:

```bash
bun --filter native exec tsc --noEmit
bun --filter @viya-app/backend exec tsc --noEmit -p convex/tsconfig.json
bun check
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/native/package.json 'apps/native/app/(drawer)/trips/[tripId]/vault.tsx' apps/native/src/features/vault packages/backend/convex/schema.ts packages/backend/convex/vault.ts bun.lock
git commit -m "feat: Add Viya Vault storage foundation"
```

---

## Task 12: First Manual Product Verification

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

- Signed-out users are redirected to `/(auth)/sign-in`.
- Sign-in and sign-up screens use Viya copy, HeroUI Native inputs/buttons, and no starter StyleSheet UI.
- After successful Clerk auth, users land on `/(drawer)/(tabs)`.
- Home screen says `Viya`.
- Home screen has `Plan your first trip` and `Explore demo trip` actions.
- `Explore demo trip` opens `/trips/demo-palawan`.
- Trip dashboard shows `Palawan Escape`.
- Readiness score shows `68%`.
- Next best action is `Confirm final night hotel`.
- Risk preview includes `Final night hotel is missing`.
- `Open Travel Mode` opens the Travel Mode screen.
- `Fix My Readiness` opens the Readiness screen.
- `Open Viya Vault` opens the Vault screen.
- Vault screen explains demo-file behavior for the Palawan demo route.
- For a persisted Convex trip ID, Vault upload buttons can pick a document or photo and save metadata through Convex Storage.

- [ ] **Step 3: Verify quality checks**

Run:

```bash
bun check
bun --filter @viya-app/domain test
bun --filter @viya-app/backend exec tsc --noEmit -p convex/tsconfig.json
bun --filter native exec tsc --noEmit
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
- Clerk protects app routes, and auth screens follow the Viya design system.
- Viya Vault has authenticated storage, metadata, serving URLs, and native upload hooks.
- Palawan demo trip is typed and deterministic.
- Trip dashboard proves the core positioning: plan, readiness, next action, and risks.
- Readiness score is calculated by tested pure logic.
- Convex has the first authenticated persistent model aligned with the product data model, including users, trips, Vault files, documents, and bookings.
- The implementation is ready for the next plan: AI itinerary generation, structured AI schemas, and deterministic AI fallback responses.

## Self-Review

- Spec coverage: This plan covers MVP phases 1, 2, and the foundation for phases 3 through 9. It intentionally stops before live AI generation so the first implementation slice remains reliable and demoable.
- Placeholder scan: The plan contains concrete files, commands, and expected outcomes. Remaining spread syntax and React `placeholder` props are valid code, not missing implementation markers.
- Type consistency: The same entity names are used across domain types, demo data, selectors, screen routes, and Convex table names.
