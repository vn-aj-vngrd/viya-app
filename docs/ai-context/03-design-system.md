# Viya Design System Blueprint

## 0. Purpose

This document is the extended design implementation guide for building **Viya**, an AI travel operations companion. The root `DESIGN.md` file is the Stitch-style machine-readable design source of truth, with YAML tokens and concise design rationale. This file expands that guidance for AI coding agents, Codex, Cursor, Claude Code, or any developer implementing the mobile UI.

The goal is to keep the Viya app visually consistent, simple, premium, and native-feeling while avoiding custom component overengineering.

Viya should follow the **HeroUI Pro-inspired island UI direction** defined in `/Users/vanajvanguardia/Downloads/viya_heroui_mobile_design.md` and summarized in the root `DESIGN.md`: soft non-white app canvas, white floating island cards, large rounded corners, subtle elevation, compact typography, and native mobile controls.

Viya should use **HeroUI Native components** as the default component system. Do not rebuild standard UI primitives unless there is a strong product reason.

Viya should also follow the public HeroUI Pro product language where possible: polished defaults, composable production-ready blocks, token-led styling, consistent spacing rhythm, and mobile surfaces that feel complete without custom visual noise. Do not import paid HeroUI Pro packages unless they are installed and licensed; approximate the pattern with HeroUI Native OSS primitives.

---

# 0.1 HeroUI Pro Island UI Direction

Every mobile screen should follow this visual formula:

```text
Soft App Canvas
  -> Floating Header / Search / Status Island
    -> Content Cards
      -> Compact Native Actions
```

Use these active tokens:

- App canvas: `#F4F4F5`
- Surface: `#FFFFFF`
- Surface muted: `#FAFAFA`
- Foreground: `#18181B`
- Muted: `#71717A`
- Subtle: `#A1A1AA`
- Border: `rgba(24, 24, 27, 0.08)`
- Viya blue/accent: `#0A84FF`
- Success/mint: `#30D158`
- Warning/orange: `#FF9F0A`
- Danger/red: `#FF453A`
- Insight/purple: `#BF5AF2`

Rules:

1. Do not use pure white as the full-screen background.
2. Use white floating islands for primary content, forms, trip cards, AI suggestions, and bottom actions.
3. Use 24-32px radii for major islands and 16-20px radii for nested content.
4. Use very soft shadows on major islands; avoid thick borders.
5. Put obvious next actions in sticky bottom action islands.
6. Use circular icon buttons for header actions.
7. Keep each screen focused on one main job.
8. Viya AI should appear as proactive, action-oriented cards and bottom-sheet guidance, not only chat bubbles.

---

# 1. Design North Star

## Product Feel

Viya should feel like:

- A calm personal travel companion
- A premium iOS-first travel operating system
- A proactive AI assistant that reduces stress
- A clean productivity app with emotional travel moments
- Minimal, elegant, and intentional

## Design Keywords

- Simple
- Minimalist
- Elegant
- Calm
- Premium
- Native
- Spacious
- Helpful
- Proactive
- Personal
- Trustworthy

## Visual Inspiration

Follow a HeroUI Pro mobile preview language:

- Soft gray app canvas
- Floating white islands
- Large rounded surfaces
- Compact native typography
- Circular icon actions
- Sticky bottom action islands
- Minimal accent color usage
- Clear calls to action
- Calm motion

Avoid:

- Overly colorful dashboards
- Heavy gradients everywhere
- Busy cards
- Dense travel agency layouts
- Generic SaaS UI
- Too many icons on screen
- Complex custom controls
- Decorative elements that do not support the task
- Pure white full-screen backgrounds

---

# 2. Core Design Principle

## The Interface Should Make Travel Feel Manageable

Every screen should answer one of these questions clearly:

1. What is happening now?
2. What should I do next?
3. What is missing?
4. What could go wrong?
5. How can Viya help me fix it?

The app should not only look beautiful. It should reduce cognitive load.

---

# 3. Component Strategy

## Use HeroUI Native First

Use HeroUI Native components by default for common UI primitives.

Preferred components:

