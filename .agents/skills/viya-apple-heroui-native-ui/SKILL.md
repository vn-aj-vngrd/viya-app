---
name: viya-apple-heroui-native-ui
description: Create or refine polished, consistent Viya mobile UI in the Expo React Native app using HeroUI Native, Uniwind, and Apple-inspired visual patterns. Use when working on Viya native screens, navigation tabs, onboarding, home, profile, chat, trip dashboards, trip creation flows, floating action bars, bottom sheets, cards, forms, empty/loading states, or visual consistency across `apps/native`.
---

# Viya Apple HeroUI Native UI

## Workflow

1. Inspect the target screen and at least one nearby reference screen before editing.
2. Use the `heroui-native` skill or current HeroUI Native docs before introducing or changing HeroUI Native component APIs.
3. Preserve the existing Expo Router structure under `apps/native/app` and feature components under `apps/native/src/features`.
4. Build the first viewport as the usable product screen, not a marketing page or explanatory splash.
5. Run `bun x ultracite fix` after edits when practical, then run the narrowest relevant check or test.

## Reference Screens

Treat these as the current quality bar:

- Home: `apps/native/app/(app)/(tabs)/index.tsx`, `apps/native/src/features/home/*`
- Profile: `apps/native/app/(app)/(tabs)/profile.tsx`
- Chat: `apps/native/src/features/viya/viya-chat-screen.tsx`, `viya-chat-components.tsx`, `viya-chat-composer.ts`
- Trip dashboard: `apps/native/src/features/trips/trip-dashboard-screen.tsx`, `trip-dashboard-components.tsx`, `trip-card-primitives.tsx`
- New trip: `apps/native/src/features/trips/manual-trip-create-screen.tsx`
- Onboarding: `apps/native/src/features/onboarding/preference-onboarding-screen.tsx`
- Shell: `apps/native/components/container.tsx`, `apps/native/global.css`

## Visual System

Use an Apple-inspired native app feel: calm hierarchy, soft neutral backgrounds, high-utility content, precise spacing, and restrained motion.

- Page shell: use `Container` or a root `View` with `flex-1 bg-background`; respect safe-area insets.
- Background: keep the light app background close to `#F5F5F5`; cards and sheets use `bg-surface`.
- Primary accent: use iOS blue `#0A84FF` for primary progress, selection, and the main action.
- Supporting accents: use small amounts of iOS-like green, orange, red, pink, and purple for semantic module identity.
- Surfaces: prefer `Surface`, `BottomSheet`, `Menu`, `ListGroup`, `TextField`, `Input`, `TextArea`, `Button`, `Spinner`, `Separator`, and `ScrollShadow` from `heroui-native`.
- Shape: use rounded native surfaces (`rounded-3xl`, `rounded-[30px]`, `rounded-[36px]`) for large mobile cards and sheets; avoid nested cards.
- Borders: use `border-border` or subtle rgba borders such as `rgba(24, 24, 27, 0.08)`.
- Spacing: use compact rhythm (`gap-3`, `gap-4`, `px-4`, `px-5`, `pb-28` when floating bars are present).
- Typography: use HeroUI Native `Text` variants; reserve large type for screen titles and hero blocks, not dense panels.
- Icons: use `Ionicons` or `Feather` for native controls and module identity; prefer icons over text-only tool buttons.

## Interaction Patterns

- Use `onPress`, not web event handlers.
- Add `accessibilityRole`, `accessibilityState`, and labels where a `Pressable` acts as a control.
- Use segmented progress for multistep flows, matching onboarding and trip creation.
- Use bottom sheets for focused edits, pickers, and contextual actions.
- Use floating action bars only for high-value persistent actions, with enough bottom padding in the scroll content.
- Keep animation subtle: reveal with opacity/translateY, press scale around `0.99`, and durations around 300-650ms unless the existing flow already uses a longer staged sequence.

## Implementation Guardrails

- Do not import `@heroui/react`; this app uses `heroui-native`.
- Do not add web-only patterns such as `div`, `onClick`, CSS modules, or browser DOM APIs.
- Do not hard-code one-off UI when a local primitive already exists.
- Do not replace current working screens with generic template UI.
- Do not use one-note palettes, decorative gradient blobs, or marketing-style hero sections.
- Keep business logic, async data fetching, and state transitions intact while improving presentation.
- Keep text concise and screen-specific; do not add visible copy explaining how the UI was designed.
- Prefer explicit TypeScript types for component props and extracted constants for repeated colors, durations, and labels.

## Finish Criteria

Before calling the UI work done:

- Compare against the reference screens for spacing, shape, accent use, and density.
- Check loading, empty, error, and disabled states if the screen has async data or forms.
- Verify mobile text does not overlap or overflow common viewport widths.
- Run Ultracite formatting/checks when feasible and report anything not run.
