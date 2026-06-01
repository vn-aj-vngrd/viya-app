# Viya

Viya is an AI-powered travel workspace that helps a traveler move from a loose trip idea to a prepared trip. It combines trip creation, itinerary planning, Vault documents, budget tracking, readiness checks, and a trip-aware AI assistant in one mobile app.

The core product shift is simple: Viya is not only an itinerary generator. It keeps the plan, proof, spend, and readiness connected so the traveler can see what is ready and what still needs attention.

## Product Highlights

- **Guided onboarding** - captures travel vibe, pace, budget comfort, interests, food style, travel group, suggestion style, and needs.
- **Manual trip creation** - creates a structured trip workspace from destination, dates, travelers, style, pace, and budget.
- **Trip workspace** - connects the main travel modules: Itinerary, Budget, Vault, and Readiness.
- **Ask Viya** - trip-scoped AI that can answer questions, generate itinerary drafts, organize Vault work, sync budget context, and audit readiness.
- **Vault + TripSync** - stores confirmations, receipts, documents, and notes so AI can ground planning in reviewed evidence.
- **Budget tracking** - keeps the trip budget visible and ties spend back to uploaded receipts or confirmed costs.
- **Readiness** - turns scattered travel prep into a checklist and score so the trip can end in a prepared state.

## Demo Flow

The current demo walks through:

1. Get Started
2. Google login
3. Onboarding questions
4. Home dashboard
5. Trip tab to New Trip
6. Singapore trip creation
7. Trip workspace tour
8. Itinerary, Vault, Budget, and Readiness modules
9. Ask Viya inside the trip

## Submission Artifacts

- [Viya User Guide PDF](docs/final-submission/Viya%20User%20Guide.pdf)
- [Features PDF](docs/demo/recording-guide/features.pdf)
- [Demo PDF](docs/demo/recording-guide/demo.pdf)
- [Source Code Link](docs/final-submission/source_code.md)
- [Final Submission README](docs/final-submission/README.md)
- [AI Integration README](docs/final-submission/readme/AI_INTEGRATION_README.md)
- [Architecture README](docs/final-submission/readme/ARCHITECTURE_README.md)
- [Setup and Testing README](docs/final-submission/readme/SETUP_AND_TESTING_README.md)

## Tech Stack

- **Mobile:** Expo + React Native
- **Backend:** Convex
- **Authentication:** Clerk
- **Language:** TypeScript
- **Monorepo:** Turborepo
- **Formatting/linting:** Ultracite / Biome
- **Runtime:** Bun

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Convex Setup

This project uses Convex as a backend. You'll need to set up Convex before running the app:

```bash
bun run dev:setup
```

Follow the prompts to create a new Convex project and connect it to your application.

Copy environment variables from `packages/backend/.env.local` to `apps/*/.env`.

### Clerk Authentication Setup

- Follow the guide: [Convex + Clerk](https://docs.convex.dev/auth/clerk)
- Set `CLERK_JWT_ISSUER_DOMAIN` in Convex Dashboard
- Set `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `apps/native/.env`

Then, run the development server:

```bash
bun run dev
```

Use the Expo Go app to run the mobile application.
Your app will connect to the Convex cloud backend automatically.

## Git Hooks and Formatting

- Format and lint fix: `bun run check`

## Project Structure

```
viya-app/
├── apps/
│   ├── native/      # Mobile application (React Native, Expo)
├── packages/
│   ├── backend/     # Convex backend functions and schema
│   │   ├── convex/    # Convex functions and schema
│   │   └── .env.local # Convex environment variables
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:setup`: Setup and configure your Convex project
- `bun run check-types`: Check TypeScript types across all apps
- `bun run dev:native`: Start the React Native/Expo development server
- `bun run check`: Run Biome formatting and linting

## Validation

Run from the repository root:

```bash
bun x ultracite check
bun x tsc -p apps/native/tsconfig.json --noEmit
bun x tsc -p packages/backend/convex/tsconfig.json --noEmit
```

## Source Code

[https://github.com/vn-aj-vngrd/viya-app](https://github.com/vn-aj-vngrd/viya-app)
