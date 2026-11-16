import {
	allMonths,
	findPhDestinationByName,
	type PhDestination,
	phDestinations,
	type SuitabilityLevel,
	type TyphoonRisk,
	typhoonRiskByZone,
} from "./ph-destinations";
import type {
	BudgetPreference,
	GroupType,
	PacePreference,
	TravelInterest,
	UserGroupPreference,
	UserPreferences,
} from "./types";

export type SeasonTone = "best" | "good" | "caution" | "avoid";

export interface SeasonBadge {
	label: string;
	tone: SeasonTone;
}

export interface SuggestionWindow {
	days: number;
	endDate: string;
	months: number[];
	startDate: string;
}

export interface DestinationEstimate {
	perPersonPerDayPhp: number;
	/** Estimated total for all travelers in PHP, including airfare from Manila. */
	totalPhp: number;
}

export interface DestinationSuggestion {
	badge: SeasonBadge;
	caveats: string[];
	destination: PhDestination;
	estimate: DestinationEstimate;
	/** Short reason shown on the card. */
	headline: string;
	reasons: string[];
	score: number;
	/** Start and end dates that suit this destination, for prefilling a new trip. */
	suggestedWindow: SuggestionWindow;
	typhoonRisk: TyphoonRisk;
	window: SuggestionWindow;
}

export interface SuggestionInput {
	budgetAmount?: number;
	budgetPreference?: BudgetPreference;
	endDate?: string;
	/** Destination names to leave out, for example places already planned. */
	exclude?: readonly string[];
	group?: GroupType | UserGroupPreference;
	hasKids?: boolean;
	hasSeniors?: boolean;
	interests?: readonly TravelInterest[];
	limit?: number;
	pace?: PacePreference;
	preferences?: Partial<UserPreferences>;
	startDate?: string;
	/** ISO date (yyyy-mm-dd). Defaults to the current date. */
	today?: string;
	travelerCount?: number;
}

export interface SeasonRiskNote {
	advice: string[];
	badge: SeasonBadge;
	destination: PhDestination | null;
	headline: string;
	isKnown: boolean;
	maxTyphoonRisk: TyphoonRisk;
}

const MS_PER_DAY = 86_400_000;
const ISO_DATE_LENGTH = 10;
const DEFAULT_LEAD_DAYS = 14;
const DEFAULT_WINDOW_DAYS = 45;
const SEARCH_STEP_DAYS = 7;
const SEARCH_HORIZON_DAYS = 400;
const ESTIMATE_ROUNDING_PHP = 500;
const DEFAULT_LIMIT = 8;

const monthNames = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
] as const;

const interestLabels: Record<TravelInterest, string> = {
	beaches: "beaches",
	culture: "culture",
	food: "food",
	hiddenGems: "hidden gems",
	nature: "nature",
	nightlife: "nightlife",
	shopping: "shopping",
	wellness: "wellness",
};

export const toIsoDate = (date: Date) =>
	date.toISOString().slice(0, ISO_DATE_LENGTH);

const parseIsoDate = (value: string | undefined) => {
	if (!value) {
		return;
	}

	const date = new Date(`${value.slice(0, ISO_DATE_LENGTH)}T00:00:00Z`);

	return Number.isNaN(date.getTime()) ? undefined : date;
};

export const addDaysIso = (iso: string, days: number) => {
	const date = parseIsoDate(iso) ?? new Date();

	return toIsoDate(new Date(date.getTime() + days * MS_PER_DAY));
};

const daysBetween = (startIso: string, endIso: string) => {
	const start = parseIsoDate(startIso);
	const end = parseIsoDate(endIso);

	if (!(start && end)) {
		return 1;
	}

	return Math.max(
		1,
		Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1
	);
};

const monthsBetween = (startIso: string, endIso: string) => {
	const start = parseIsoDate(startIso);
	const end = parseIsoDate(endIso);

	if (!(start && end)) {
		return [];
	}

	const months = new Set<number>();
	const cursor = new Date(start.getTime());
	const last = Math.max(end.getTime(), start.getTime());

	while (cursor.getTime() <= last) {
		months.add(cursor.getUTCMonth() + 1);
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}

	return [...months];
};

const makeWindow = (startDate: string, endDate: string): SuggestionWindow => ({
	days: daysBetween(startDate, endDate),
	endDate,
	months: monthsBetween(startDate, endDate),
	startDate,
});

