# Viya AI Generation and Architecture Documentation

## Purpose

This document records the instructions, implementation decisions, architecture, infrastructure, and third-party software used to generate the Viya application.

Viya is a mobile-first AI travel workspace for Filipino travelers. It combines trip planning, itinerary management, readiness tracking, bookings, documents, budgets, risks, moments, and post-trip recaps into one Expo React Native application backed by Convex.

## Instructions Used

### Product Instructions

The app was generated around these product requirements:

- Build a premium mobile travel companion, not a generic dashboard.
- Support end-to-end trip planning from destination intake through post-trip wrap-up.
- Make AI useful inside structured travel workflows, not only as a chat surface.
- Keep the experience practical for Filipino travelers, including peso budgets, Philippine passport constraints, local airport habits, group travel norms, and occasional Taglish phrasing when appropriate.
- Keep AI changes reviewable before they update trip workspace records.
- Do not claim live weather, availability, booking status, traffic, or confirmed prices unless the user provides that information.

### AI Agent Prompt Instructions

The backend AI system prompt is defined in `packages/backend/convex/ai/prompts.ts`.

The main Viya agent instructions are:

- Act as a travel guide and AI travel workspace agent.
- Keep conversation travel-only.
- Decline off-topic requests and redirect to travel planning.
- Be calm, concise, proactive, and specific to the trip context.
- Do not invent confirmed bookings, documents, weather, safety facts, or prices.
- Ask at most one direct question per assistant response.
- Prefer actions that improve the workspace: store or link Vault files, generate or refine itinerary drafts, centralize budget facts, and update readiness from current trip status.

The AI chat modes are:

- `chat`: general travel assistant mode.
- `plan`: interactive trip setup mode that asks one question at a time and can produce a `Trip Blueprint`.
- `trip`: trip-scoped workspace assistant mode using current trip context.

### Design Instructions

The mobile design system is documented in `DESIGN.md`.

Key design instructions:

- Use a soft app canvas instead of full-white pages.
- Use floating white island cards for primary surfaces.
- Prefer native mobile workflows over web-style dashboard density.
- Use one visually dominant primary island per main screen.
- Keep rows tappable, compact, and easy to scan.
- Use HeroUI Native, Uniwind, Tailwind CSS, and platform-native typography.

### Code Quality Instructions

The project follows Ultracite and Biome standards from `CLAUDE.md` and `biome.json`.

Core standards:

- TypeScript-first, strict, explicit, maintainable code.
- Accessibility-aware React Native components.
- Small focused functions with meaningful names.
- `async` / `await` for async work.
- No production `console.log`, `debugger`, or `alert`.
- Prefer `for...of`, optional chaining, nullish coalescing, destructuring, and `const`.
- Validate structured data with Zod and Convex validators.

Primary quality commands:

```bash
bun run check
bun run fix
bun run check-types
```

## Solutions Made

### Mobile App

The main user-facing solution is the Expo app in `apps/native`.

Implemented surfaces include:

- Authentication and onboarding.
- Home dashboard.
- Trips list and manual trip creation.
- Trip workspace overview.
- Itinerary.
- Budget.
- Vault and TripSync review.
- Bookings.
- Readiness.
- Risks.
- Places.
- Companions.
- Notes.
- Moments.
- Travel Mode.
- Wrapped recap.
- Ask Viya AI chat.

Navigation uses Expo Router file-based routing:

- `apps/native/app/(auth)` for authentication screens.
- `apps/native/app/(app)/(tabs)` for the main tab shell.
- `apps/native/app/(app)/trips/[tripId]/*` for trip modules.
- `apps/native/app/(app)/ai.tsx` for the global Ask Viya screen.

### AI Workspace Agent

AI is implemented as a Convex backend capability rather than only client-side UI.

Important AI capabilities:

- Travel-only chat.
- One-question-at-a-time trip intake.
- Trip blueprint generation.
- Trip-scoped answers using workspace context.
- Structured itinerary generation.
- Budget suggestion generation.
- Readiness auditing.
- Risk detection.
- Vault extraction from uploaded file metadata and text context.
- Wrapped recap generation.
- Reviewable trip agent drafts before applying structured workspace changes.

AI code is concentrated in:

- `packages/backend/convex/agent.ts`
- `packages/backend/convex/chat.ts`
- `packages/backend/convex/ai/provider.ts`
- `packages/backend/convex/ai/prompts.ts`
- `packages/backend/convex/ai/features.ts`
- `packages/backend/convex/ai/structured.ts`
- `packages/backend/convex/ai/tripAgent.ts`
- `packages/backend/convex/ai/tripAgentInternals.ts`

### Shared Domain Logic

Shared business logic lives in `packages/domain`.

This package contains:

- Trip workspace types.
- Budget logic.
- Booking logic.
- Readiness scoring logic.
- Trip module constants.
- Zod schemas for structured AI outputs.
- Demo trip data and tests.

