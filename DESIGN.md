# Viya Design Contract

Single source of truth for UI in `apps/native`. Tokens live in `src/components/ui/tokens.ts`; primitives in `src/components/ui`. Import only from `@/src/components/ui`. If this file and the code disagree, fix the code or this file in the same change.

## 1. Rules (read first)

1. Content is opaque and flat. Glass is for the functional layer only (section 4).
2. One primary action per screen, in the thumb zone (section 7).
3. Build from the primitives in section 3. Do not restyle a primitive inline; extend it.
4. Every colour, space, radius and size comes from tokens. No hex literals in features.
5. Every icon is `<Icon/>`. Monochrome, no badge behind it.
6. Every sheet is `<AppSheet/>`. It owns the single grabber.
7. Every interactive element is at least 44pt, has an accessibility label, and gives press and haptic feedback.
8. Text uses `<AppText/>` variants and scales with Dynamic Type. Never fix a container height around text.
9. Every screen has designed loading, empty and error states.
10. Copy is short, sentence case, active voice. No emoji. No exclamation marks.

## 2. Principles (iOS 27 HIG)

- Clarity: one idea per screen, strong hierarchy through size and weight, not colour.
- Deference: chrome recedes, content leads. Large title collapses to inline on scroll.
- Depth: layers come from glass over content, sheet detents and motion. Not from shadows.
- Direct manipulation: swipe actions on rows, context menus on long press, drag the sheet.
- Progressive disclosure: show the next useful thing, hide the rest behind a row, menu or sheet.
- Quiet and precise: small type scale, generous space, one accent colour.

## 3. Components

| Name | Key props | Use |
|---|---|---|
| `AppText` | `variant` largeTitle/title/heading/headline/body/callout/subhead/footnote/eyebrow, `tone` ink/secondary/tertiary/accent/danger/success/warning/onPrimary, `bold` | All text |
| `Icon` | `name` (Ionicons name), `size=20`, `tone`, `color`, `weight` | All icons |
| `GlassSurface` | `shape` rounded/pill/circle, `variant` regular/clear, `interactive`, `radius`, `tint` | Functional-layer chrome only |
| `GlassIconButton` | `icon`, `accessibilityLabel`, `onPress`, `size=44`, `tint`, `disabled` | Nav and toolbar icon actions |
| `PrimaryButton` | `label`, `onPress`, `icon`, `isPending`, `destructive`, `fullWidth`, `disabled` | The screen's one main action |
| `SecondaryButton` | `label`, `onPress`, `icon`, `variant` fill/plain, `isPending` | Alternate actions |
| `PressableScale` | `haptic`, `scaleTo`, Pressable props | Any custom tappable |
| `Card` / `Island` | `padding` none/md/lg, `radius`, `onPress` | Opaque content container, sparingly |
| `ListGroup` + `ListRow` | group: `header`, `footer`, `separatorInset`; row: `titleLines`, `subtitleLines`, row: `title`, `subtitle`, `value`, `leading`, `trailing`, `showChevron`, `destructive`, `onPress` | Inset grouped lists, the default for collections |
| `SectionHeader` | `title`, `eyebrow`, `action` | Heading above a block |
| `Chip` | `label`, `icon`, `selected`, `onPress` | Filters and static tags |
| `ScreenHeader` / `CollapsingScreen` | `title`, `subtitle`, `leading`, `trailing`, `footer`, `refreshControl`, `contentContainerStyle` | Large-title screen scaffold |
| `AppSheet` | `isOpen`, `onOpenChange`, `snapPoints`, `index`, `enableDynamicSizing`, `keyboardBehavior`, gorhom content props | Every bottom sheet |
| `SheetHeader` | `title`, `subtitle`, `onClose`, `confirm` {label,onPress,isPending,disabled} | Header inside a sheet. Never draws a grabber |
| `EmptyState` | `title`, `description`, `icon`, `action`, `visual` | Zero-data state |
| `LoadingState` | `title`, `message`, `delay` | Initial load (skeleton or spinner after a delay) |
| `FeedbackProvider`, `useFeedback` | `toast({message,tone})`, `confirm({title,message,destructive})` | Toasts and confirmations |
| `Skeleton` | `width`, `height`, `radius` | Loading placeholder with the shared pulse |
| `SearchField` | `value`, `onChangeText`, `placeholder` | Opaque pill search in content |
| `Segmented` | `options` (2 to 4), `value`, `onChange`, `accessibilityLabel` | Exclusive scopes in content, opaque |
| `SwipeableRow` | `leadingActions`, `trailingActions` | Row swipe actions, mirrored as accessibility actions |
| `ContextMenu` | `href`, `actions`, `children` | Native iOS long-press menu on a navigating row |
| `haptic` | `light` `medium` `selection` `success` `warning` `error` | Feedback calls |