const resolveToday = (today?: string) =>
	(parseIsoDate(today) ? today?.slice(0, ISO_DATE_LENGTH) : undefined) ??
	toIsoDate(new Date());

/** The window to judge: the trip's dates, or the next six weeks when none are set. */
export const resolveSuggestionWindow = ({
	endDate,
	startDate,
	today,
}: Pick<SuggestionInput, "endDate" | "startDate" | "today">) => {
	if (parseIsoDate(startDate) && parseIsoDate(endDate)) {
		const start = startDate as string;
		const end = (endDate as string) < start ? start : (endDate as string);

		return {
			...makeWindow(
				start.slice(0, ISO_DATE_LENGTH),
				end.slice(0, ISO_DATE_LENGTH)
			),
			isDefault: false,
		};
	}

	const start = addDaysIso(resolveToday(today), DEFAULT_LEAD_DAYS);

	return {
		...makeWindow(start, addDaysIso(start, DEFAULT_WINDOW_DAYS)),
		isDefault: true,
	};
};

const monthValue = (destination: PhDestination, month: number) => {
	const risk = typhoonRiskByZone[destination.zone][month - 1] ?? 0;
	let base = 0;

	if (destination.bestMonths.includes(month)) {
		base = 2;
	} else if (destination.avoidMonths.includes(month)) {
		base = -2;
	}

	let penalty = 0;

	if (risk === 3) {
		penalty = 2;
	} else if (risk === 2) {
		penalty = 1;
	}

	return { risk, value: base - penalty };
};

const getMaxRisk = (destination: PhDestination, months: readonly number[]) =>
	months.reduce<TyphoonRisk>(
		(max, month) =>
			Math.max(
				max,
				typhoonRiskByZone[destination.zone][month - 1] ?? 0
			) as TyphoonRisk,
		0
	);

const getSeasonValue = (
	destination: PhDestination,
	months: readonly number[]
) => {
	if (months.length === 0) {
		return 0;
	}

	const total = months.reduce(
		(sum, month) => sum + monthValue(destination, month).value,
		0
	);

	return total / months.length;
};

const getBadge = (
	destination: PhDestination,
	months: readonly number[]
): SeasonBadge => {
	const value = getSeasonValue(destination, months);
	const maxRisk = getMaxRisk(destination, months);

	if (value >= 2 && maxRisk <= 1) {
		return { label: "Best season", tone: "best" };
	}

	if (value >= 0.5) {
		return { label: "Good season", tone: "good" };
	}

	if (maxRisk >= 2 && value > -2) {
		return { label: "Typhoon season", tone: "caution" };
	}

	if (value >= -0.5) {
		return { label: "Shoulder season", tone: "caution" };
	}

	return maxRisk >= 2
		? { label: "Typhoon season", tone: "avoid" }
		: { label: "Off season", tone: "avoid" };
};

const formatMonths = (
	months: readonly number[],
	destination: PhDestination
) => {
	const names = months.filter((month) =>
		destination.bestMonths.includes(month)
	);

	return names.map((month) => monthNames[month - 1]).join(", ");
};

const formatPhp = (value: number) =>
	`PHP ${Math.round(value).toLocaleString("en-US")}`;

const roundEstimate = (value: number) =>
	Math.round(value / ESTIMATE_ROUNDING_PHP) * ESTIMATE_ROUNDING_PHP;

const getTier = (input: SuggestionInput): BudgetPreference => {
	const preferences = input.preferences;
	const explicit = input.budgetPreference ?? preferences?.budgetPreference;

	if (preferences?.travelStyle === "luxury") {
		return "premium";
	}

	if (preferences?.travelStyle === "budget") {
		return "budget";
	}

	return explicit ?? "midRange";
};

const getDaily = (destination: PhDestination, tier: BudgetPreference) =>
	destination.dailyPhp[tier];

const getGroup = (input: SuggestionInput) =>
	input.group ?? input.preferences?.groupPreference;

const suitability = (level: SuitabilityLevel) => {
	if (level === "great") {
		return 8;
	}

	return level === "poor" ? -25 : 0;
};

const getSuggestedDays = (
	destination: PhDestination,
	window: SuggestionWindow,
	isDefault: boolean
) =>
	isDefault
		? Math.round((destination.idealDays.min + destination.idealDays.max) / 2)
		: window.days;

/**
 * Pick the soonest start date in the next year whose window is a good season
 * for this destination. Falls back to the least bad window.
 */
