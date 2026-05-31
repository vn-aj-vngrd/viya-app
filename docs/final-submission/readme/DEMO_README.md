# Viya Demo README

## Demo Scenario

The final demo scenario is a fictional Singapore Tech Week trip.

Trip profile:

- Destination: Singapore.
- Dates: September 28 to October 1, 2026.
- Purpose: group business-conference reward trip.
- Budget ceiling: PHP 90,000.
- Style: polished but not exhausting.
- Key modules: itinerary, budget, Vault, bookings, risks, readiness.

## Demo Prompt

```txt
Viya, plan my Singapore group business-conference reward trip. I'm going for Tech Week, want it polished but not exhausting, and I need the workspace to handle flights, hotel, event pass, budget, itinerary, readiness, and a little victory lap. Ask only what you need, then build the trip.
```

## Fixture Files

Fixture files live in `docs/demo/fixtures`:

- `singapore-flight-confirmation.txt`
- `singapore-hotel-voucher.txt`
- `singapore-tech-week-pass.txt`
- `singapore-expense-receipt.txt`
- `singapore-readiness-note.txt`

These files are demo proof, not real reservations.

## Simulator Screenshots

Original screenshots live in `docs/demo/screenshots`.

Final submission screenshots are copied to `docs/final-submission/assets/screenshots`.

The user guide PDF uses these real simulator surfaces:

- Getting started carousel.
- Sign-in sheet.
- Social sign-in permission prompt.
- Optional provider account picker and confirmation screen.
- Post-login Home dashboard.
- Home dashboard.
- Create trip flow.
- Ask Viya trip workspace screen.
- Singapore trip overview.
- Workspace switcher.
- Itinerary.
- Budget.
- Readiness.

## Demo Flow

1. Start on the getting-started carousel.
2. Tap Get started.
3. Sign in with Google, GitHub, or email.
4. For social sign-in, accept the provider permission if shown.
5. For email sign-in, enter the verification code sent by Clerk.
6. Return to Viya Home after authentication completes.
7. Show active trip and trip suggestions.
8. Create or open Singapore trip.
9. Show Overview.
10. Ask Viya to work on the trip.
11. Open Itinerary.
12. Open Budget.
13. Open Vault and sync fixture proof.
14. Open Readiness.
15. End with 100% ready.

## Guardrails

- Do not present fixture data as real bookings.
- Do not claim official legal or immigration advice.
- Do not imply AI silently updates user data.
- Keep Singapore as demo content only; the product should remain trip-agnostic.
