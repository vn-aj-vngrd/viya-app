import type {
	BudgetPreference,
	FoodPreference,
	PacePreference,
	PlanningStyle,
	SpecialNeed,
	TravelInterest,
	TravelStyle,
	UserGroupPreference,
	UserPreferences,
} from "./types";

export interface PreferenceOption<TValue extends string> {
	description: string;
	label: string;
	value: TValue;
}

export interface PreferencePromptSuggestion {
	accent: string;
	icon: string;
	prompt: string;
	soft: string;
	title: string;
}

export interface PreferenceHomeSuggestion {
	subtitle: string;
	title: string;
	tone: string;
}

export interface PreferenceSuggestions {
	home: PreferenceHomeSuggestion;
	prompts: PreferencePromptSuggestion[];
}

export const travelStyleOptions = [
	{
		description: "Keep days easy, comfortable, and low pressure.",
		label: "Relaxed",
		value: "relaxed",
	},
	{
		description: "Mix highlights, rest, and practical timing.",
		label: "Balanced",
		value: "balanced",
	},
	{
		description: "Fit more into each day with tighter timing.",
		label: "Packed",
		value: "packed",
	},
	{
		description: "Prioritize discovery, movement, and active choices.",
		label: "Adventure",
		value: "adventure",
	},
	{
		description: "Prefer premium stays, comfort, and polished plans.",
		label: "Luxury",
		value: "luxury",
	},
	{
		description: "Maximize value and keep costs visible.",
		label: "Budget",
		value: "budget",
	},
] as const satisfies readonly PreferenceOption<TravelStyle>[];

export const pacePreferenceOptions = [
	{
		description: "Leave space between activities.",
		label: "Slow",
		value: "slow",
	},
	{
		description: "Plan a realistic day with room to adjust.",
		label: "Moderate",
		value: "moderate",
	},
	{
		description: "Move quickly and cover more ground.",
		label: "Fast",
		value: "fast",
	},
] as const satisfies readonly PreferenceOption<PacePreference>[];

export const budgetPreferenceOptions = [
	{
		description: "Find the best value and avoid surprise costs.",
		label: "Budget",
		value: "budget",
	},
	{
		description: "Balance comfort, quality, and price.",
		label: "Mid-range",
		value: "midRange",
	},
	{
		description: "Prefer smoother, higher-comfort options.",
		label: "Premium",
		value: "premium",
	},
] as const satisfies readonly PreferenceOption<BudgetPreference>[];

export const travelInterestOptions = [
	{
		description: "Views, parks, hikes, and outdoor time.",
		label: "Nature",
		value: "nature",
	},
	{
		description: "Local food, cafes, markets, and restaurants.",
		label: "Food",
		value: "food",
	},
	{
		description: "History, art, neighborhoods, and local life.",
		label: "Culture",
		value: "culture",
	},
	{
		description: "Markets, boutiques, malls, and souvenirs.",
		label: "Shopping",
		value: "shopping",
	},
	{
		description: "Bars, shows, music, and late-night plans.",
		label: "Nightlife",
		value: "nightlife",
	},
	{
		description: "Spa, quiet mornings, and slower recovery time.",
		label: "Wellness",
		value: "wellness",
	},
	{
		description: "Coasts, islands, swims, and sunsets.",
		label: "Beaches",
		value: "beaches",
	},
	{
		description: "Less obvious finds and local discoveries.",
		label: "Hidden gems",
		value: "hiddenGems",
	},
] as const satisfies readonly PreferenceOption<TravelInterest>[];

export const foodPreferenceOptions = [
	{
		description: "Prioritize local dishes and neighborhood spots.",
		label: "Local eats",
		value: "localEats",
	},
	{
		description: "Use trusted, popular, easy-to-book places.",
		label: "Popular spots",
		value: "popularSpots",
	},
	{
		description: "Keep dietary needs visible in suggestions.",
		label: "Dietary-aware",
		value: "dietaryAware",
	},
	{
		description: "Suggest food when it helps, but stay flexible.",
		label: "Flexible",
		value: "flexible",
	},
	{
		description: "Focus less on meals and more on the trip plan.",
		label: "Low priority",
		value: "lowPriority",
	},
] as const satisfies readonly PreferenceOption<FoodPreference>[];