export const suggestTripWindow = (
	destination: PhDestination,
	today: string,
	days: number
): SuggestionWindow => {
	const length = Math.max(1, days);
	let best: { value: number; window: SuggestionWindow } | undefined;

	for (
		let offset = DEFAULT_LEAD_DAYS;
		offset <= SEARCH_HORIZON_DAYS;
		offset += SEARCH_STEP_DAYS
	) {
		const start = addDaysIso(today, offset);
		const window = makeWindow(start, addDaysIso(start, length - 1));
		const value =
			getSeasonValue(destination, window.months) -
			getMaxRisk(destination, window.months) * 0.1;

		if (value >= 1.5 && getMaxRisk(destination, window.months) <= 1) {
			return window;
		}

		if (!best || value > best.value) {
			best = { value, window };
		}
	}

	return (
		best?.window ??
		makeWindow(
			addDaysIso(today, DEFAULT_LEAD_DAYS),
			addDaysIso(today, DEFAULT_LEAD_DAYS + length - 1)
		)
	);
};

interface Tally {
	caveats: string[];
	reasons: string[];
	score: number;
}

interface ScoreContext {
	badge: SeasonBadge;
	days: number;
	destination: PhDestination;
	input: SuggestionInput;
	maxRisk: TyphoonRisk;
	tier: BudgetPreference;
	totalPhp: number;
	window: SuggestionWindow & { isDefault: boolean };
}

const scoreSeason = (context: ScoreContext, tally: Tally) => {
	const { badge, destination, maxRisk, window } = context;

	if (badge.tone === "best") {
		const bestNames = formatMonths(window.months, destination);
		tally.reasons.push(
			bestNames ? `Best weather in ${bestNames}` : "Best weather for your dates"
		);
	} else if (badge.tone === "good") {
		tally.reasons.push("Good weather for your dates");
	}

	for (const event of destination.events ?? []) {
		if (window.months.includes(event.month)) {
			tally.reasons.push(`${event.label} in ${monthNames[event.month - 1]}`);
			tally.score += 3;
		}
	}

	if (maxRisk >= 2) {
		tally.caveats.push(
			maxRisk === 3
				? "Peak typhoon season: pack a backup plan and book flexible fares."
				: "Typhoon season: pack a backup plan."
		);
	} else if (badge.tone === "avoid") {
		tally.caveats.push("Rough seas or heavy rain are likely; many tours stop.");
	}
};

const scoreInterests = (context: ScoreContext, tally: Tally) => {
	const interests =
		context.input.interests ?? context.input.preferences?.interests ?? [];
	const matched = interests.filter((interest) =>
		context.destination.interests.includes(interest)
	);

	tally.score += Math.min(matched.length, 3) * 6;

	if (matched.length > 0) {
		tally.reasons.push(
			`Matches your interest in ${matched
				.slice(0, 3)
				.map((interest) => interestLabels[interest])
				.join(" and ")}`
		);
	}
};

const scoreBudget = (context: ScoreContext, tally: Tally) => {
	const { destination, input, tier, totalPhp } = context;

	if (input.budgetAmount && input.budgetAmount > 0) {
		const ratio = input.budgetAmount / totalPhp;

		if (ratio >= 1) {
			tally.reasons.push(`Fits your ${formatPhp(input.budgetAmount)} budget`);
			tally.score += 6;
		} else if (ratio >= 0.8) {
			tally.caveats.push(
				`Likely a little over your budget (about ${formatPhp(totalPhp)}).`
			);
			tally.score -= 6;
		} else {
			tally.caveats.push(
				`Likely over your budget (about ${formatPhp(totalPhp)}).`
			);
			tally.score -= 22;
		}
		return;
	}

	if (tier === "budget" && destination.dailyPhp.midRange > 4500) {
		tally.caveats.push("Costs run high for a budget trip.");
		tally.score -= 6;
	} else if (tier === "budget" && destination.dailyPhp.midRange <= 3000) {
		tally.reasons.push("Easy on the budget");
		tally.score += 5;
	}
};

