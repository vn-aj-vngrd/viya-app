# Motion spec

Status: decided (Opus), revision 2 (2026-11-15). Applies to all of `apps/native`. DESIGN.md section 10 summarises it. Revision 1 is built (`src/components/ui/motion.ts` has every export below); this revision adds the native-shell rules from `docs/ux/SHELL-SPEC.md` and refreshes the sweep. Do not commit.

Motion confirms an action or shows where something came from. It never decorates. Reference: AQD (`../aqd/DESIGN.md`): system transitions, one press response, quiet entrances, nothing loops except loading.

## 1. The language (five things, nothing else)

| # | Name | Definition | API |
|---|---|---|---|
| 1 | Press spring | Scale to `motion.pressScale` 0.97 (rows `motion.rowPressScale` 0.985) on press-in, back to 1 on press-out. Spring `motion.spring.press` = `{ stiffness: 500, damping: 32, mass: 0.6 }`: about 120 ms, no overshoot. | `PressableScale`, `usePressScale` |
| 2 | Entering spring | Critically damped `motion.spring.layout` = `{ stiffness: 300, damping: 35, mass: 1 }` (damping ratio about 1.0, settles in about 300 ms, inside 280 to 350). Entrances, layout reflow, progress, segmented thumb. | `enterRise`, `layoutReflow`, `useLayoutSpring` |
| 3 | Content-swap fade | In `motion.duration.normal` 220 ms, out `motion.duration.fast` 120 ms. Something that replaces or joins content: error line, status, inline panel, toast, chat message. | `fadeIn`, `fadeOut` |
| 4 | List entrance | Opacity 0 to 1 plus an 8pt rise (`motion.riseDistance`) on the entering spring. Stagger `motion.stagger.max` 40 ms per index, capped at `motion.stagger.maxItems` 6 (item 7 onward starts with item 6). First mount of the screen only: never on refresh, search, filter, scope change, pagination, recycling or reactive updates. | `useListEntrance`, `Reveal` |
| 5 | Skeleton pulse | Opacity 0.55 to 1 and back, 900 ms each way, ease in-out. The only loop in the app, only while loading. | `useSkeletonPulse` via `Skeleton` |

Never: bounce or overshoot, zoom or scale entrances, slide-ins from screen edges, parallax, shimmer gradients, looping or attention-seeking animation, celebration effects, ad-hoc `delay`, JS-driven header collapse.

Image loading: `expo-image` `transition={motion.duration.normal}`. No other value.

## 2. Screen transitions and chrome are native

| Moment | Motion | Owner |
|---|---|---|
| Push / pop a detail screen | Native stack default (iOS slide with interactive swipe-back; Android platform default) | `(app)` Stack. No `animation` option on any pushed screen. |
| Chat, Travel mode, New trip | Native `fullScreenModal` (slides up, dismiss slides down) | `(app)/_layout.tsx` `presentation` |
| Onboarding | `animation: "fade"` (the one exception, exists) | `(app)/_layout.tsx` |
| Auth swap | `animation: "fade"` (exists) | root `_layout.tsx` |
| Ask Viya tab | Tab switch back is instant; the chat cover uses the modal default | SHELL-SPEC 2.2 |
| Tab switch | `NativeTabs` default (none); bar minimise on scroll is system | `(tabs)/_layout.tsx` |
| Large title collapse, header scroll-edge, search bar | System (`headerLargeTitle`, `headerTransparent`) | `ScreenShell`. Delete the Reanimated scroll handler with `CollapsingScreen`. |
| Header toolbar buttons and menus | System glass press and menu animations | `ShellHeader` (`Stack.Toolbar`) |
| Context menu on a row | System (`Link.Menu`) | `ContextMenu` |
| Sheet open, detents, close | Gorhom defaults through `AppSheet` | `AppSheet` |
| Swipe row open | Gesture-driven (`ReanimatedSwipeable`, `friction 2`, no overshoot) | `SwipeableRow` |

## 3. Haptics (`haptics.ts`, unchanged API)

| Moment | Kind |
|---|---|
| Tap on a `PressableScale` (default) | `light` |
| Row tap, chip, segmented change, toggle, swipe row opening, picker change | `selection` |
| Committing a primary action (send, create, save) | `medium` |
| Outcome confirmed and not otherwise visible (success toast) | `success` |
| Destructive confirm shown, limit reached | `warning` |
| Failed action (error toast, inline error after submit) | `error` |

One haptic per gesture. Never on scroll, appear, or reactive data change. Native header buttons give no extra haptic (the system provides none; do not add one). Android uses the same calls.

## 4. Reduce Motion

Read with `useReducedMotion()` from Reanimated; layout animations also carry `.reduceMotion(ReduceMotion.System)`.

| Primitive | Reduce Motion |
|---|---|
| Press spring | No scale; haptic still fires |
| Entering spring (value) | `withTiming(to, { duration: motion.duration.fast })` |
| List entrance, `Reveal` | Plain `fadeIn`, no rise, no stagger |
| `layoutReflow` | None (rows jump) |
| Content-swap fade | Unchanged |
| Skeleton pulse | Static at 0.55 |
| Native transitions | System handles it (cross-fades) |

## 5. API: `apps/native/src/components/ui/motion.ts` (exists; names are frozen)

