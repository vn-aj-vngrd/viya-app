# Viya AI Integration README

## AI Product Role

AI in Viya is not only a chat box. It helps create, inspect, and connect trip workspace modules.

AI responsibilities:

- Ask focused follow-up questions.
- Generate itinerary drafts.
- Suggest budget amounts.
- Extract structured data from Vault uploads.
- Audit readiness.
- Detect risks.
- Draft recap and wrapped summaries.
- Answer trip-scoped questions using workspace context.

## Provider Layer

AI provider selection lives in `packages/backend/convex/ai/provider.ts`.

Supported provider modes:

- OpenRouter-compatible provider through `@ai-sdk/openai-compatible`.
- Google provider through `@ai-sdk/google`.

Environment variables:

- `AI_PROVIDER`
- `AI_MODEL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_MODEL`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `GOOGLE_GENERATIVE_AI_MODEL`
- Optional purpose-specific keys such as `AI_MODEL_CHAT`, `AI_MODEL_ITINERARY`, `AI_MODEL_READINESS`, and related variants.

Default model behavior:

- OpenRouter defaults to `openai/gpt-oss-120b:free` if no model is supplied.
- Google defaults to `gemini-2.5-flash`.

## Structured Outputs

AI actions use shared schemas from `packages/domain` to validate generated objects.

Examples:

- `generatedItinerarySchema`
- `budgetSuggestionSchema`
- `vaultExtractionSchema`
- `readinessAiOutputSchema`
- `detectedRisksSchema`
- `wrappedSummarySchema`

Structured generation is important because outputs are applied to workspace records, not only rendered as prose.

## Fallbacks

Viya includes fallback behavior for demo stability:

- If no AI provider is configured, actions return deterministic fallback data.
- Known Singapore fixture files return deterministic Vault extraction results.
- Palawan demo data supports fallback itinerary, readiness, risk, and wrapped outputs.

This keeps the product demo testable even when live AI keys are unavailable.

## Reviewable Changes

The intended AI contract is:

1. Generate or analyze.
2. Show a reviewable draft or explanation.
3. Let the user apply, edit, or ignore.
4. Update structured workspace records only after confirmation.

That pattern keeps AI useful without making silent destructive changes.