const scoreGroup = (context: ScoreContext, tally: Tally) => {
	const { destination, input } = context;
	const group = getGroup(input);
	const wantsKids = input.hasKids ?? group === "family";
	const needsEase =
		(input.hasSeniors ?? false) ||
		(input.preferences?.specialNeeds?.includes("accessibility") ?? false);

	if (wantsKids) {
		tally.score += suitability(destination.kids);

		if (destination.kids === "great") {
			tally.reasons.push("Easy with kids");
		} else if (destination.kids === "poor") {
			tally.caveats.push(
				"Long roads or steep walks make this hard with young children."
			);
		}
	}

	if (needsEase) {
		tally.score += suitability(destination.seniors);

		if (destination.seniors === "great") {
			tally.reasons.push("Easy for older travelers");
		} else if (destination.seniors === "poor") {
			tally.caveats.push("Demanding terrain; not ideal for older travelers.");
		}
	}

	const has = (...tags: TravelInterest[]) =>
		destination.interests.some((interest) => tags.includes(interest));

	if (group === "couple" && has("beaches", "wellness")) {
		tally.score += 3;
	} else if (group === "friends" && has("nightlife", "beaches")) {
		tally.score += 3;
	} else if (group === "work" && destination.intensity === 1) {
		tally.score += 4;
	}
};

const scorePace = (context: ScoreContext, tally: Tally) => {
	const pace = context.input.pace ?? context.input.preferences?.pacePreference;
	const { intensity } = context.destination;

	if (pace === "slow") {
		if (intensity === 1) {
			tally.score += 4;
		} else if (intensity === 3) {
			tally.score -= 8;
		}
	} else if (pace === "fast" && intensity >= 2) {
		tally.score += 3;
	}
};

const scoreLength = (context: ScoreContext, tally: Tally) => {
	const { destination, window } = context;

	if (window.isDefault) {
		return;
	}

	if (window.days < destination.idealDays.min) {
		tally.caveats.push(
			`Better with ${destination.idealDays.min} or more days.`
		);
		tally.score -= 8;
	} else if (window.days <= destination.idealDays.max + 1) {
		tally.reasons.push(`${window.days} days is about right`);
	} else if (window.days > destination.idealDays.max + 3) {
		tally.caveats.push(
			`Most people need ${destination.idealDays.max} days or fewer here.`
		);
		tally.score -= 3;
	}
};

const buildSuggestion = (
	destination: PhDestination,
	input: SuggestionInput,
	today: string,
	window: SuggestionWindow & { isDefault: boolean }
): DestinationSuggestion => {
	const tier = getTier(input);
	const travelers = Math.max(1, input.travelerCount ?? 1);
	const days = getSuggestedDays(destination, window, window.isDefault);
	const perDay = getDaily(destination, tier);
	const totalPhp = roundEstimate(
		(perDay * days + destination.airfarePhp) * travelers
	);
	const badge = getBadge(destination, window.months);
	const context: ScoreContext = {
		badge,
		days,
		destination,
		input,
		maxRisk: getMaxRisk(destination, window.months),
		tier,
		totalPhp,
		window,
	};
	const tally: Tally = {
		caveats: [],
		reasons: [],
		score: 50 + getSeasonValue(destination, window.months) * 12,
	};

	scoreSeason(context, tally);
	scoreInterests(context, tally);
	scoreBudget(context, tally);
	scoreGroup(context, tally);
	scorePace(context, tally);
	scoreLength(context, tally);

	if (destination.note) {
		tally.caveats.push(destination.note);
	}

	const isSeasonOk = badge.tone === "best" || badge.tone === "good";
	const suggestedWindow = isSeasonOk
		? makeWindow(window.startDate, addDaysIso(window.startDate, days - 1))
		: suggestTripWindow(destination, today, days);

	return {
		badge,
		caveats: tally.caveats,
		destination,
		estimate: { perPersonPerDayPhp: perDay, totalPhp },
		headline: tally.reasons[0] ?? tally.caveats[0] ?? destination.detail,
		reasons: tally.reasons,
		score: Math.round(tally.score),
		suggestedWindow,
		typhoonRisk: context.maxRisk,
		window: {
			days: window.days,
			endDate: window.endDate,
			months: window.months,
			startDate: window.startDate,
		},
	};
};

const normalizeExclusion = (value: string) => value.trim().toLowerCase();

/** Rank Philippine destinations for the traveler's dates, budget, group and tastes. */
export const rankPhilippineDestinations = (
	input: SuggestionInput = {}
): DestinationSuggestion[] => {
	const today = resolveToday(input.today);
	const window = resolveSuggestionWindow({ ...input, today });
	const excluded = new Set((input.exclude ?? []).map(normalizeExclusion));
	const suggestions: DestinationSuggestion[] = [];

	for (const destination of phDestinations) {
		const matchedByText = (input.exclude ?? []).some(
			(name) => findPhDestinationByName(name)?.id === destination.id
		);

		if (excluded.has(normalizeExclusion(destination.name)) || matchedByText) {
			continue;
		}

		suggestions.push(buildSuggestion(destination, input, today, window));
	}

	return suggestions
		.sort(
			(first, second) =>
				second.score - first.score ||
				first.destination.name.localeCompare(second.destination.name)
		)
		.slice(0, input.limit ?? DEFAULT_LIMIT);
};