Keeping these contracts in a shared package helps the app and backend agree on data shapes.

### Backend Data Model

Convex is the backend database, serverless function layer, file storage layer, and realtime sync layer.

The schema is defined in `packages/backend/convex/schema.ts`.

Primary tables:

- `users`
- `userPreferences`
- `chatThreads`
- `chatQuestionPrompts`
- `trips`
- `itineraryDays`
- `itineraryItems`
- `savedPlaces`
- `readinessItems`
- `risks`
- `moments`
- `tripNotes`
- `tripCompanions`
- `vaultItems`
- `travelDocuments`
- `bookings`
- `expenses`
- `tripAgentDrafts`

Data is generally scoped by:

- `ownerId` for user-owned data.
- `tripId` for data attached to a trip.

### Authentication

Authentication uses Clerk on the native app and Convex auth on the backend.

Relevant files:

- `apps/native/src/features/auth/*`
- `packages/backend/convex/auth.config.ts`
- `packages/backend/convex/lib/auth.ts`
- `packages/env/src/native.ts`

Required public native environment variables:

- `EXPO_PUBLIC_CONVEX_URL`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

Required Convex auth environment variable:

- `CLERK_JWT_ISSUER_DOMAIN`

### Demo Stability and Fallbacks

The backend includes deterministic fallbacks so the app remains demonstrable without live AI keys.

Fallback behavior includes:

- Palawan demo data for itinerary, readiness, risk, and wrapped outputs.
- Singapore demo Vault extraction fixtures.
- Heuristic budget suggestions when no AI provider is configured.

Fallback files include:

- `packages/backend/convex/ai/fallbacks.ts`
- `packages/domain/src/demo/palawan.ts`
- `packages/backend/src/ai/singapore-demo-fixtures.ts`

## Infrastructure of the Code

### Repository Structure

```text
viya-app/
  apps/
    native/              Expo React Native mobile app
  packages/
    backend/             Convex backend, schema, auth, AI actions
    config/              Shared TypeScript configuration
    domain/              Shared domain models, schemas, and pure logic
    env/                 Runtime environment validation
  docs/                  Product, architecture, demo, and submission docs
  outputs/               Generated presentation and demo assets
```

### Monorepo Tooling

The repository is a Bun workspaces monorepo using Turborepo.

Root scripts:

```bash
bun install
bun run dev
bun run build
bun run check-types
bun run dev:native
bun run dev:server
bun run dev:setup
bun run check
bun run fix
```

Turborepo task configuration lives in `turbo.json`.

### Native App Configuration

Expo configuration lives in `apps/native/app.json`.

Important configuration:

- App name: `Viya`
- App slug: `viya`
- URL scheme: `viya-app`
- Android package: `com.vnajvngrd.viya`
- EAS project ID: `a886cc8e-2ed1-4bff-b4ca-652939f4b2cf`
- Typed routes enabled.
- React Compiler enabled.

EAS build profiles are defined in `apps/native/eas.json`:

- `development`: internal development client.
- `preview`: internal Android APK.
- `production`: production build with auto-incrementing app versions.

### TypeScript Configuration

Shared strict TypeScript settings live in `packages/config/tsconfig.base.json`.

Notable compiler settings:

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `isolatedModules: true`
- `moduleResolution: bundler`

### Testing

The repository contains approximately 100 test files across native feature contracts, backend contract tests, and domain logic.

Common validation commands:

```bash
bun run check-types
bun run check
bun test
```

Focused backend and domain tests live in:

- `packages/backend/test`
- `packages/domain/src/*.test.ts`
- `apps/native/src/features/**/*.test.mts`

## API and Third-Party Software Used

Versions are taken from the checked-in `package.json` files.

### Runtime and Build Tools

| Software | Version |
| --- | --- |
| Bun | `1.3.5` |
| TypeScript | `^6` |
| Turborepo | `^2.8.12` |
| Ultracite | `7.7.0` |
| Biome | `2.4.15` |
| Lefthook | `latest` |

### Mobile App

| Software | Version |
| --- | --- |
| Expo | `~56.0.3` |
| Expo Router | `~56.2.5` |
| React | `19.2.3` |
| React DOM | `19.2.3` |
| React Native | `0.85.3` |
| React Native Web | `~0.21.0` |
| Expo Auth Session | `~56.0.11` |
| Expo Constants | `~56.0.14` |
| Expo Document Picker | `~56.0.4` |
| Expo Font | `~56.0.5` |
| Expo Haptics | `~56.0.3` |
| Expo Image | `^56.0.9` |
| Expo Image Picker | `~56.0.12` |
| Expo Linear Gradient | `~56.0.4` |
| Expo Linking | `~56.0.11` |
| Expo Network | `~56.0.4` |
| Expo Secure Store | `~56.0.4` |
| Expo Speech Recognition | `^56.0.0` |
| Expo Splash Screen | `~56.0.9` |
| Expo Status Bar | `~56.0.4` |
| Expo Web Browser | `~56.0.5` |
| React Native Calendars | `1.1314.0` |
| React Native Gesture Handler | `~2.31.1` |
| React Native Keyboard Controller | `1.21.6` |
| React Native Maps | `1.27.2` |
| React Native Reanimated | `4.3.1` |
| React Native Safe Area Context | `~5.7.0` |
| React Native Screens | `4.25.1` |
| React Native SVG | `15.15.4` |
| React Native Worklets | `0.8.3` |

