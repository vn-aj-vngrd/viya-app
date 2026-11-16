import type { TripCreateFlowState } from "./trip-create-flow-utils";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface TripPrefill {
	budgetAmount?: string;
	destination?: string;
	endDate?: string;
	startDate?: string;
}

type RouteParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
	(Array.isArray(value) ? value[0] : value)?.trim() || undefined;

/** Read destination, dates and budget passed by Discover into the create flow. */
export const getTripPrefill = (params: RouteParams): TripPrefill => {
	const startDate = first(params.startDate);
	const endDate = first(params.endDate);
	const budget = Number(first(params.budgetAmount));
	const hasDates =
		startDate && endDate && ISO_DATE.test(startDate) && ISO_DATE.test(endDate);

	return {
		budgetAmount:
			Number.isFinite(budget) && budget > 0
				? String(Math.round(budget))
				: undefined,
		destination: first(params.destination),
		...(hasDates && endDate >= startDate ? { endDate, startDate } : {}),
	};
};

/** Prefilled flows land on review when destination and dates are both known. */
export const isPrefillComplete = (prefill: TripPrefill) =>
	Boolean(prefill.destination && prefill.startDate && prefill.endDate);

export const applyTripPrefill = (
	state: TripCreateFlowState,
	prefill: TripPrefill
): TripCreateFlowState => ({
	...state,
	budgetAmount: prefill.budgetAmount ?? state.budgetAmount,
	destination: prefill.destination ?? state.destination,
	endDate: prefill.endDate ?? state.endDate,
	startDate: prefill.startDate ?? state.startDate,
});