- `Button`
- `Card`
- `Surface`
- `Text`
- `Input`
- `TextField`
- `TextArea`
- `SearchField`
- `Select`
- `Checkbox`
- `Switch`
- `Slider`
- `Tabs`
- `ListGroup`
- `Accordion`
- `BottomSheet`
- `Dialog`
- `Popover`
- `Toast`
- `Alert`
- `Skeleton`
- `SkeletonGroup`
- `Spinner`
- `Avatar`
- `Chip`
- `Separator`
- `ScrollShadow`
- `PressableFeedback`

## HeroUI Pro-Inspired Auth Pattern

Auth and onboarding should be built as polished product surfaces, not plain forms.

Use this structure:

1. Product-first onboarding with a welcome/action screen followed by nine fixed-height lifecycle carousel screens.
2. Social auth provider buttons before email.
3. Email/password form inside a focused card.
4. Quiet secondary links for sign-in/sign-up switching.
5. Verification screens with the same shell and calmer copy.
6. Auth and onboarding surfaces use the island pattern: soft canvas, white form/lifecycle island, large 28px radius, subtle shadow, compact copy, and a bottom action.

Use HeroUI Native primitives for these surfaces:

- `Card` for white island form panels and primary previews.
- `Surface` for nested metrics, timeline rows, and AI callouts.
- `Chip` for status labels like readiness, risks, and Vault.
- `Button` with `outline` for Google and GitHub provider actions.
- `Button` with `primary` for the single main CTA.

Avoid:

- Equal-weight feature grids on onboarding.
- Long onboarding product tours before the user can act.
- Fake dashboard previews or status badges before sign-in.
- Icons before the auth wordmark; use plain `Viya` branding for now.
- Large empty header regions.
- Decorative gradients or blobs.
- Multiple primary buttons in one section.
- Form screens that omit the product promise.
- Blue or purple gradients as background decoration.

Onboarding screens should cover the full product lifecycle:

1. Welcome: introduce Viya with `Travel, one step ahead`; primary `Start with Viya`, secondary `Sign in`.
2. Dream: travel goal chat, mood, destination, budget, and timing.
3. Plan: Trip Blueprint with route, dates, budget allocation, itinerary style, requirements, risks, and next actions.
4. Book: guide what to book first using preferred external apps or sites.
5. Sync: upload confirmations, receipts, screenshots, and documents into Trip Vault.
6. Prepare: readiness checks for documents, bookings, packing, budget, weather, transport, local requirements, and emergency coverage.
7. Travel: Now / Next / Watch Out guidance, reminders, alerts, document lookup, and ad-hoc answers.
8. Track: budget, expenses, and pocket money.
9. Capture: photos, notes, receipts, ratings, tips, and memories.
10. Wrap Up: shareable trip story, insights, recap, and reusable template.

The final screen primary CTA should be `Plan my first trip`; secondary should be `Explore demo trip`.

## Rule

Do not rebuild buttons, cards, sheets, dialogs, alerts, chips, skeletons, tabs, or inputs from scratch.

Create custom components only by composing HeroUI Native primitives.

Examples:

- `ReadinessScoreCard` should compose `Card`, `Text`, `Chip`, `Button`, and custom progress visualization.
- `RiskAlertCard` should compose `Alert`, `Card`, `Chip`, and `Button`.
- `ViyaSuggestionSheet` should compose `BottomSheet`, `Text`, `ListGroup`, and `Button`.
- `TripActionButton` should wrap HeroUI `Button`, not replace it.

---

# 4. Design System Rules for AI Coding Agents

When generating UI code:

1. Prefer HeroUI Native components before custom React Native primitives.
2. Use composition over custom styling-heavy components.
3. Keep screen layouts spacious and readable.
4. Use large section titles and concise supporting text.
5. Make the primary action obvious.
6. Avoid more than one primary CTA per screen section.
7. Use neutral backgrounds and subtle accent colors.
8. Prefer cards and surfaces for grouped content.
9. Use bottom sheets for contextual AI actions.
10. Use toasts for lightweight confirmations.
11. Use dialogs only for important confirmations.
12. Use skeletons for loading states.
13. Use chips for status labels, not large badges everywhere.
14. Use native-feeling transitions and subtle press feedback.
15. Avoid visual clutter.

