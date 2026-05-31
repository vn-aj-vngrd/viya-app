# Viya Tech Stack README

## Repository Shape

Viya is a Bun workspaces monorepo.

```txt
viya-app/
  apps/native/          Expo React Native app
  packages/backend/     Convex backend functions, schema, and AI actions
  packages/domain/      Shared domain types, schemas, and pure logic
  packages/config/      Shared TypeScript config
  packages/env/         Environment validation
  docs/                 Product, demo, and submission docs
```

## Core Stack

- Bun `1.3.5` package manager.
- TypeScript `^6`.
- Expo `~56.0.3`.
- Expo Router `~56.2.5`.
- React `19.2.3`.
- React Native `0.85.3`.
- Convex `^1.33.1`.
- Clerk Expo `^3.1.3`.
- HeroUI Native `^1.0.3`.
- Uniwind `^1.7.0`.
- Tailwind CSS `^4.3.0`.
- Zod `^4.1.13`.
- AI SDK `^5`.
- Ultracite `7.7.0` with Biome `2.4.15`.
- Turborepo `^2.8.12`.

## Important Scripts

Run from the repo root unless noted:

```bash
bun install
bun run dev
bun run dev:native
bun run dev:server
bun run check-types
bun run check
bun run fix
```

Native app scripts are in `apps/native/package.json`:

```bash
bun run dev
bun run ios
bun run android
bun run web
bun run build:preview
```

## App Configuration

- Expo config: `apps/native/app.json`.
- EAS config: `apps/native/eas.json`.
- Root package scripts: `package.json`.
- Ultracite and Biome config: `biome.json`.
- TypeScript roots: `tsconfig.json`, `packages/config/tsconfig.base.json`.