export const groupPreferenceOptions = [
	{
		description: "Plan around your own pace and priorities.",
		label: "Solo",
		value: "solo",
	},
	{
		description: "Balance shared time, comfort, and memorable meals.",
		label: "Couple",
		value: "couple",
	},
	{
		description: "Keep logistics, breaks, and flexibility visible.",
		label: "Family",
		value: "family",
	},
	{
		description: "Support group decisions and shared activities.",
		label: "Friends",
		value: "friends",
	},
	{
		description: "Keep plans reliable, efficient, and work-aware.",
		label: "Work",
		value: "work",
	},
	{
		description: "Adapt depending on the trip.",
		label: "Varies",
		value: "varies",
	},
] as const satisfies readonly PreferenceOption<UserGroupPreference>[];

export const planningStyleOptions = [
	{
		description: "Give Viya room to recommend a clear next step.",
		label: "Viya decides",
		value: "decideForMe",
	},
	{
		description: "Compare a few good choices before committing.",
		label: "Give me options",
		value: "giveOptions",
	},
	{
		description: "Keep plans mostly yours, but surface issues early.",
		label: "Only flag risks",
		value: "flagRisks",
	},
] as const satisfies readonly PreferenceOption<PlanningStyle>[];

export const specialNeedOptions = [
	{
		description: "Prefer step-free, easier, or lower-friction plans.",
		label: "Accessibility",
		value: "accessibility",
	},
	{
		description: "Keep food restrictions visible.",
		label: "Dietary restrictions",
		value: "dietaryRestrictions",
	},
	{
		description: "You are comfortable starting days early.",
		label: "Early starts",
		value: "earlyStarts",
	},
	{
		description: "Protect recovery time and avoid overpacking days.",
		label: "Rest breaks",
		value: "restBreaks",
	},
	{
		description: "No special requirements for now.",
		label: "None",
		value: "none",
	},
] as const satisfies readonly PreferenceOption<SpecialNeed>[];

export const defaultUserPreferences = {
	accessibilityNeeds: "None",
	budgetPreference: "midRange",
	foodPreference: "flexible",
	groupPreference: "varies",
	interests: ["culture"],
	notificationPreference: "Important readiness and day-of travel alerts",
	pacePreference: "moderate",
	planningStyle: "giveOptions",
	preferredRestLevel: "One slower block per trip day",
	preferredStartTime: "09:00",
	specialNeeds: ["none"],
	specialNeedsNote: null,
	travelStyle: "balanced",
} as const satisfies UserPreferences;

const hasInterest = (preferences: UserPreferences, interest: TravelInterest) =>
	preferences.interests.includes(interest);

const normalizePreferences = (
	preferences: Partial<UserPreferences>
): UserPreferences => ({
	...defaultUserPreferences,
	...preferences,
	interests:
		preferences.interests && preferences.interests.length > 0
			? preferences.interests
			: defaultUserPreferences.interests,
	specialNeeds:
		preferences.specialNeeds && preferences.specialNeeds.length > 0
			? preferences.specialNeeds
			: defaultUserPreferences.specialNeeds,
});

const getHomeSuggestion = (
	preferences: UserPreferences
): PreferenceHomeSuggestion => {
	if (preferences.planningStyle === "flagRisks") {
		return {
			subtitle:
				"Use your preferences to spot readiness gaps, timing pressure, and avoidable travel friction.",
			title: "Check the smartest next risk",
			tone: "risk",
		};
	}

	if (
		preferences.travelStyle === "relaxed" &&
		preferences.pacePreference === "slow" &&
		hasInterest(preferences, "beaches")
	) {
		return {
			subtitle:
				"Start with a beach plan that leaves room for rest, sunsets, and flexible meals.",
			title: "Plan a slower beach escape",
			tone: "calm",
		};
	}

	if (
		preferences.pacePreference === "fast" &&
		(hasInterest(preferences, "food") || hasInterest(preferences, "hiddenGems"))
	) {
		return {
			subtitle:
				"Stack food stops, hidden gems, and nearby discoveries without losing track of timing.",
			title: "Build a fast local discovery plan",
			tone: "active",
		};
	}

	if (preferences.budgetPreference === "budget") {
		return {
			subtitle:
				"Compare value-first options and keep transport, meals, and buffers visible.",
			title: "Find a smarter value route",
			tone: "budget",
		};
	}

	return {
		subtitle:
			"Balance highlights, logistics, rest, and budget before you commit to bookings.",
		title: "Shape a balanced trip plan",
		tone: "balanced",
	};
};