---

# 5. Technology Assumptions

This design system assumes:

- Expo React Native
- TypeScript
- HeroUI Native
- Tailwind/Uniwind styling approach
- iOS-first mobile experience
- Later support for Android with responsive adjustments
- App uses AI agent/chat flows, cards, bottom sheets, and proactive notifications

---

# 6. Visual Foundation

## 6.1 Color Philosophy

Viya should use a soft gray app canvas with white floating islands and a restrained travel-ready accent.

The app should feel premium, not playful.

### Preferred Palette Direction

Use island UI surfaces:

- App canvas: soft gray, never pure white
- Surface: white floating islands
- Surface muted: near-white nested rows and chips
- Text primary: zinc near-black
- Text secondary: zinc muted gray
- Border: translucent low-contrast zinc
- Accent: Viya blue
- Warning: orange
- Danger: red
- Success: mint
- Insight: purple for memories and wrap-up

### Suggested Tokens

```ts
const colors = {
  app: '#F4F4F5',
  surface: '#FFFFFF',
  surfaceMuted: '#FAFAFA',
  textPrimary: '#18181B',
  textSecondary: '#71717A',
  textTertiary: '#A1A1AA',
  border: 'rgba(24, 24, 27, 0.08)',
  accent: '#0A84FF',
  success: '#30D158',
  warning: '#FF9F0A',
  danger: '#FF453A',
  insight: '#BF5AF2',
};
```

## Color Usage Rules

- Use accent color only for important actions and active states.
- Use soft background tints for status cards.
- Do not use bright gradients as default backgrounds.
- Use travel imagery only when it supports the island and does not overpower it.
- Use color to communicate status, not to decorate every card.

---

## 6.2 Typography

Use Apple-like typography principles:

- Large clear headings
- Tight but readable hierarchy
- Short labels
- Concise descriptions
- Strong contrast between title and body

### Type Scale

```ts
const typography = {
  display: 'text-4xl font-semibold tracking-tight',
  largeTitle: 'text-3xl font-semibold tracking-tight',
  title1: 'text-2xl font-semibold tracking-tight',
  title2: 'text-xl font-semibold',
  title3: 'text-lg font-semibold',
  body: 'text-base',
  callout: 'text-sm',
  caption: 'text-xs'
};
```

## Typography Rules

- Screen title should usually be `title1` or `largeTitle`.
- Section titles should be `title2` or `title3`.
- Body text should be concise.
- Avoid long paragraphs inside cards.
- Use supportive copy to reduce anxiety, not to explain everything.

Example:

Good:

> You are almost ready. Fix 3 items before departure.

Bad:

> Based on your current travel preparation status, we have detected that there are several missing readiness requirements that you may want to address before your scheduled departure date.

---

## 6.3 Spacing

Use generous spacing. The app should breathe.

### Spacing Scale

```ts
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32
};
```

## Spacing Rules

- Screen horizontal padding: `px-4` or `px-5`
- Island padding: `p-4` to `p-5`
- Section spacing: `gap-4` to `gap-6`
- List item spacing: `gap-3` to `gap-4`
- Avoid tight stacked layouts.

---

## 6.4 Radius and Depth

Viya should feel soft and modern.

### Radius

```ts
const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  island: 28,
  sheet: 32,
  full: 999,
};
```

## Rules

- Main islands: `rounded-[28px]` or `rounded-3xl`
- Inner cards: `rounded-2xl`
- Buttons: rounded-full or rounded-2xl depending on context
- Chips: rounded-full
- Sheets: rounded top corners

## Depth

Use soft elevation sparingly.

- Main cards can have subtle shadow.
- Avoid heavy shadows.
- Prefer separation through whitespace and subtle borders.
- Use `Surface` for consistent elevation/background styling.

---

# 7. Layout Patterns

## 7.1 Screen Structure

Most screens should follow this structure:

```txt
Safe Area
  Header
    Title
    Context / subtitle
  Main content
    Primary card or current state
    Next action
    Supporting sections
  Sticky or bottom action when needed
```

## 7.2 Header Pattern

Headers should be simple and useful.

Example:

