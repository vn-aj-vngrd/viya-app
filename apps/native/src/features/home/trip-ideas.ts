import type { SuggestForTripResult } from "@viya-app/domain";

const MAX_ALTERNATIVE_ROWS = 2;

/**
 * Trip-aware Discover rows: warn when the planned dates are a poor season, and
 * offer a couple of alternatives that suit the same dates.
 */
export const getTripIdeas = (result: SuggestForTripResult | null) => {
	const riskNote = result?.riskNote ?? null;
	const shouldWarn = Boolean(
		riskNote?.isKnown &&
			(riskNote.badge.tone === "caution" || riskNote.badge.tone === "avoid")
	);
	const alternatives = shouldWarn
		? (result?.alternatives ?? [])
				.filter(
					(item) => item.badge.tone === "best" || item.badge.tone === "good"
				)
				.slice(0, MAX_ALTERNATIVE_ROWS)
		: [];

	return { alternatives, riskNote, shouldWarn };
};
