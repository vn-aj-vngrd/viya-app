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

export interface PreferenceExploreSuggestion {
	accent: string;
	icon: string;
	prompt: string;
	subtitle: string;
	title: string;
}

export interface PreferenceCountrySuggestion {
	accent: string;
	country: string;
	detail: string;
	duration: string;
	icon: string;
	prompt: string;
}

export interface PreferencePlaceSuggestion {
	accent: string;
	location: string;
	prompt: string;
	tag: string;
}

export interface PreferenceSuggestions {
	countrySuggestions: PreferenceCountrySuggestion[];
	exploreIdeas: PreferenceExploreSuggestion[];
	home: PreferenceHomeSuggestion;
	placeSuggestions: PreferencePlaceSuggestion[];
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

const joinList = (values: readonly string[]) =>
	values.length > 0 ? values.join(", ") : "none";

interface PreferenceRecommendationProfile {
	budgetPreferences?: readonly BudgetPreference[];
	country: Omit<PreferenceCountrySuggestion, "prompt"> & { prompt: string };
	exploreIdea: PreferenceExploreSuggestion;
	foodPreferences?: readonly FoodPreference[];
	groupPreferences?: readonly UserGroupPreference[];
	interests?: readonly TravelInterest[];
	pacePreferences?: readonly PacePreference[];
	place: PreferencePlaceSuggestion;
	planningStyles?: readonly PlanningStyle[];
	specialNeeds?: readonly SpecialNeed[];
	travelStyles?: readonly TravelStyle[];
}

const preferenceRecommendationProfiles = [
	{
		country: {
			accent: "#0A84FF",
			country: "Japan",
			detail: "Clean transit, food alleys, design shops",
			duration: "5-7 days",
			icon: "train-outline",
			prompt:
				"Suggest a Japan route with clean transit, food neighborhoods, design shops, and realistic day pacing.",
		},
		exploreIdea: {
			accent: "#0A84FF",
			icon: "storefront-outline",
			prompt:
				"Suggest city trips with culture, shopping, excellent transit, and meals that anchor each day.",
			subtitle: "Transit-friendly cities with food and design stops.",
			title: "City culture loops",
		},
		interests: ["culture", "shopping", "food"],
		pacePreferences: ["moderate", "fast"],
		place: {
			accent: "#0A84FF",
			location: "Tokyo side streets",
			prompt:
				"Build a Tokyo plan around side streets, neighborhood food, design shops, and simple transit hops.",
			tag: "City wander",
		},
		travelStyles: ["balanced", "luxury"],
	},
	{
		country: {
			accent: "#059669",
			country: "Vietnam",
			detail: "Street food, old quarters, coastal add-ons",
			duration: "4-6 days",
			icon: "cafe-outline",
			prompt:
				"Suggest a Vietnam trip with street food, old quarters, local cafes, and one easy coastal add-on.",
		},
		exploreIdea: {
			accent: "#059669",
			icon: "restaurant-outline",
			prompt:
				"Suggest food-first destinations with neighborhood routes, local markets, and memorable dinners.",
			subtitle: "Local meals, markets, and compact routes.",
			title: "Food-led routes",
		},
		foodPreferences: ["localEats"],
		interests: ["food", "culture", "hiddenGems"],
		pacePreferences: ["moderate", "fast"],
		place: {
			accent: "#059669",
			location: "Hanoi food lanes",
			prompt:
				"Build a Hanoi itinerary around local food lanes, coffee stops, old-quarter walks, and low-friction timing.",
			tag: "Local eats",
		},
		travelStyles: ["adventure", "budget", "balanced"],
	},
	{
		budgetPreferences: ["budget"],
		country: {
			accent: "#E97816",
			country: "Taiwan",
			detail: "Night markets, trains, mountain towns",
			duration: "4-6 days",
			icon: "map-outline",
			prompt:
				"Suggest a Taiwan route with night markets, trains, mountain towns, and clear value tradeoffs.",
		},
		exploreIdea: {
			accent: "#E97816",
			icon: "cash-outline",
			prompt:
				"Suggest value-first routes with easy transit, strong food options, and visible daily budget tradeoffs.",
			subtitle: "Good food, reliable transit, and cost control.",
			title: "Smart value routes",
		},
		interests: ["food", "shopping", "culture"],
		place: {
			accent: "#E97816",
			location: "Taipei night markets",
			prompt:
				"Build a Taipei plan around night markets, easy train rides, and budget-aware neighborhood days.",
			tag: "Value trip",
		},
		travelStyles: ["budget", "balanced"],
	},
	{
		country: {
			accent: "#DB2777",
			country: "Thailand",
			detail: "Islands, night markets, wellness days",
			duration: "5-8 days",
			icon: "sunny-outline",
			prompt:
				"Suggest a Thailand trip with islands, night markets, wellness time, and a flexible daily rhythm.",
		},
		exploreIdea: {
			accent: "#DB2777",
			icon: "sunny-outline",
			prompt:
				"Suggest beach trips with sunset time, relaxed logistics, and food stops that do not crowd the day.",
			subtitle: "Coasts, swims, and room to breathe.",
			title: "Slow beach escapes",
		},
		interests: ["beaches", "wellness", "food"],
		pacePreferences: ["slow", "moderate"],
		place: {
			accent: "#DB2777",
			location: "Koh Samui slow coast",
			prompt:
				"Build a Koh Samui route with quiet beaches, wellness mornings, sunset meals, and simple transfers.",
			tag: "Slow coast",
		},
		travelStyles: ["relaxed", "luxury", "balanced"],
	},
	{
		country: {
			accent: "#7C3AED",
			country: "South Korea",
			detail: "Cafe districts, shopping streets, late nights",
			duration: "5-7 days",
			icon: "sparkles-outline",
			prompt:
				"Suggest a South Korea trip with cafe districts, shopping streets, culture stops, and optional late nights.",
		},
		exploreIdea: {
			accent: "#7C3AED",
			icon: "moon-outline",
			prompt:
				"Suggest city trips with shopping, cafes, nightlife options, and enough structure for a group.",
			subtitle: "Cafe districts, shopping, and optional late nights.",
			title: "After-dark city breaks",
		},
		groupPreferences: ["friends", "couple"],
		interests: ["shopping", "nightlife", "food"],
		pacePreferences: ["moderate", "fast"],
		place: {
			accent: "#7C3AED",
			location: "Seoul cafe districts",
			prompt:
				"Build a Seoul trip around cafe districts, local shopping, culture stops, and calm evening walks.",
			tag: "City social",
		},
		travelStyles: ["balanced", "packed"],
	},
	{
		country: {
			accent: "#0F766E",
			country: "Singapore",
			detail: "Simple transit, family logistics, polished food",
			duration: "3-5 days",
			icon: "people-outline",
			prompt:
				"Suggest a Singapore trip with simple transit, family-friendly pacing, polished food, and weather backups.",
		},
		exploreIdea: {
			accent: "#0F766E",
			icon: "people-outline",
			prompt:
				"Suggest group-friendly city trips with simple transit, flexible stops, and reliable food options.",
			subtitle: "Low-friction logistics for mixed interests.",
			title: "Group-friendly picks",
		},
		groupPreferences: ["family", "friends", "work"],
		interests: ["food", "culture", "shopping"],
		place: {
			accent: "#0F766E",
			location: "Singapore garden loop",
			prompt:
				"Build a Singapore plan with garden time, hawker meals, easy transit, and flexible group breaks.",
			tag: "Easy logistics",
		},
		specialNeeds: ["accessibility", "restBreaks"],
		travelStyles: ["balanced", "luxury"],
	},
	{
		country: {
			accent: "#16A34A",
			country: "New Zealand",
			detail: "Scenic drives, easy hikes, nature stays",
			duration: "7-10 days",
			icon: "leaf-outline",
			prompt:
				"Suggest a New Zealand route with scenic drives, easy hikes, nature stays, and protected rest time.",
		},
		exploreIdea: {
			accent: "#16A34A",
			icon: "leaf-outline",
			prompt:
				"Suggest nature-focused trips with scenic stays, easy hikes, and a balanced daily pace.",
			subtitle: "Fresh air, scenic stays, and slower days.",
			title: "Nature resets",
		},
		interests: ["nature", "wellness", "hiddenGems"],
		pacePreferences: ["slow", "moderate"],
		place: {
			accent: "#16A34A",
			location: "Queenstown scenic base",
			prompt:
				"Build a Queenstown plan with scenic drives, light hikes, view-led meals, and buffer time.",
			tag: "Nature base",
		},
		travelStyles: ["adventure", "relaxed", "luxury"],
	},
	{
		country: {
			accent: "#C2410C",
			country: "Indonesia",
			detail: "Slow coasts, wellness stays, local food",
			duration: "5-8 days",
			icon: "flower-outline",
			prompt:
				"Suggest an Indonesia trip with slow coasts, wellness stays, local food, and easy transfer days.",
		},
		exploreIdea: {
			accent: "#C2410C",
			icon: "flower-outline",
			prompt:
				"Suggest wellness-focused routes with quiet mornings, local food, and plenty of recovery time.",
			subtitle: "Wellness mornings and gentle coast days.",
			title: "Wellness coast days",
		},
		interests: ["wellness", "beaches", "nature"],
		pacePreferences: ["slow"],
		place: {
			accent: "#C2410C",
			location: "Bali slow coast",
			prompt:
				"Build a Bali route with quiet beaches, wellness mornings, local food, and simple logistics.",
			tag: "Slow travel",
		},
		specialNeeds: ["restBreaks"],
		travelStyles: ["relaxed", "luxury"],
	},
] as const satisfies readonly PreferenceRecommendationProfile[];

const scoreProfile = (
	preferences: UserPreferences,
	profile: PreferenceRecommendationProfile
) => {
	let score = 0;

	for (const interest of profile.interests ?? []) {
		if (preferences.interests.includes(interest)) {
			score += 4;
		}
	}

	if (profile.travelStyles?.includes(preferences.travelStyle)) {
		score += 3;
	}

	if (profile.pacePreferences?.includes(preferences.pacePreference)) {
		score += 3;
	}

	if (profile.budgetPreferences?.includes(preferences.budgetPreference)) {
		score += 2;
	}

	if (profile.foodPreferences?.includes(preferences.foodPreference)) {
		score += 2;
	}

	if (profile.groupPreferences?.includes(preferences.groupPreference)) {
		score += 2;
	}

	if (profile.planningStyles?.includes(preferences.planningStyle)) {
		score += 2;
	}

	if (
		profile.specialNeeds?.some((specialNeed) =>
			preferences.specialNeeds.includes(specialNeed)
		)
	) {
		score += 2;
	}

	return score;
};

const rankPreferenceProfiles = (preferences: UserPreferences) =>
	preferenceRecommendationProfiles
		.map((profile, index) => ({
			index,
			profile,
			score: scoreProfile(preferences, profile),
		}))
		.sort(
			(first, second) =>
				second.score - first.score || first.index - second.index
		)
		.map(({ profile }) => profile);

const collectUniqueRecommendations = <TRecommendation>(
	profiles: readonly PreferenceRecommendationProfile[],
	getRecommendation: (
		profile: PreferenceRecommendationProfile
	) => TRecommendation,
	getKey: (recommendation: TRecommendation) => string,
	limit: number
) => {
	const recommendations: TRecommendation[] = [];
	const seenKeys = new Set<string>();

	for (const profile of profiles) {
		const recommendation = getRecommendation(profile);
		const key = getKey(recommendation);

		if (seenKeys.has(key)) {
			continue;
		}

		seenKeys.add(key);
		recommendations.push(recommendation);

		if (recommendations.length >= limit) {
			return recommendations;
		}
	}

	return recommendations;
};

const createPersonalizedPrompt = (
	preferences: UserPreferences,
	request: string
) => {
	const interests = joinList(preferences.interests);
	const specialNeeds = preferences.specialNeeds.includes("none")
		? "no special constraints"
		: joinList(preferences.specialNeeds);

	return [
		request,
		`Use my travel preferences: ${preferences.travelStyle} style, ${preferences.pacePreference} pace, ${preferences.budgetPreference} budget comfort, interests in ${interests}, ${preferences.groupPreference} travel, and ${specialNeeds}.`,
	].join(" ");
};

const getPreferenceHomeRecommendations = (
	preferences: UserPreferences
): Pick<
	PreferenceSuggestions,
	"countrySuggestions" | "exploreIdeas" | "placeSuggestions"
> => {
	const rankedProfiles = rankPreferenceProfiles(preferences);
	const exploreIdeas = collectUniqueRecommendations(
		rankedProfiles,
		(profile) => profile.exploreIdea,
		(idea) => idea.title,
		4
	).map((idea) => ({
		...idea,
		prompt: createPersonalizedPrompt(preferences, idea.prompt),
	}));
	const countrySuggestions = collectUniqueRecommendations(
		rankedProfiles,
		(profile) => profile.country,
		(country) => country.country,
		4
	).map((country) => ({
		...country,
		prompt: createPersonalizedPrompt(preferences, country.prompt),
	}));
	const placeSuggestions = collectUniqueRecommendations(
		rankedProfiles,
		(profile) => profile.place,
		(place) => place.location,
		3
	).map((place) => ({
		...place,
		prompt: createPersonalizedPrompt(preferences, place.prompt),
	}));

	return {
		countrySuggestions,
		exploreIdeas,
		placeSuggestions,
	};
};

const getHomeSuggestion = (
	preferences: UserPreferences
): PreferenceHomeSuggestion => {
	if (preferences.planningStyle === "flagRisks") {
		return {
			subtitle:
				"Viya lists booking, document and timing gaps before you pay for anything.",
			title: "Check what could go wrong",
			tone: "risk",
		};
	}

	if (
		preferences.travelStyle === "relaxed" &&
		preferences.pacePreference === "slow" &&
		hasInterest(preferences, "beaches")
	) {
		return {
			subtitle: "Fewer stops a day, time to rest, simple transfers.",
			title: "Plan a slow beach trip",
			tone: "calm",
		};
	}

	if (
		preferences.pacePreference === "fast" &&
		(hasInterest(preferences, "food") || hasInterest(preferences, "hiddenGems"))
	) {
		return {
			subtitle:
				"Food stops and local spots with realistic travel time between them.",
			title: "Plan a food-first trip",
			tone: "active",
		};
	}

	if (preferences.budgetPreference === "budget") {
		return {
			subtitle:
				"Set a total in pesos and see transport, meals and stays against it.",
			title: "Plan a trip on a budget",
			tone: "budget",
		};
	}

	return {
		subtitle:
			"Tell Viya where, when and who is going. You get a day-by-day draft to edit.",
		title: "Plan your first trip",
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
	const homeRecommendations = getPreferenceHomeRecommendations(
		normalizedPreferences
	);
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
		...homeRecommendations,
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