```txt
Good morning, Van
Your Palawan trip starts in 18 days.
```

Use large titles only when the screen is a main destination.

Use compact headers for detail screens.

## 7.3 Card Pattern

Cards should have one job.

Examples:

- Readiness score card
- Next action card
- Risk alert card
- Today itinerary card
- Booking summary card
- Moment card

Each card should contain:

1. Short title
2. Key value or status
3. One supporting detail
4. Optional action

Avoid cards with too many rows and unrelated content.

---

# 8. HeroUI Native Component Usage Guide

## 8.1 Button

Use HeroUI `Button` for all actions.

### Variants

- `primary`: Main action
- `secondary`: Important supporting action
- `tertiary`: Low-emphasis navigation or learn more
- `outline`: Neutral secondary action
- `ghost`: Icon or quiet utility action
- `danger`: Destructive action
- `danger-soft`: Low-emphasis destructive action

### Examples

```tsx
<Button variant="primary" size="lg">
  <Button.Label>Fix My Readiness</Button.Label>
</Button>
```

```tsx
<Button variant="secondary" size="md">
  <Button.Label>Replan Today</Button.Label>
</Button>
```

## Button Rules

- Use one primary button per screen section.
- Use concise labels with verbs.
- Good labels:
  - Plan my trip
  - Fix My Readiness
  - Replan Today
  - Add Booking
  - Generate Wrapped
- Avoid vague labels:
  - Submit
  - Continue, when unclear
  - Click here

---

## 8.2 Card

Use HeroUI `Card` for structured grouped content.

Good use cases:

- Readiness summary
- Risk summary
- Itinerary day block
- Booking item
- Moment preview
- AI suggestion

Example:

```tsx
<Card className="rounded-3xl p-5">
  <Text className="text-sm text-default-500">Trip Readiness</Text>
  <Text className="text-3xl font-semibold">72%</Text>
  <Text className="text-sm text-default-500">
    You are almost ready. Fix 3 items before departure.
  </Text>
</Card>
```

---

## 8.3 Surface

Use `Surface` for page sections, elevated containers, and grouped background blocks.

Good use cases:

- Dashboard sections
- Large status containers
- Travel mode panel
- Bottom action areas

---

## 8.4 Text

Use HeroUI `Text` for typography consistency.

Rules:

- Use explicit class names for hierarchy.
- Keep text readable and concise.
- Use secondary text for explanations.

---

## 8.5 Chip

Use `Chip` for compact statuses.

Examples:

- Ready
- Missing
- High Risk
- Pending
- Confirmed
- AI Suggested
- Weather Risk

Rules:

- Use chips sparingly.
- Do not turn every label into a chip.
- Use chip color/tone to communicate status.

---

## 8.6 ListGroup

Use `ListGroup` for grouped lists.

Good use cases:

- Checklist items
- Booking documents
- Group member tasks
- Trip settings
- AI action suggestions

---

## 8.7 BottomSheet

Use `BottomSheet` for contextual AI help and quick actions.

Good use cases:

- Viya suggestion details
- Fix readiness options
- Replan choices
- Add booking flow
- Moment caption generator
- Risk action suggestions

Rules:

- Bottom sheets should not become full complex screens.
- Use a clear title, short explanation, and focused action list.

---

## 8.8 Dialog

Use `Dialog` only for important confirmation.

Good use cases:

- Delete trip
- Remove booking
- Reset itinerary
- Confirm destructive changes

Avoid using dialogs for normal AI suggestions.

---

## 8.9 Toast

Use `Toast` for lightweight feedback.

Examples:

- Booking added
- Checklist updated
- Reminder created
- Caption copied
- Itinerary optimized

---

## 8.10 Alert

Use `Alert` for important risks and warnings.

Good use cases:

- Flight delay risk
- Missing hotel booking
- Bad weather warning
- Budget risk
- Passport/document issue

---

## 8.11 Skeleton and Spinner

Use `Skeleton` and `SkeletonGroup` for loading screen content.

Use `Spinner` only for short inline loading states.

Examples:

- AI is generating itinerary
- Readiness score is recalculating
- Wrapped is being generated
- Booking document is being parsed

---