Icon names: `SF_SYMBOL_MAP` in `src/components/ui/icon.tsx` maps every used Ionicons name to an SF Symbol. A name not in the map falls back to Ionicons on iOS, so add the mapping when you add a new icon.

## 4. Glass tiers

| Tier | Surfaces | Treatment |
|---|---|---|
| Glass `regular`, interactive | Nav and toolbar buttons, tab bar, floating action, composer container, confirm pill | `GlassSurface` |
| Glass `clear` | Floating controls over photos and maps | `GlassSurface variant="clear"` |
| Glass chrome | Sheet background (via `AppSheet`), toasts, menus, confirm dialogs | System or `GlassSurface` |
| Never glass | Cards, list rows, forms, fields, text blocks, chips, segmented control in content, buttons with text fill, glass on glass | Opaque `surface` on `canvas` |

Fallbacks: iOS before 26 uses system blur. Android, web and Reduce Transparency use `palette.glassFallback` with a hairline edge. Contrast never depends on blur.

## 5. Tokens (match tokens.ts)

Colour (light / dark): canvas `#F4F4F5` / `#0B0B0C`; surface `#FFFFFF` / `#1C1C1E`; ink `#18181B` / `#F5F5F7`; inkSecondary `#6B6B73` / `#A1A1AA`; inkTertiary `#A1A1AA` / `#71717A`; fill `#EEEEF0` / `#2C2C2E`; accent `#0A84FF`; success `#248A3D` / `#30D158`; warning `#B25E00` / `#FF9F0A`; danger `#D70015` / `#FF453A`. Also `hairline`, `separator`, `selection`, `scrim`, `onPrimary`, `glassFallback`.
Rules: accent only for the primary action, selection and links. Status colour always pairs with an icon or text. Purple and gradients are not used.

Spacing (pt): xs 4, sm 8, md 12, lg 16, screen 20, xl 24, section 24, 2xl 32, 3xl 40.
Radius: tile 12, group 14, field 16, card 20, sheet 32, pill 999.
Metrics: minTarget 44, iconButton 44, actionHeight 50, rowHeight 54, thumbnail 56, swipeAction 76, segmentHeight 32, thumbnail 56, swipeAction 76, segmentHeight 32, chipHeight 34, tabBarHeight 60.
Type: largeTitle 34/41 bold, title 28/34, heading 22/28, headline 17/22 semibold, body 17/24, callout 16/22, subhead 15/20, footnote 13/18, eyebrow 12/16.
Motion: see section 10. Tokens in `motion`: durations fast 120, normal 220, slow 360, toast 2800 ms; springs `press` and `layout`; press scale 0.97.

## 6. iOS versus Android

| Concern | iOS | Android |
|---|---|---|
| Icons | SF Symbols, monochrome | Ionicons via `Icon` |
| Glass | Liquid Glass (`expo-glass-effect`) | Solid translucent `glassFallback` |
| Haptics | `expo-haptics` | Same, lighter |
| Back and navigation | Glass back button, swipe back | Same structure, system back works |
| Sheets | `AppSheet` glass chrome, detents | Same, solid chrome |
| Large title | Collapses to inline | Same pattern |

