const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const whitespacePattern = /\s+/g;
const defaultTripDate = "";

export const tripCreateStepOrder = [
	"destination",
	"dates",
	"travelers",
	"style",
	"budget",
	"context",
	"review",
] as const;

export const durationPreferenceOptions = [
	"weekend",
	"3-4-days",
	"5-7-days",
	"1-2-weeks",
] as const;

export const travelerTypeOptions = [
	"solo",
	"couple",
	"friends",
	"family",
	"work",
] as const;

export const tripStyleOptions = [
	"food",
	"shopping",
	"relaxed",
	"adventure",
	"culture",
	"nature",
	"themeParks",
	"workLeisure",
] as const;

export const paceOptions = ["light", "balanced", "packed"] as const;
export const budgetScopeOptions = ["total", "perPerson"] as const;
export const budgetStrictnessOptions = [
	"flexible",
	"moderate",
	"strict",
] as const;

export type TripCreateStep = (typeof tripCreateStepOrder)[number];
export type DurationPreference = (typeof durationPreferenceOptions)[number];
export type TravelerType = (typeof travelerTypeOptions)[number];
export type TripStyle = (typeof tripStyleOptions)[number];
export type TripPace = (typeof paceOptions)[number];
export type BudgetScope = (typeof budgetScopeOptions)[number];
export type BudgetStrictness = (typeof budgetStrictnessOptions)[number];

export interface TripCreateFlowState {
	budgetAmount: string;
	budgetScope: BudgetScope;
	budgetStrictness: BudgetStrictness;
	destination: string;
	durationPreference: DurationPreference | null;
	endDate: string;
	mustHaves: string;
	pace: TripPace;
	pastedBookingText: string;
	startDate: string;
	styles: TripStyle[];
	title: string;
	travelerCount: string;
	travelerType: TravelerType;
}

export interface CreateTripPayload {
	budgetAmount?: number;
	budgetCurrency: "PHP";
	destination: string;
	endDate: string;
	groupType: string;
	startDate: string;
	summary: string;
	title: string;
	travelStyle: string;
}

export interface ReviewRow {
	label: string;
	value: string;
}

const labels = {
	budgetScope: {
		perPerson: "Per person",
		total: "Total",
	},
	durationPreference: {
		"1-2-weeks": "1-2 weeks",
		"3-4-days": "3-4 days",
		"5-7-days": "5-7 days",
		weekend: "Weekend",
	},
	pace: {
		balanced: "Balanced",
		light: "Light",
		packed: "Packed",
	},
	style: {
		adventure: "Adventure",
		culture: "Culture",
		food: "Food",
		nature: "Nature",
		relaxed: "Relaxed",
		shopping: "Shopping",
		themeParks: "Theme parks",
		workLeisure: "Work + leisure",
	},
	travelerType: {
		couple: "Couple",
		family: "Family",
		friends: "Friends",
		solo: "Solo",
		work: "Work",
	},
} as const;

const cleanText = (value: string) =>
	value.replace(whitespacePattern, " ").trim();

const toDateOrEmpty = (value: string) =>
	isoDatePattern.test(value) ? value : "";

const getReadableStyles = (styles: readonly TripStyle[]) =>
	styles.map((style) => labels.style[style]).join(", ");

const getTravelStyle = (styles: readonly TripStyle[], pace: TripPace) => {
	if (styles.length === 0) {
		return pace;
	}

	return styles.map((style) => labels.style[style].toLowerCase()).join(", ");
};

const getDefaultTitle = (destination: string) =>
	destination ? `${destination} Trip` : "New Trip";

export const createInitialTripCreateFlowState = (): TripCreateFlowState =>
	({
		budgetAmount: "0",
		budgetScope: "total",
		budgetStrictness: "moderate",
		destination: "",
		durationPreference: null,
		endDate: defaultTripDate,
		mustHaves: "",
		pace: "balanced",
		pastedBookingText: "",
		startDate: defaultTripDate,
		styles: [],
		title: "",
		travelerCount: "1",
		travelerType: "solo",
	}) as TripCreateFlowState;

export const parseBudgetAmount = (value: string) => {
	const amount = Number(cleanText(value).replaceAll(",", ""));

	return Number.isFinite(amount) && amount > 0 ? amount : undefined;
};

export const parseTravelerCount = (value: string) => {
	const count = Number(cleanText(value));

	return Number.isInteger(count) && count > 0 ? count : undefined;
};

const hasDateOrderError = (state: TripCreateFlowState, hasDates: boolean) =>
	hasDates && state.endDate < state.startDate;

interface StepValidationContext {
	destination: string;
	hasDates: boolean;
	hasDuration: boolean;
	travelerCount?: number;
}

const stepErrorChecks: Record<
	TripCreateStep,
	(state: TripCreateFlowState, context: StepValidationContext) => string | null