# 9. Viya-Specific Component Library

The app should create a small Viya component layer that composes HeroUI Native.

## 9.1 Core App Components

### `ViyaScreen`

Standard screen wrapper.

Responsibilities:

- Safe area
- Background
- Horizontal padding
- Scroll behavior
- Keyboard behavior when needed

### `ViyaHeader`

Standard header component.

Props:

- `title`
- `subtitle`
- `rightAction`
- `variant: 'large' | 'compact'`

### `ViyaCard`

Thin wrapper around HeroUI `Card`.

Use only for consistent padding/radius.

### `ViyaActionButton`

Thin wrapper around HeroUI `Button`.

Use only for common CTA sizing and labels.

### `ViyaStatusChip`

Thin wrapper around HeroUI `Chip`.

Use for consistent status tone mapping.

---

## 9.2 Product Components

### `ReadinessScoreCard`

Shows:

- Score percentage
- Status label
- Top missing items
- Primary action: `Fix My Readiness`

### `NextBestActionCard`

Shows Viya's most important recommended action.

Examples:

- Add your hotel booking
- Create airport transfer reminder
- Adjust Day 3 due to rain
- Complete packing checklist

### `RiskRadarCard`

Shows current travel risks.

Fields:

- Risk level
- Risk title
- Explanation
- Recommended action

### `TripTimelineCard`

Shows current or upcoming itinerary items.

### `BookingSummaryCard`

Shows flight, hotel, activity, or transport booking.

### `ViyaSuggestionCard`

Shows proactive AI recommendations.

### `TripSyncMemberCard`

Shows group member readiness and pending tasks.

### `MomentCard`

Shows photo/note/caption memory item.

### `WrappedStatCard`

Shows post-trip statistics.

---

# 10. Screen Design Blueprints

## 10.1 Welcome Screen

### Goal

Make the product immediately understandable and premium.

### Layout

```txt
Large travel hero image or soft abstract travel visual
Title: Travel, handled by Viya.
Subtitle: Plan, prepare, travel, and remember with an AI companion that keeps you ready.
Primary CTA: Plan your first trip
Secondary CTA: Explore demo trip
```

### Design Rules

- Use cinematic but calm imagery.
- Keep copy short.
- Use one strong CTA.
- Avoid showing too many features upfront.

---

## 10.2 Trip Onboarding Screen

### Goal

Collect enough information to generate a useful trip plan.

### Layout

```txt
Header: Let’s plan your trip
Subtitle: Tell Viya the basics. You can change everything later.
Form cards:
  Destination
  Dates
  Budget
  Group size
  Travel style
CTA: Generate my trip
```

### Components

- `TextField`
- `Select`
- `Button`
- `Card`
- `Chip` for travel style options

### AI Behavior

Viya may ask one contextual follow-up if needed, but avoid making onboarding too long.

---

## 10.3 Trip Dashboard

### Goal

Give the traveler a clear command center.

### Layout

```txt
Header:
  Palawan
  June 10–15 · 18 days to go

ReadinessScoreCard
NextBestActionCard
RiskRadarCard
Today / Upcoming itinerary preview
Bookings preview
TripSync preview
Moments preview
```

### Primary CTA

`Fix My Readiness`

### Design Rules

- Readiness should be the hero element.
- Do not overload with every trip detail.
- Show what matters now.

---

## 10.4 AI Planner Screen

### Goal

Let users generate, review, and refine itinerary.

### Layout

```txt
Header: Your AI itinerary
Segment/Tabs: Overview | Day by day | Map
Day cards
AI optimization actions
```

### Components

- `Tabs`
- `Card`
- `Button`
- `BottomSheet`
- `SkeletonGroup`

### Key Actions

- Optimize day
- Make relaxed
- Make cheaper
- Add backup plan
- Replace activity

---

## 10.5 Readiness Screen

### Goal

Make preparation visible and actionable.

### Layout

```txt
Large score
Status message
Missing items grouped by category
Fix My Readiness CTA
Checklist sections
```

### Categories

- Documents
- Bookings
- Packing
- Budget
- Transport
- Weather
- Safety
- Group Sync

### Design Rules