### UI and Styling

| Software | Version |
| --- | --- |
| HeroUI Native | `^1.0.3` |
| Uniwind | `^1.7.0` |
| Tailwind CSS | `^4.3.0` |
| Tailwind Merge | `^3.6.0` |
| Tailwind Variants | `^3.2.2` |
| Expo Vector Icons | `^15.1.1` |
| Gorhom Bottom Sheet | `^5.2.14` |

### Backend, Realtime, and Auth

| Software | Version |
| --- | --- |
| Convex | `^1.33.1` |
| Convex Helpers | `^0.1.118` |
| Convex Agent | `^0.3.2` |
| Clerk Expo | `^3.1.3` |
| T3 Env Core | `^0.13.1` |
| Dotenv | `^17.2.2` |
| Zod | `^4.1.13` |

### AI Providers and SDKs

| Software | Version |
| --- | --- |
| Vercel AI SDK `ai` | `^5.0.117` |
| `@ai-sdk/google` | `^2.0.52` |
| `@ai-sdk/openai-compatible` | `^1.0.25` |

Supported AI provider modes:

- OpenRouter-compatible API through `@ai-sdk/openai-compatible`.
- Google Generative AI through `@ai-sdk/google`.

Default AI model behavior:

- OpenRouter default: `openai/gpt-oss-120b:free`.
- Google default: `gemini-2.5-flash`.

AI provider environment variables:

- `AI_PROVIDER`
- `AI_MODEL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_MODEL`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `GOOGLE_GENERATIVE_AI_MODEL`
- Purpose-specific model overrides such as `AI_MODEL_CHAT`, `AI_MODEL_ITINERARY`, `AI_MODEL_READINESS`, `AI_MODEL_RISK`, `AI_MODEL_TRAVELMODE`, `AI_MODEL_MOMENTS`, `AI_MODEL_WRAPPED`, and `AI_MODEL_VAULT`.

### Location and External Data

The backend includes a location suggestions module in `packages/backend/src/location-suggestions.ts`.

Optional environment variable:

- `GEOAPIFY_API_KEY`

When this key is configured, location suggestions can use Geoapify-backed lookup behavior. The app should continue to handle unavailable location providers gracefully.

## Data Flow

### Authenticated App Flow

1. User opens the Expo app.
2. Clerk authenticates the user.
3. Convex receives the Clerk JWT identity.
4. Backend helpers map identity to user-owned records.
5. Native screens subscribe to Convex queries and call Convex mutations/actions.

### AI Trip Flow

1. User asks Viya a question or triggers a module generation action.
2. The native app calls Convex.
3. Convex gathers the current trip context.
4. The AI provider layer selects OpenRouter-compatible or Google model access.
5. AI output is validated with Zod schemas.
6. The backend returns either a structured draft, structured result, or deterministic fallback.
7. The UI presents the result for review or applies the confirmed update.

### Vault Flow

1. User uploads or links a travel file.
2. Convex stores file metadata and storage IDs in `vaultItems`.
3. AI extraction can classify the file and suggest related booking, document, budget, or readiness records.
4. The user reviews TripSync suggestions before accepting workspace changes.

## Security and Safety Notes

- User-owned data is scoped through Clerk identity and Convex auth helpers.
- Backend functions should not trust client-provided ownership when identity checks are available.
- AI does not silently apply destructive changes.
- AI output that affects workspace state is validated through shared schemas.
- AI responses are instructed not to fabricate confirmed bookings, prices, weather, safety status, or live availability.
- Public Expo variables are limited to values intended for the native client.
- Secret keys such as OpenRouter, Google Generative AI, Geoapify, and Clerk issuer configuration belong in backend or deployment environments.

## Generated Documentation Index

Related documentation already present in the repository:

- `README.md`
- `DESIGN.md`
- `docs/final-submission/readme/ARCHITECTURE_README.md`
- `docs/final-submission/readme/AI_INTEGRATION_README.md`
- `docs/final-submission/readme/TECH_STACK_README.md`
- `docs/final-submission/readme/SETUP_AND_TESTING_README.md`
- `docs/final-submission/readme/DATA_SECURITY_README.md`
- `docs/final-submission/readme/USER_FLOW_README.md`
- `docs/final-submission/readme/PRODUCT_README.md`
