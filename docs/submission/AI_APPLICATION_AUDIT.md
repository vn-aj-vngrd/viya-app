# Viya AI Application Audit

## Product

Viya is an AI travel workspace that turns a trip idea into a prepared trip workspace. The current demo focuses on this flow:

1. Home dashboard and trip suggestions.
2. AI chat for asking and refining trip decisions.
3. Create trip from guided answers.
4. Generate itinerary.
5. Track budget.
6. Organize Vault documents.
7. Finish with readiness checks.

The Singapore group reward trip is demo data only. The product behavior is intended to stay trip-agnostic.

## Instructions Used

- Build a written product pitch for the New Product Idea Challenge.
- Keep the pitch within the required sections: product name/tagline, problem, solution, AI tools used, target user/market, and how to use the product.
- Use actual simulator screenshots instead of fake mockups.
- Avoid live-pitch wording; make the deck work as a written submission.
- Keep the visual direction minimal, Apple-inspired, clean, and consistent with the mobile app.
- Do not hardcode Singapore as the product path; use Singapore only as the demo scenario.
- End the product story in readiness.

## Solution Made

- Created a pitch deck that uses the working Viya simulator state as visual proof.
- Prepared Singapore demo fixture documents for flight, hotel, event pass, expense, and readiness notes.
- Documented the happy path from onboarding to a 100% ready workspace.
- Documented validation steps for code checks and iOS Simulator review.
- Updated the pitch story to focus on Home, AI chat, trip creation, itinerary, budget, Vault, and readiness.
- Added evidence-backed target market framing for practical travelers who need confidence before travel day.

## Code Infrastructure

- Monorepo package manager: Bun `1.3.5`.
- Runtime checked locally: Node.js `v22.14.0`.
- Repo branch during audit: `van/viya-mvp-core-foundation`.
- Repo commit during audit: `9885bcc`.
- App workspace: Expo React Native app in `apps/native`.
- Backend workspace: Convex backend in `packages/backend`.
- Domain schemas and shared types: `packages/domain`.
- Config and environment packages: `packages/config`, `packages/env`.

## Core App Stack

- Expo `~56.0.3`
- Expo Router `~56.2.5`
- React `19.2.3`
- React Native `0.85.3`
- Convex `^1.33.1`
- `@convex-dev/agent` `^0.3.2`
- AI SDK `^5.0.117`
- Zod `^4.1.13`
- TypeScript `^6`
- Ultracite `7.7.0`
- Biome `2.4.15`
- HeroUI Native `^1.0.3`
- Uniwind `^1.7.0`
- Tailwind CSS `^4.3.0`
- Clerk Expo `^3.1.3`

## AI And Third-Party Software Used

- Codex: implementation support, code navigation, fixes, validation, demo docs, and pitch artifacts.
- Agent Skills: planning, presentation creation, verification, and product workflow refinement.
- Claude Code: coding-agent workflow for review and improvement loops.
- OpenCode: coding-agent workflow support.
- ChatGPT: product reasoning, prompt refinement, pitch language, and demo story.
- Claude: critique partner for positioning, UX review, and specificity checks.
- OpenRouter-compatible AI provider support: configured through `@ai-sdk/openai-compatible` `^1.0.25`.
- Google AI provider support: configured through `@ai-sdk/google` `^2.0.52`.
- Default OpenRouter model fallback in code: `openai/gpt-oss-120b:free`.
- Default Google model fallback in code: `gemini-2.5-flash`.

## Local Demo Artifacts

- Pitch deck: `outputs/manual-viya-pitch/presentations/viya-product-challenge/output/viya-product-challenge-pitch.pptx`
- Pitch preview sheet: `outputs/manual-viya-pitch/presentations/viya-product-challenge/qa/contact-sheet.png`
- Demo happy path: `docs/demo/ai-workspace-happy-path.md`
- Demo prompts: `docs/demo/prompts.md`
- Demo validation checklist: `docs/demo/validation-checklist.md`
- Demo fixture files: `docs/demo/fixtures/`
- Actual simulator screenshots: `docs/demo/screenshots/`

## Validation Commands

```bash
bun test apps/native/src/features/trips/trip-dashboard-ai-demo-contract.test.mts packages/backend/test/singapore-demo-docs-contract.test.ts packages/backend/test/singapore-demo-fixtures.test.ts packages/backend/test/trip-vault-contract.test.ts packages/backend/test/trip-agent-draft-apply.test.ts
bun x tsc -p packages/backend/convex/tsconfig.json --noEmit
bun x ultracite check apps/native/src/features/trips/trip-dashboard-components.tsx apps/native/src/features/vault/tripsync-review-sheet.tsx packages/backend/convex/ai/features.ts packages/backend/convex/vault.ts packages/backend/test/trip-vault-contract.test.ts packages/domain/src/schemas/vault.ts apps/native/src/features/trips/trip-dashboard-ai-demo-contract.test.mts packages/backend/src/ai/singapore-demo-fixtures.ts packages/backend/test/singapore-demo-docs-contract.test.ts packages/backend/test/singapore-demo-fixtures.test.ts
```

## Fairness And Demo Notes

- Singapore trip records are fictional and should not be presented as real reservations.
- Fixture extraction is deterministic for known demo filenames so the demo can run without live AI keys.
- Live AI providers are supported, but the demo must still work in fallback mode.
- Viya should not invent uploaded documents, confirmed proof, live weather, traffic, or availability.