- Score should be clear but not scary.
- Missing items should feel solvable.
- Always provide an action.

---

## 10.6 Risk Radar Screen

### Goal

Show what could go wrong and what to do.

### Layout

```txt
Header: Risk Radar
Summary: 2 risks need attention
Risk cards grouped by severity
Recommended fixes
```

### Components

- `Alert`
- `Card`
- `Chip`
- `Button`
- `BottomSheet`

---

## 10.7 TripSync Screen

### Goal

Coordinate group travel.

### Layout

```txt
Header: TripSync
Group readiness summary
Member cards
Pending decisions
Shared checklist
```

### Components

- `Avatar`
- `Card`
- `ListGroup`
- `Checkbox`
- `Chip`
- `Button`

---

## 10.8 Travel Mode Screen

### Goal

Guide the traveler during the actual trip.

### Layout

```txt
Header: Today in Palawan
Current status card
Next activity card
Quick actions
Booking shortcuts
Emergency info
```

### Quick Actions

- Replan today
- Find food nearby
- Show booking
- Send group update
- Mark as done

### Design Rules

- This screen must be glanceable.
- Use large touch targets.
- Prioritize the next immediate action.

---

## 10.9 Moments Screen

### Goal

Capture and generate memories during the trip.

### Layout

```txt
Header: Moments
Today’s highlight prompt
Moment cards
Add photo/note button
AI caption action
```

### Components

- `Card`
- `Button`
- `TextArea`
- `BottomSheet`
- `Toast`

---

## 10.10 Viya Wrapped Screen

### Goal

Create emotional closure and shareable recap.

### Layout

```txt
Hero recap card
Trip stats
Best moments
Budget summary
Travel personality
Shareable cards
Next trip recommendation
```

### Design Rules

- More cinematic than productivity screens.
- Still minimal and elegant.
- Use stronger visuals but avoid clutter.

---

# 11. AI Interaction Design

## 11.1 Viya Voice

Viya should sound:

- Helpful
- Calm
- Proactive
- Concise
- Human but not overly playful
- Confident but not bossy

## Copy Rules

Use:

- “You’re almost ready.”
- “I found 3 things to fix before you leave.”
- “Rain may affect Day 3. I can move the outdoor activity earlier.”
- “Your hotel booking does not cover the final night.”

Avoid:

- “Oops!”
- “Uh oh!”
- “Massive problem detected.”
- Overly casual jokes
- Long AI explanations

---

## 11.2 Proactive AI Pattern

Every proactive AI recommendation should have:

1. What Viya noticed
2. Why it matters
3. What action the user can take

Example:

```txt
I noticed your arrival is at 4:35 PM.
That makes island hopping unrealistic on Day 1.
I suggest keeping Day 1 light and starting activities tomorrow.
```

CTA:

```txt
Adjust Day 1
```

---

## 11.3 AI Suggestion UI

Use `ViyaSuggestionCard` for inline suggestions.

Use `BottomSheet` for deeper explanation or actions.

Do not open a full chat screen for every suggestion.

Chat should be available, but the product should feel proactive through cards and actions.

---

# 12. Motion and Interaction

## Motion Principles

- Subtle
- Fast
- Native-feeling
- Useful
- Never distracting

## Use Motion For

- Card entrance
- Score updates
- Loading AI output
- Bottom sheet transitions
- Press feedback
- Wrapped recap transitions

## Avoid

- Bouncy animations everywhere
- Slow transitions
- Excessive parallax
- Motion that blocks productivity

## Interaction Rules

- Use HeroUI press feedback by default.
- Use haptics for important actions where appropriate.
- Give immediate visual feedback after taps.
- Use optimistic UI for checklist updates.

---

# 13. Accessibility Rules

The app must be accessible by default.

Rules:

- Minimum tap target: 44x44
- Sufficient text contrast
- Support dynamic text where possible
- Meaningful labels for icon buttons
- Do not rely on color alone for risk/status
- Use readable font sizes
- Avoid tiny captions for important info
- Provide loading and error states

---

# 14. Empty, Loading, and Error States

## Empty State Pattern

Every empty state should:

1. Explain what is missing
2. Explain why it matters
3. Offer an action