/** Season and typhoon note for one destination on given dates. */
export const getSeasonRiskNote = ({
	destination,
	endDate,
	startDate,
	today,
}: {
	destination: string | PhDestination;
	endDate?: string;
	startDate?: string;
	today?: string;
}): SeasonRiskNote => {
	const resolved =
		typeof destination === "string"
			? findPhDestinationByName(destination)
			: destination;

	if (!resolved) {
		return {
			advice: [],
			badge: { label: "No season data", tone: "good" },
			destination: null,
			headline: "No season guidance for this destination yet.",
			isKnown: false,
			maxTyphoonRisk: 0,
		};
	}

	const window = resolveSuggestionWindow({ endDate, startDate, today });
	const badge = getBadge(resolved, window.months);
	const maxRisk = getMaxRisk(resolved, window.months);
	const advice: string[] = [];
	const monthLabel = window.months
		.map((month) => monthNames[month - 1])
		.join(" to ");

	if (maxRisk === 3) {
		advice.push(
			"Peak typhoon months: book flexible fares and refundable stays."
		);
		advice.push("Keep one spare day and a backup plan on land.");
	} else if (maxRisk === 2) {
		advice.push(
			"Typhoon season: check PAGASA forecasts a week out and pack a backup plan."
		);
	}

	if (
		resolved.avoidMonths.some((month) => window.months.includes(month)) &&
		maxRisk < 2
	) {
		advice.push(
			"Rough seas or heavy rain are common; island and boat tours may stop."
		);
	}

	if (resolved.note) {
		advice.push(resolved.note);
	}

	let headline = `${resolved.name} is in good shape for ${monthLabel}.`;

	if (badge.tone === "caution") {
		headline = `${monthLabel} is ${badge.label.toLowerCase()} in ${resolved.name}.`;
	} else if (badge.tone === "avoid") {
		headline = `${monthLabel} is a risky time for ${resolved.name}.`;
	}

	return {
		advice,
		badge,
		destination: resolved,
		headline,
		isKnown: true,
		maxTyphoonRisk: maxRisk,
	};
};

export interface SuggestForTripResult {
	alternatives: DestinationSuggestion[];
	current: DestinationSuggestion | null;
	riskNote: SeasonRiskNote | null;
}

/**
 * Trip-aware ideas: the season risk for the planned destination and ranked
 * alternatives that suit the same dates, budget, group and preferences.
 */
export const suggestForTrip = (
	input: SuggestionInput & { destination?: string }
): SuggestForTripResult => {
	const today = resolveToday(input.today);
	const window = resolveSuggestionWindow({ ...input, today });
	const currentDestination = input.destination
		? findPhDestinationByName(input.destination)
		: undefined;
	const riskNote = input.destination
		? getSeasonRiskNote({
				destination: currentDestination ?? input.destination,
				endDate: input.endDate,
				startDate: input.startDate,
				today,
			})
		: null;
	const current = currentDestination
		? buildSuggestion(currentDestination, input, today, window)
		: null;
	const alternatives = rankPhilippineDestinations({
		...input,
		exclude: [
			...(input.exclude ?? []),
			...(input.destination ? [input.destination] : []),
		],
		today,
	});

	return { alternatives, current, riskNote };
};

/** Plain-language request for Viya to plan the suggested trip. */
export const buildPhilippinePlanPrompt = (
	suggestion: DestinationSuggestion
) => {
	const { destination, estimate, suggestedWindow } = suggestion;
	const caveat = suggestion.caveats[0];

	return [
		`Plan a ${suggestedWindow.days} day trip to ${destination.name}, ${destination.region}, Philippines starting ${suggestedWindow.startDate}.`,
		`Include a day-by-day outline, getting there (${destination.access.fromManila}), and a PHP budget around ${estimate.totalPhp.toLocaleString("en-US")}.`,
		caveat ? `Account for this: ${caveat}` : "",
	]
		.filter(Boolean)
		.join(" ");
};

/** Months of the year, exported for callers that format season ranges. */
export const monthsOfYear = allMonths;