Structure, hierarchy and copy are identical on both platforms. Only materials differ.

## 7. Navigation and placement

- Tab bar: the official native bar (`NativeTabs` from `expo-router/unstable-native-tabs`: UITabBarController, Liquid Glass on iOS 26+, Material navigation bar on Android), 4 to 5 destinations, icon-only (`Label hidden`, names via `tabBarItemAccessibilityLabel`), Discover first and default, SF Symbol icon (`sf`, Material `md` on Android), current tab filled, `minimizeBehavior="onScrollDown"`, accent tint. Ask Viya is the trailing `role="search"` tab. Never build a custom bar; screens rely on the native inset, no manual bottom clearance.
- Large title at the top of each tab; it collapses to inline. Pushed screens show a glass back button.
- Primary action: bottom of the screen in the thumb zone (full-width `PrimaryButton` above the safe area) or a floating glass add button bottom right. One per screen. A top-right glass icon is allowed only for secondary actions.
- Add on Trips: a top-right glass `+` (the one place a top-right glass icon is the primary action). Elsewhere: floating glass button or the section header `action`. Never an unlabeled plus inside content.
- Search: native search field below the large title, collapsing with scroll. Never a custom input in a card.
- Filters: 2 to 4 exclusive scopes use `Segmented`; open-ended filters use a horizontal row of `Chip`s under the title. Sort and extra options live in a `Menu` on a toolbar glass button.
- Row actions: swipe for common actions (delete, edit), long-press context menu for the rest, tap opens detail.
- Forms: `AppSheet` with `SheetHeader` (close left, confirm right), fields in an inset group, keyboard-safe.
- Detents: pickers and quick actions use a medium detent; forms use large; always draggable down.

## 8. State patterns

- Loading: `LoadingState` after 300 ms for first load; keep stale content during refresh. Never a blank screen.
- Empty: `EmptyState` with a plain sentence about the benefit plus one action that fixes it. First-run empty differs from filtered-empty (offer to clear filters).
- Error: say what happened and what to do, in one sentence, with a retry action. Inline for forms (below the field), toast for transient, `EmptyState` for full-screen.
- Success: haptic `success` and a short toast only when the result is not visible. Otherwise the UI change is the confirmation.
- Confirm: `useFeedback().confirm` for irreversible choices. Title states the action, destructive button repeats the verb ("Delete trip"), cancel is plain. Prefer undo toasts for reversible actions.
- Destructive: red text via `destructive`, placed last in a group, never the default or primary button.
- Disabled: 40 percent opacity and a reason nearby when not obvious.
- Pending: the button shows a spinner and blocks double taps.

## 9. Sheets

- Use only `AppSheet`. It renders glass chrome, one grabber, backdrop, pan-down to close, interactive keyboard handling.
- Do not pass `handleIndicatorStyle`, `backgroundStyle` or a grabber. They are ignored or forbidden.
- Layout inside: `SheetHeader`, then content with `paddingHorizontal: spacing.screen` and bottom padding of `max(insets.bottom, spacing.lg)`.
- Scrollable long content uses `ScrollView` with `keyboardShouldPersistTaps="handled"`.
- One sheet at a time. Never stack sheets.

## 10. Motion and haptics

Spec: `docs/ux/MOTION-SPEC.md`. Code: `src/components/ui/motion.ts`, `reveal.tsx`, `pressable-scale.tsx`, `skeleton.tsx`. Motion confirms and orients; it never decorates. Features import only these; no ad-hoc `FadeInDown`, `ZoomIn`, `withSpring`, `withTiming`, `withRepeat`, `.delay()`.

- Five things: press spring (0.97, rows 0.985), entering spring (critically damped, ~300 ms), content-swap fade (220 in, 120 out), list entrance (fade plus 8pt rise, 40 ms stagger, first 6, first mount only), skeleton pulse (the only loop).
- Never: bounce, zoom or scale entrances, edge slide-ins, parallax, shimmer, custom tab, push or sheet transitions.
- Reduce Motion: no press scale, entrances become fades, no reflow, skeleton static.
- Haptics: light on `PressableScale`, selection for rows, chips and pickers, medium for commits, success, warning, error for outcomes. One per gesture; never on scroll or appear.

