# Viya Setup And Testing README

## Install

From the repo root:

```bash
bun install
```

## Environment

The native app needs:

- `EXPO_PUBLIC_CONVEX_URL`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

The Convex backend may need:

- `CLERK_JWT_ISSUER_DOMAIN`
- AI provider keys such as `OPENROUTER_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`
- Optional location provider keys such as `GEOAPIFY_API_KEY`

## Local Development

Run backend setup if needed:

```bash
bun run dev:setup
```

Start the full development environment:

```bash
bun run dev
```

Start only the native app:

```bash
bun run dev:native
```

Start only Convex:

```bash
bun run dev:server
```

## Validation Commands

General checks:

```bash
bun run check-types
bun run check
```

Focused demo checks from existing docs:

```bash
bun test apps/native/src/features/trips/trip-dashboard-ai-demo-contract.test.mts packages/backend/test/singapore-demo-docs-contract.test.ts packages/backend/test/singapore-demo-fixtures.test.ts packages/backend/test/trip-vault-contract.test.ts packages/backend/test/trip-agent-draft-apply.test.ts
```

Convex type check:

```bash
bun x tsc -p packages/backend/convex/tsconfig.json --noEmit
```

## Build

Android preview APK from `apps/native`:

```bash
bun run build:preview
```

Local Android preview build:

```bash
bun run build:preview:local
```

## Regenerate Final User Guide

From the repo root:

```bash
/Users/vanajvanguardia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node docs/final-submission/scripts/generate-user-guide.mjs
```