Example:

```txt
No bookings yet
Add your flight or hotel booking so Viya can check your readiness.
[Add Booking]
```

## Loading State Pattern

Use skeleton screens for page loading.
Use spinner for button-level loading.

Example:

```txt
Viya is checking your trip readiness...
```

## Error State Pattern

Errors should be calm and actionable.

Example:

```txt
Viya could not update your itinerary.
Check your connection and try again.
[Try Again]
```

---

# 15. Content Style Guide

## Writing Principles

- Be concise.
- Use plain language.
- Make next steps obvious.
- Avoid technical AI language.
- Avoid generic filler.
- Write like a calm assistant.

## Preferred Terms

Use:

- Trip
- Readiness
- Risk
- Moment
- Wrapped
- Travel Mode
- TripSync
- Fix My Readiness
- Next best action

Avoid:

- Workflow execution
- Agentic orchestration
- LLM inference
- Data object
- System-generated recommendation

---

# 16. Navigation Model

## Main Navigation

Suggested tabs:

1. Dashboard
2. Plan
3. Readiness
4. Travel Mode
5. Moments

## Secondary Screens

- Trip onboarding
- Booking details
- Risk details
- TripSync
- Wrapped
- Settings
- AI chat

## Rule

The Dashboard should always surface the most important next action so users do not need to hunt across tabs.

---

# 17. MVP Design Priorities

## Must Feel Polished

These screens should receive the most design attention:

1. Welcome screen
2. Trip Dashboard
3. Readiness screen
4. AI Planner screen
5. Travel Mode screen
6. Viya Wrapped screen

## MVP Visual Differentiators

- Beautiful readiness score card
- Proactive AI suggestion cards
- Clean Travel Mode
- Apple-like spacing and typography
- Smooth bottom sheet interactions
- Elegant Wrapped recap

---

# 18. Do and Do Not

## Do

- Use HeroUI Native components.
- Keep layouts spacious.
- Make AI actions visible.
- Use cards for grouped information.
- Use bottom sheets for contextual action.
- Use subtle status colors.
- Make every screen action-oriented.
- Prioritize readability.
- Use travel imagery intentionally.

## Do Not

- Build a custom UI kit from scratch.
- Overuse gradients.
- Create dense dashboards.
- Add unnecessary charts.
- Use too many icons.
- Hide important actions in menus.
- Make the app feel like a chatbot only.
- Use long AI paragraphs.
- Use loud gamified visuals for readiness.

---

# 19. Agent Implementation Checklist

Before completing any UI task, verify:

- [ ] HeroUI Native component used where applicable
- [ ] Screen follows Viya spacing and typography rules
- [ ] Main action is obvious
- [ ] AI suggestion is proactive and actionable
- [ ] Loading state exists
- [ ] Empty state exists if applicable
- [ ] Error state exists if applicable
- [ ] Tap targets are accessible
- [ ] No unnecessary custom component was created
- [ ] UI feels simple, minimalist, and premium
- [ ] Copy is concise and calm

---

# 20. Example Screen Composition

## Dashboard Example

```tsx
export function TripDashboardScreen() {
  return (
    <ViyaScreen>
      <ViyaHeader
        title="Palawan"
        subtitle="June 10–15 · 18 days to go"
        variant="large"
      />

      <ReadinessScoreCard
        score={72}
        status="Almost ready"
        summary="Fix 3 items before departure."
        primaryActionLabel="Fix My Readiness"
      />

      <NextBestActionCard
        title="Add your final hotel night"
        description="Your current hotel booking ends before your trip does."
        actionLabel="Add Booking"
      />

      <RiskRadarCard
        level="High"
        title="Rain may affect Day 3"
        description="Move outdoor activities earlier or add an indoor backup."
        actionLabel="Adjust Plan"
      />
    </ViyaScreen>
  );
}
```

---

# 21. Final Design Direction

Viya should not look like a generic travel booking app.

It should look like a calm, premium, AI-powered travel command center.

The product experience should make the user feel:

- I know what to do next.
- I know what is missing.
- I know what could go wrong.
- I have help fixing it.
- My trip is organized.
- My memories will not be lost.

That is the design goal.