| Need | Use |
| --- | --- |
| Tap feedback | `PressableScale` (or `usePressScale`) |
| Screen section on first open | `<Reveal index={i}>` |
| List rows on first open | `useListEntrance()` then `entering={entrance(i)}` |
| Row added or removed | `layout={layoutReflow}` `exiting={fadeOut}` |
| Message, error, panel, toast | `entering={fadeIn}` `exiting={fadeOut}` |
| Progress or number change | `useLayoutSpring()` |
| Loading placeholder | `<Skeleton>` |
| Remote image | `expo-image` `transition={motion.duration.normal}` |

## 11. Accessibility

- Dynamic Type through `AppText`; layouts wrap instead of clip.
- `accessibilityLabel` on every icon-only control; `accessibilityRole` and `accessibilityState` (selected, busy, disabled) set.
- Contrast 4.5:1 for text, 3:1 for icons and edges. Never colour alone.
- Reduce Transparency makes glass solid; Reduce Motion removes movement; Bold Text is respected by the system font.

## 12. Slop guardrails (do not ship)

- A coloured icon inside a tinted rounded badge.
- Gradient washes, glow, neon, purple accents.
- Emoji in UI or copy.
- A card around every item; shadow stacks; nested cards.
- Decorative pills and badges that carry no state.
- Glass on content, on text blocks or on glass.
- Custom grabbers, custom back arrows, custom switches or pickers when a native one exists.
- Ionicons imported directly in a feature.
- Placeholder or marketing copy in product UI.

## 13. Pre-merge checklist

- [ ] Uses only `@/src/components/ui` primitives; no hex colours, raw font sizes or magic spacing.
- [ ] Icons via `Icon`; new names added to `SF_SYMBOL_MAP`.
- [ ] Sheets via `AppSheet`; exactly one grabber visible.
- [ ] One primary action, placed per section 7.
- [ ] Loading, empty, error, destructive confirm states exist.
- [ ] 44pt targets, labels, roles; checked at the largest Dynamic Type.
- [ ] Light and dark verified; Reduce Transparency and Android fallback verified.
- [ ] Haptics on selection and outcomes; motion respects Reduce Motion.
- [ ] `npx tsc --noEmit` and `npx ultracite fix` clean.

## Open feedback from Van (every builder and QA agent must address and verify on device)
- Theme: the "+" glass button on Trips renders as a bright grey disc in dark mode and the segmented control/search field do not match the dark palette. Audit every control for theme correctness in light AND dark: glass buttons use the palette tint (never default white/grey), segmented controls, search fields, chips, toolbar buttons, and any HeroUI default colours must come from `useUITheme().palette`. Appearance setting (System/Light/Dark) must switch the whole app, including native tab bar and headers.
- Detail screens and chat show no tab bar; one shared header shell on every non-tab screen.
- Content richness (Van: "too plain, too simple, very vague; avoid nonsense labels; enrich the contents; functional and correct"): minimal chrome, rich information. Every screen shows real, specific, useful data from the existing hooks: concrete numbers, dates, names, statuses, progress, next actions, with units and formats (PHP amounts, dates, durations, counts). Titles and labels name the thing precisely ("3 of 7 documents ready", "Flight to Singapore · Fri 21 Nov · 08:40"); vague filler such as "Plan next", "Suggest similar trips", "Dates not set" without an action, "Quick actions", "Stay organised", "Your journey" is deleted or replaced by a specific state and a verb that does the thing. Each row, button and card is wired to a working action and a correct destination; no dead controls, no placeholder values, no lorem or mock numbers presented as real. Empty states say exactly what is missing and offer the one action that fixes it. Derived numbers (readiness %, budget left, days until trip, counts) must be computed correctly from data and shown consistently across screens.