const getPrimaryPrompt = (preferences: UserPreferences) => {
	if (preferences.planningStyle === "flagRisks") {
		return "Check my readiness risks before I start booking.";
	}

	if (
		preferences.travelStyle === "relaxed" &&
		preferences.pacePreference === "slow" &&
		hasInterest(preferences, "beaches")
	) {
		return "Help me plan a slow beach trip with rest time and simple logistics.";
	}

	if (
		preferences.pacePreference === "fast" &&
		(hasInterest(preferences, "food") || hasInterest(preferences, "hiddenGems"))
	) {
		return "Build a fast food crawl with hidden gems and realistic travel time.";
	}

	return "Help me shape a balanced trip plan with options I can compare.";
};

export const getPreferenceSuggestions = (
	preferences: Partial<UserPreferences>
): PreferenceSuggestions => {
	const normalizedPreferences = normalizePreferences(preferences);
	const home = getHomeSuggestion(normalizedPreferences);
	const primaryPrompt = getPrimaryPrompt(normalizedPreferences);
	const foodPrompt =
		normalizedPreferences.foodPreference === "localEats"
			? "Find local eats that fit my route without making the day too tight."
			: "Suggest meal breaks that fit the plan and budget.";
	const budgetPrompt =
		normalizedPreferences.budgetPreference === "premium"
			? "Compare premium options that save time and reduce friction."
			: "Build a trip budget with meals, transport, activities, and buffer.";
	const readinessPrompt =
		normalizedPreferences.specialNeeds.includes("restBreaks") ||
		normalizedPreferences.pacePreference === "slow"
			? "Check whether this plan leaves enough rest time between activities."
			: "Check what I should prepare before this trip.";

	return {
		home,
		prompts: [
			{
				accent: "#0A84FF",
				icon: "map-outline",
				prompt: primaryPrompt,
				soft: "#EAF2FF",
				title: "Plan my style",
			},
			{
				accent: "#059669",
				icon: "shield-checkmark-outline",
				prompt: readinessPrompt,
				soft: "#E4F8EF",
				title: "Check readiness",
			},
			{
				accent: "#E97816",
				icon: "cash-outline",
				prompt: budgetPrompt,
				soft: "#FFF1DA",
				title: "Tune budget",
			},
			{
				accent: "#DB2777",
				icon: "restaurant-outline",
				prompt: foodPrompt,
				soft: "#FCE7F3",
				title: "Find food",
			},
		],
	};
};

const joinList = (values: readonly string[]) =>
	values.length > 0 ? values.join(", ") : "none";

export const formatPreferenceContext = (
	preferences: Partial<UserPreferences>
) => {
	const normalizedPreferences = normalizePreferences(preferences);

	return [
		"Traveler preference context:",
		`- Travel style: ${normalizedPreferences.travelStyle}`,
		`- Pace: ${normalizedPreferences.pacePreference}`,
		`- Budget comfort: ${normalizedPreferences.budgetPreference}`,
		`- Interests: ${joinList(normalizedPreferences.interests)}`,
		`- Planning style: ${normalizedPreferences.planningStyle}`,
		`- Special needs: ${joinList(normalizedPreferences.specialNeeds)}`,
		"",
		"Use these as defaults when suggesting trips, but do not invent actual bookings, dates, or confirmed destination details.",
	].join("\n");
};
