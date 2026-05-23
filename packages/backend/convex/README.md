# Viya Convex Backend

Convex owns Viya's authenticated data boundary: users, trips, itinerary, readiness, risks, moments,
bookings, travel documents, and Vault files.

## Auth

Clerk identities are read through `ctx.auth.getUserIdentity()`. Use helpers in `convex/lib/auth.ts`
for required identity, user synchronization, and trip ownership checks before returning or mutating
trip-scoped data.

## AI Provider

The AI layer is centralized under `convex/ai`. Use `getLanguageModel()` for model selection and the
structured helpers for itinerary, readiness, risk, and wrapped features. OpenRouter is the default
provider when `OPENROUTER_API_KEY` is configured, with `AI_MODEL_*` environment variables available
per feature.

Streaming chat continues through `@convex-dev/agent`; structured feature generation uses the Vercel
AI SDK so providers can be swapped without touching feature code.

## Storage

Vault uploads use Convex storage. Clients request `vault.generateUploadUrl`, upload the file, then
persist scoped metadata through `vault.saveVaultItem`.
