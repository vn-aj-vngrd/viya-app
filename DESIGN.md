---
name: Viya Mobile Design System
version: 0.2.0
status: draft
source: /Users/vanajvanguardia/Downloads/viya_heroui_mobile_design.md
platforms:
  - ios
  - android
  - web
frameworks:
  - Expo
  - React Native
  - HeroUI Native
description: HeroUI Pro-inspired island UI for Viya mobile screens.
colors:
  app:
    value: "#F4F4F5"
    role: Primary app canvas. Never use pure white as the full-page default.
  app-alt:
    value: "#F7F7F8"
    role: Lighter nested app area and quiet empty states.
  surface:
    value: "#FFFFFF"
    role: Floating island cards, form panels, bottom action islands.
  surface-muted:
    value: "#FAFAFA"
    role: Inner chips, nested rows, subtle grouped content.
  foreground:
    value: "#18181B"
    role: Primary text and high-emphasis icons.
  muted:
    value: "#71717A"
    role: Secondary text, inactive controls, helper copy.
  subtle:
    value: "#A1A1AA"
    role: Metadata, inactive dots, quiet dividers.
  border:
    value: "rgba(24, 24, 27, 0.08)"
    role: Very soft island separation.
  viya-blue:
    value: "#0A84FF"
    role: Primary actions, selected state, AI guidance.
  viya-mint:
    value: "#30D158"
    role: Completed readiness, safe status, confirmed tasks.
  viya-orange:
    value: "#FF9F0A"
    role: Pending preparation, warnings, travel risk.
  viya-red:
    value: "#FF453A"
    role: Urgent blockers and failed checks.
  viya-purple:
    value: "#BF5AF2"
    role: Memories, Wrapped, AI-generated highlights.
typography:
  font-family:
    value: system
    role: Platform-native typography through React Native.
  hero:
    fontSize: 34
    lineHeight: 40
    fontWeight: 700
    role: Onboarding and primary trip moments only.
  title1:
    fontSize: 28
    lineHeight: 34
    fontWeight: 700
    role: Screen titles and major island values.
  title2:
    fontSize: 22
    lineHeight: 28
    fontWeight: 600
    role: Card titles and secondary screen titles.
  body:
    fontSize: 16
    lineHeight: 24
    fontWeight: 400
    role: Primary explanatory copy.
  callout:
    fontSize: 15
    lineHeight: 21
    fontWeight: 400
    role: Compact feature descriptions and AI suggestions.
  caption:
    fontSize: 13
    lineHeight: 18
    fontWeight: 500
    role: Chips, metadata, lifecycle labels.
spacing:
  screenX: 16
  sectionGap: 16
  cardPadding: 20
  bottomActionPadding: 16
radius:
  sm: 12
  md: 16
  lg: 20
  xl: 24
  island: 28
  sheet: 32
  pill: 999
shadows:
  soft:
    shadowColor: "#000000"
    shadowOpacity: 0.06
    shadowRadius: 18
    shadowOffset:
      width: 0
      height: 8
    elevation: 3
  floating:
    shadowColor: "#000000"
    shadowOpacity: 0.10
    shadowRadius: 24
    shadowOffset:
      width: 0
      height: 12
    elevation: 6
components:
  screen-header: Native title row with optional circular icon actions.
  island-card: White rounded card on soft app canvas with subtle shadow.
  primary-island: One dominant card per main screen.
  compact-list-card: White list island with internal dividers, not row borders.
  search-command-island: Rounded white search or AI command input.
  bottom-action-island: Sticky bottom action area for the primary next step.
  ai-suggestion-card: One actionable Viya recommendation.
onboarding:
  maxScreens: 10
  structure: One welcome/action screen followed by nine fixed-height lifecycle carousel screens.
  lifecycle:
    - Welcome
    - Dream
    - Plan
    - Book
    - Sync
    - Prepare
    - Travel
    - Track
    - Capture
    - Wrap Up
---

# Viya Mobile Design System

## Design Intent

Viya should feel like a premium mobile travel companion: calm, native, modern, and polished. The design direction follows a HeroUI Pro-inspired island UI pattern: soft non-white canvas, floating white content surfaces, large rounded cards, subtle elevation, compact typography, and native-feeling controls.

This is not a web dashboard compressed into mobile. Every screen should feel like a focused mobile workflow for planning, readiness, TripSync, Travel Mode, alerts, moments, and wrap-up.

## Core Visual Formula

Use three layers:

1. **Soft app canvas**: `#F4F4F5` background, never full-white pages.
2. **Floating white islands**: primary cards, auth forms, trip cards, bottom actions, and AI suggestions.
3. **Quiet interaction details**: compact chips, circular icon buttons, dividers inside cards, and one obvious next action.

Default structure:

```text
Soft App Canvas
  -> Floating Header / Search / Status Island
    -> Content Cards
      -> Compact Native Actions
```

## Layout Rules

- Screen padding is 16px horizontally.
- Use one visually dominant primary island per main screen.
- Use 24-32px radii for top-level surfaces.
- Use 16-20px radii only inside nested content.
- Keep rows at least 56px tall when they are tappable.
- Use bottom action islands for clear next steps.
- Avoid dense dashboards, heavy borders, and web-style navbars inside mobile screens.

Recommended frame:

```tsx
<SafeAreaView className="flex-1 bg-background">
  <ScrollView contentContainerClassName="px-4 pb-28">
    <ScreenHeader />
    <PrimaryIsland />
    <ContentSection />
  </ScrollView>
  <BottomActionIsland />
</SafeAreaView>
```

## Component Patterns

### Screen Header Island

Use native headers with strong title copy and circular white icon actions. Do not wrap every header in a card unless the header itself is an interactive search/status island.

### Primary Island Card

Each main screen should have one hero island: current trip, readiness score, Travel Mode status, today's plan, TripSync state, or Viya briefing.

Rules:

- Keep it visually dominant.
- Use `surface` background and soft shadow.
- Use accent color sparingly for progress, selected state, or AI.
- Avoid multiple equal-weight hero cards.

### Compact List Cards

Use list cards for itinerary, tasks, risks, and recommendations.

Rules:

- Dividers live inside the card.
- Do not put borders around every row.
- Status chips should be subtle and compact.

### Search / Command Island

Planning and AI entry points should use a white rounded command island: "Ask Viya to plan your trip", "Search places", "Find restaurants near my itinerary", or "Generate a 3-day plan".

### Bottom Action Island

Use a sticky bottom island when there is an obvious next step: Start planning, Fix readiness, Sync trip, Start Travel Mode, Generate recap, Save itinerary.

Rules:

- Use dark bottom island treatment for the strongest CTA.
- Use white bottom island treatment for secondary control groups.
- Do not show more than two actions.

### AI Suggestion Card

AI cards should feel helpful, not noisy.

Rules:

- Use sparkles only for true AI-generated assistance.
- Keep the suggestion action-oriented.
- Show one main suggestion per card.

## Screen Applications

### Home / Trip Dashboard

Show what matters now: greeting, current trip island, readiness island, upcoming timeline card, Viya suggestion card, and a bottom CTA to plan or continue.

### Planning

Make planning conversational but structured: header, search/ask island, trip goal chips, generated itinerary cards, recommendations, and Save Plan CTA.

### Readiness

Make preparation measurable and fixable: hero score island, category list, critical fixes, AI auto-fix suggestion, and Fix My Readiness CTA.

### TripSync

Coordinate people and tasks without looking like project management software: group status island, member readiness rows, shared tasks, missing items, and Notify Group CTA.

### Travel Mode

Focus on the immediate trip state: Now island, next step card, map/transport card, risk radar, and quick actions for Ask Viya, Translate, Navigate, Emergency Info, and Save Moment.

### Moments / Wrap-Up

Use purple accent sparingly for celebration: trip summary island, highlights carousel, AI captions, stats, and Generate Shareable Post CTA.

## Auth & Onboarding

- Onboarding uses 10 screens: one welcome/action screen and nine lifecycle carousel screens.
- The welcome screen introduces Viya with the tagline `Travel, one step ahead`.
- The welcome primary action is `Start with Viya`; the secondary action is `Sign in`.
- Lifecycle screens are Dream, Plan, Book, Sync, Prepare, Travel, Track, Capture, and Wrap Up.
- The final lifecycle CTA is `Plan my first trip`; the secondary action is `Explore demo trip`.
- Keep Viya wordmark plain for now.
- Use a white island card for the active lifecycle step.
- Use a dark rounded bottom action for primary progression.
- Sign-in and sign-up use one white auth island on the soft canvas.
- Social auth appears before email auth.
- Email/password remains available in the same focused island.
- Verification screens reuse the same shell and status message island.

## Motion

Use subtle motion only when it clarifies state:

- Card press scales to 0.98.
- Bottom sheets spring up.
- Score progress animates from 0 to value.
- AI suggestion fades and slides up.
- TripSync updates pulse gently.

Avoid animated backgrounds, long transitions, and multiple simultaneous effects.

## Reusable Component Direction

Create app-level components by composing HeroUI Native primitives:

- `AppScreen`
- `ScreenHeader`
- `IslandCard`
- `PrimaryTripCard`
- `ReadinessScoreCard`
- `ViyaSuggestionCard`
- `TripTimelineCard`
- `TripSyncMemberRow`
- `RiskRadarCard`
- `BottomActionIsland`
- `StatusChip`
- `PhaseChip`
- `MetricPill`

These components should wrap `Card`, `Surface`, `Button`, `Chip`, `Input`, `SearchField`, `BottomSheet`, and other HeroUI Native primitives. Do not rebuild common controls from scratch.

## Do / Don't

Do:

- Use soft gray app backgrounds.
- Use white cards as islands.
- Keep cards rounded and spacious.
- Use native-feeling controls.
- Make AI suggestions clear and actionable.
- Use bottom actions for primary flows.
- Keep each screen focused on one main job.

Don't:

- Use pure white page backgrounds everywhere.
- Add heavy shadows or thick borders.
- Use too many gradients.
- Turn every AI output into chat bubbles.
- Overload screens with dashboard widgets.
- Create custom components when HeroUI Native already provides one.
- Make the UI look like a web admin panel.

## Agent Prompt Guide

> Build a native-feeling travel companion using a soft gray app canvas, white floating island cards, large rounded corners, subtle shadows, compact typography, and HeroUI Native components. Each screen should feel calm, intelligent, and premium. Viya's AI should appear as proactive, action-oriented cards and bottom-sheet guidance, not only as a chat interface.