> = {
	budget: (state) =>
		parseBudgetAmount(state.budgetAmount)
			? null
			: "Enter a budget greater than 0.",
	context: () => null,
	dates: (state, { hasDates, hasDuration }) => {
		if (!(hasDates || hasDuration)) {
			return "Choose dates or a trip length.";
		}

		return hasDateOrderError(state, hasDates)
			? "End date must be after the start date."
			: null;
	},
	destination: (_state, { destination }) =>
		destination ? null : "Choose a destination.",
	review: (state, { hasDates }) =>
		hasDateOrderError(state, hasDates)
			? "End date must be after the start date."
			: null,
	style: (state) =>
		state.styles.length > 0 ? null : "Choose at least one trip style.",
	travelers: (state, { travelerCount }) => {
		if (!travelerCount) {
			return "Travelers must be a whole number.";
		}

		if (state.travelerType === "solo" && travelerCount !== 1) {
			return "Solo trips are set to 1 traveler.";
		}

		return state.travelerType === "couple" && travelerCount !== 2
			? "Couple trips are set to 2 travelers."
			: null;
	},
};

export const getStepError = (
	state: TripCreateFlowState,
	step: TripCreateStep
) => {
	const destination = cleanText(state.destination);
	const hasDates =
		isoDatePattern.test(state.startDate) && isoDatePattern.test(state.endDate);
	const hasDuration = Boolean(state.durationPreference);
	const travelerCount = parseTravelerCount(state.travelerCount);

	return stepErrorChecks[step](state, {
		destination,
		hasDates,
		hasDuration,
		travelerCount,
	});
};

export const getTripCreateSummary = (state: TripCreateFlowState) => {
	const budgetAmount = parseBudgetAmount(state.budgetAmount);
	const durationLabel = state.durationPreference
		? labels.durationPreference[state.durationPreference]
		: null;
	const details = [
		"Mode: Guided trip setup.",
		state.destination
			? `Destination: ${cleanText(state.destination)}.`
			: "Destination: undecided.",
		state.startDate && state.endDate
			? `Dates: ${state.startDate} to ${state.endDate}.`
			: null,
		durationLabel ? `Trip length: ${durationLabel}.` : null,
		`Travelers: ${labels.travelerType[state.travelerType]}, ${parseTravelerCount(state.travelerCount) ?? 1}.`,
		state.styles.length > 0
			? `Style: ${getReadableStyles(state.styles)}.`
			: null,
		`Pace: ${labels.pace[state.pace]}.`,
		budgetAmount
			? `Budget: PHP ${budgetAmount.toLocaleString()} ${labels.budgetScope[state.budgetScope]}, ${state.budgetStrictness}.`
			: null,
		state.mustHaves ? `Must-haves: ${cleanText(state.mustHaves)}.` : null,
		state.pastedBookingText
			? `Booking context: ${cleanText(state.pastedBookingText)}.`
			: null,
		"Viya can use this context to enrich itinerary, places, budget, and readiness.",
	].filter(Boolean);

	return details.join(" ");
};

export const getCreateTripPayload = (
	state: TripCreateFlowState
): CreateTripPayload => {
	const destination = cleanText(state.destination);
	const fallbackEndDate =
		toDateOrEmpty(state.endDate) || toDateOrEmpty(state.startDate);
	const fallbackStartDate =
		toDateOrEmpty(state.startDate) || toDateOrEmpty(state.endDate);

	return {
		budgetAmount: parseBudgetAmount(state.budgetAmount),
		budgetCurrency: "PHP",
		destination: destination || "Destination undecided",
		endDate: fallbackEndDate,
		groupType: state.travelerType,
		startDate: fallbackStartDate,
		summary: getTripCreateSummary(state),
		title: cleanText(state.title) || getDefaultTitle(destination),
		travelStyle: getTravelStyle(state.styles, state.pace),
	};
};

export const getCreateTripReviewRows = (
	state: TripCreateFlowState
): ReviewRow[] => {
	const budgetAmount = parseBudgetAmount(state.budgetAmount);
	const travelerCount = parseTravelerCount(state.travelerCount) ?? 1;
	let dates = "Not decided";

	if (state.startDate && state.endDate) {
		dates = `${state.startDate} to ${state.endDate}`;
	} else if (state.durationPreference) {
		dates = labels.durationPreference[state.durationPreference];
	}

	return [
		{
			label: "Destination",
			value: cleanText(state.destination) || "Not sure yet",
		},
		{
			label: "Dates",
			value: dates,
		},
		{
			label: "Travelers",
			value: `${labels.travelerType[state.travelerType]} · ${travelerCount} ${
				travelerCount === 1 ? "traveler" : "travelers"
			}`,
		},
		{
			label: "Style",
			value: getReadableStyles(state.styles) || "Balanced",
		},
		{
			label: "Pace",
			value: labels.pace[state.pace],
		},
		{
			label: "Budget",
			value: budgetAmount
				? `PHP ${budgetAmount.toLocaleString()} · ${labels.budgetScope[state.budgetScope]} · ${state.budgetStrictness}`
				: "Skipped",
		},
		{
			label: "Must-haves",
			value: cleanText(state.mustHaves) || "None added",
		},
	];
};

export const getTripCreateOptionLabel = (
	kind:
		| "budgetScope"
		| "durationPreference"
		| "pace"
		| "style"
		| "travelerType",
	value: string
) => {
	if (kind === "budgetScope") {
		return labels.budgetScope[value as BudgetScope];
	}

	if (kind === "durationPreference") {
		return labels.durationPreference[value as DurationPreference];
	}

	if (kind === "pace") {
		return labels.pace[value as TripPace];
	}

	if (kind === "style") {
		return labels.style[value as TripStyle];
	}

	return labels.travelerType[value as TravelerType];
};