```ts
export const pressSpring;                 // = motion.spring.press
export const layoutSpring;                // = motion.spring.layout
export const fadeIn: EntryAnimation;      // FadeIn.duration(220).reduceMotion(System)
export const fadeOut: ExitAnimation;      // FadeOut.duration(120).reduceMotion(System)
export function enterRise(index?: number, reduced?: boolean): EntryAnimation; // building block only
export function useListEntrance(): (index: number) => EntryAnimation | undefined; // first commit only
export const layoutReflow: LayoutAnimation; // LinearTransition.springify() on the layout spring
export function useLayoutSpring(): (to: number) => number;
export function usePressScale(scaleTo?: number): { animatedStyle; onPressIn(); onPressOut() };
export function useSkeletonPulse(): AnimatedStyle;
```
Tokens (`tokens.ts` `motion`): `duration { fast 120, normal 220, slow 360, toast 2800 }`, `riseDistance 8`, `spring.press`, `spring.layout`, `stagger { max 40, maxItems 6 }`, `pressScale 0.97`, `rowPressScale 0.985`. `slow` has no user; delete it if still unused after the sweep.

`Reveal({ index, style, children })` is for a static block of a screen that mounts once with it (Discover sections, dashboard blocks). Never wrap list rows, never use on content that remounts with data, never on a `ScreenShell` `state` view.

## 6. Usage table

| Need | Use | Never |
|---|---|---|
| Tap feedback on anything custom | `PressableScale` | `TouchableOpacity`, manual opacity, ad-hoc `withSpring` |
| Press where `PressableScale` cannot wrap | `usePressScale()` | Copying the spring |
| Screen blocks on first open | `<Reveal index={i}>`, i at most 3 | `entering={FadeInDown…}` in a feature |
| List rows on first open | `const entrance = useListEntrance()`; `entering={entrance(i)}` | `Reveal` or `enterRise()` per row |
| Row inserted or deleted | `layout={layoutReflow}` + `exiting={fadeOut}` | `LayoutAnimation.configureNext` |
| Error, status, inline panel, toast, new chat message | `entering={fadeIn}` `exiting={fadeOut}` | Slide or zoom |
| Progress, meter, segmented thumb, number change | `useLayoutSpring()` | Custom `withTiming`, `Animated.timing` |
| Loading placeholder | `<Skeleton>` | Shimmer, `withRepeat` in features |
| Initial load without a skeleton | `ScreenShell state={{ kind: "loading" }}` (`LoadingState`, 300 ms delay) | Blank screen |
| Typing indicator in chat | `useSkeletonPulse()` on the dots | A separate loop |
| Toast, confirm | `useFeedback()` | Custom overlays |
| Sheet | `AppSheet` | Custom sheet animation |
| Push, modal, tab, header collapse | Native (section 2) | `animation:` values, JS headers |
| Remote image | `transition={motion.duration.normal}` | Other numbers |

## 7. Sweep

Patterns (search `apps/native/app` and `apps/native/src`, excluding the implementation files `src/components/ui/{motion,reveal,pressable-scale,feedback,skeleton,segmented,swipeable-row}.ts(x)`):

```
FadeIn FadeOut FadeInDown FadeInUp SlideIn SlideOut ZoomIn ZoomOut BounceIn
withSpring withTiming withRepeat withDelay withSequence springify
Animated.timing Animated.spring Animated.loop LayoutAnimation
entering= exiting= layout= LinearTransition transition={ .delay(
useAnimatedScrollHandler interpolate(   (JS header collapse, must be gone)
animation:                               (only the two fades in section 2)
```

```sh
cd apps/native && grep -rnE "FadeIn|FadeOut|SlideIn|SlideOut|ZoomIn|ZoomOut|BounceIn|withSpring|withTiming|withRepeat|withDelay|withSequence|springify|Animated\.(timing|spring|loop)|LayoutAnimation|entering=|exiting=|layout=|LinearTransition|transition=\{|\.delay\(|useAnimatedScrollHandler|interpolate\(|animation:" app src | grep -vE "src/components/ui/(motion|reveal|pressable-scale|feedback|skeleton|segmented|swipeable-row)\.tsx?"
```

Hits on 2026-11-15 (all allowed): `fadeIn`/`fadeOut` in `module-kit.tsx`, `auth-sign-in-sheet.tsx`, `viya-chat-screen.tsx`, `viya-chat-components.tsx` (messages), `location-suggestion-field.tsx`, `trip-module-form-kit.tsx`, `preference-onboarding-screen.tsx`; `entering={entrance(index)}` in `trips.tsx`; `entering`/`exiting={fadeOut}`/`layout={layoutReflow}` in `trip-row.tsx`; `transition={motion.duration.normal}` in `destination-card.tsx`, `trip-row.tsx`, `trip-dashboard-components.tsx`; `animation: "fade"` in the two layouts. The remaining violation is `src/components/ui/screen-header.tsx` (`useAnimatedScrollHandler`, `interpolate`), removed by SHELL-SPEC 4.5. Any new hit outside this list is a violation: replace it per section 6 or delete it.

## 8. Acceptance

- [ ] The sweep prints only the allowed hits above.
- [ ] Open Trips: rows fade and rise 8pt top to bottom, done within about 0.6 s; search or switch scope: nothing animates in.
- [ ] Delete a trip: the row fades, rows below slide up without bounce.
- [ ] Push Budget from the dashboard: native slide; swipe back is interactive; the header title moves with it.
- [ ] Scroll Discover: the large title collapses natively; no JS fade of a separate bar.
- [ ] Ask Viya: chat slides up as a cover; close slides down.
- [ ] Press any row or button: small scale, no overshoot, one haptic.
- [ ] Reduce Motion on: no press scale, fades only, static skeleton.
- [ ] Nothing moves while idle except a skeleton during loading.
