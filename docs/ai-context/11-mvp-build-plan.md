# 11 MVP Build Plan

## Purpose

This file defines what to build first and what to avoid.

The MVP should prove the full Viya story without overbuilding every feature.

## MVP principle

Build the smallest product that shows:

1. AI planning
2. Readiness scoring
3. Proactive fixes
4. Risk detection
5. Live travel assistance
6. Moments capture
7. Post-trip wrap-up

## MVP phase 1: Foundation

Goal: Create the app shell and visual foundation.

Build:

- Expo project with TypeScript
- Expo Router
- HeroUI Native setup
- Theme tokens
- App tabs
- Basic screen layouts
- Demo data seed
- Shared types
- Shared components

Do not build:

- Complex auth
- Payments
- Real booking integrations
- Advanced permissions

## MVP phase 2: Trip creation and dashboard

Goal: User can create or load a demo trip.

Build:

- Welcome screen
- Trip onboarding
- Create trip flow
- Demo trip shortcut
- Trip dashboard
- Trip header
- Next best action card
- Itinerary preview
- Readiness preview
- Risk preview

Definition of done:

- User can start the app and reach a trip dashboard.
- Dashboard clearly communicates Viya's value.

## MVP phase 3: AI itinerary generation

Goal: Generate and display a structured itinerary.

Build:

- AI itinerary prompt
- Structured JSON schema
- Generate itinerary action
- Save itinerary
- Itinerary screen
- Itinerary item cards
- Replan day placeholder/action

Fallback:

- Use deterministic demo itinerary if AI provider is unavailable.

Definition of done:

- User can generate or view a realistic Palawan itinerary.

## MVP phase 4: Readiness Score

Goal: Make preparedness visible.

Build:

- Readiness model
- Readiness scoring utility
- Readiness screen
- Category scores
- Missing items
- Readiness item checklist
- Dashboard score card

Definition of done:

- User understands what is missing and why it matters.

## MVP phase 5: Fix My Readiness

Goal: Turn gaps into action.

Build:

- Fix My Readiness AI prompt
- Suggested tasks
- Apply suggestions
- Update readiness score
- Clear before/after demo moment

Definition of done:

- User taps one button and sees concrete improvements.

## MVP phase 6: Risk Radar

Goal: Show proactive AI monitoring.

Build:

- Risk model
- Risk detection prompt
- Risk Radar screen
- Risk severity cards
- Suggested actions
- Dashboard risk preview

Definition of done:

- User sees risks before they become problems.

## MVP phase 7: Travel Mode

Goal: Keep Viya useful during the trip.

Build:

- Current day view
- Now/next activity
- Quick actions
- Booking quick access placeholder
- Replan today action
- Delay/weather demo scenario

Definition of done:

- User can see what to do now and how to adjust.

## MVP phase 8: Moments

Goal: Capture emotional trip value.

Build:

- Add moment
- List moments
- AI caption generation
- Highlight moments
- Daily summary placeholder

Definition of done:

- User can save a memory and get a shareable caption.

## MVP phase 9: Viya Wrapped

Goal: End the demo with a memorable recap.

Build:

- Wrapped summary generator
- Wrapped screen
- Trip stats
- Best moments
- Travel personality
- Shareable cards
- Next trip suggestions

Definition of done:

- Demo ends with a strong emotional product moment.

## Build order

1. Foundation
2. Design system implementation
3. Demo data
4. Trip dashboard
5. Itinerary
6. Readiness
7. Fix My Readiness
8. Risk Radar
9. Travel Mode
10. Moments
11. Wrapped
12. Polish

## Do not build yet

- Payments
- Real hotel booking marketplace
- Real-time chat
- Complex social feeds
- Admin dashboard
- Full offline sync
- Multi-provider booking ingestion
- Complex expense splitting
- Public profile system
- Advanced analytics dashboard

## Demo reliability rule

For hackathon demos, reliability is more important than perfect live AI.

Use a hybrid approach:

- Live AI for simple generation if stable.
- Cached deterministic responses for critical demo moments.
- Clear demo seed data.

## Final MVP success criteria

The MVP is successful if a user can understand in under 2 minutes:

- Viya plans the trip.
- Viya checks readiness.
- Viya finds risks.
- Viya helps fix issues.
- Viya assists during travel.
- Viya turns the trip into memories afterward.
