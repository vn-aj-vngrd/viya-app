# 12 Quality Checklist

## Purpose

Use this checklist before completing any Viya feature.

## Product checklist

- The feature supports Viya as an AI travel operations companion.
- The feature is not just generic itinerary functionality.
- The user can understand the value quickly.
- The feature helps with planning, readiness, risk, live travel, moments, or wrap-up.
- There is a clear next action.

## UI checklist

- Uses HeroUI Native components where possible.
- Follows Apple-inspired minimalist design.
- Uses generous spacing.
- Has clear visual hierarchy.
- Has one obvious primary action.
- Avoids clutter.
- Looks good on mobile screens.
- Supports light and dark mode where possible.
- Does not rely only on color for meaning.

## Component checklist

- Reuses existing components.
- Does not duplicate UI patterns.
- Custom components are product-specific.
- Component names are clear.
- Props are typed.
- Components are not overly large.

## Code checklist

- TypeScript passes.
- No unnecessary dependencies were added.
- Business logic is not buried inside screens.
- Shared types are reused.
- Constants are centralized.
- AI prompts are not duplicated.
- Data transformations are reusable.
- No unused code remains.

## Data checklist

- Uses documented data model names.
- Does not invent duplicate fields.
- Handles missing data gracefully.
- Demo data is clearly marked.
- User-generated data is separated from generated AI suggestions where needed.

## AI checklist

- AI output is structured when used by UI.
- AI output is validated before saving.
- AI does not invent confirmed facts.
- AI explains uncertainty when needed.
- AI response is concise and action-oriented.
- AI suggests next steps.
- AI behavior matches the correct mode.

## State checklist

- Loading state exists.
- Empty state exists.
- Error state exists.
- Retry path exists where useful.
- Optimistic updates are safe if used.

## Accessibility checklist

- Touchable elements have clear labels.
- Text has sufficient contrast.
- Important status is not color-only.
- Interactive elements are large enough for touch.
- Screen reader labels exist for important controls.

## Performance checklist

- Avoid unnecessary re-renders.
- Avoid large inline objects where they cause re-renders.
- Use memoization only where useful.
- Avoid expensive calculations in render.
- Keep lists performant.

## Demo checklist

- Palawan demo flow works.
- Demo data is stable.
- AI fallback exists for critical demo paths.
- Readiness score is visible.
- Fix My Readiness visibly improves state.
- Risk Radar shows useful alerts.
- Travel Mode has a clear current-day view.
- Wrapped creates an emotional ending.

## Definition of done

A feature is done when it is:

- Functional
- Typed
- Mobile-friendly
- Visually consistent
- Aligned with Viya product strategy
- Covered by loading, empty, and error states
- Ready for demo or clearly marked as placeholder
