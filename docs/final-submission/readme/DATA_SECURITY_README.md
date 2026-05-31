# Viya Data And Security README

## Authentication

Viya uses Clerk for authentication in the Expo app. The root app layout wraps the native app with `ClerkProvider` and Convex integration through `ConvexProviderWithClerk`.

Backend functions should derive the active user from Convex auth identity and avoid trusting client-provided ownership fields.

## Data Scope

Important data tables are scoped by:

- `ownerId` for user-level records.
- `tripId` for records attached to a trip.

Examples:

- Trips belong to an owner.
- Vault items belong to an owner and can attach to a trip.
- Itinerary days, itinerary items, bookings, readiness items, risks, notes, companions, and moments attach to a trip.

## Files And Vault

Vault files are stored through Convex storage and represented by `vaultItems`. A Vault item can link to extracted bookings, documents, expenses, or other trip records.

TripSync-style extraction should be reviewable before saving meaningful workspace changes.

## AI Safety Notes

AI output should be treated as assistance, not authority.

Product guardrails:

- The user reviews changes before applying them.
- Travel requirements should be framed as checks, not official legal advice.
- The system should avoid inventing confirmed bookings or uploaded proof.
- Demo fixture extraction is deterministic for known filenames and should not be confused with real booking validation.

## Demo Data

Singapore fixture files are fictional and for demonstration only.

Do not submit real passports, IDs, payment cards, or sensitive documents to the demo environment unless production-grade handling and policy coverage are in place.

