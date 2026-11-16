import { addDaysToKey, getDayOffset } from "./trip-metrics";
import type { ReadinessCategory } from "./types";

const ISO_DATE_PATTERN = /\b(20\d{2}-\d{2}-\d{2})\b/g;
const REGEX_SPECIAL_PATTERN = /[.*+?^${}()|[\]\\]/g;
const PLACEHOLDER_LEAD_DAYS = 14;
const PLACEHOLDER_TRIP_DAYS = 3;

const keywordRegexCache = new Map<string, RegExp>();

/** Word-boundary match (optional plural), so "id" does not match "paid". */
export const matchesKeyword = (text: string, keyword: string): boolean => {
	let regex = keywordRegexCache.get(keyword);

	if (!regex) {
		const escaped = keyword.replace(REGEX_SPECIAL_PATTERN, "\\$&");
		regex = new RegExp(`\\b${escaped}(?:s|es)?\\b`, "i");
		keywordRegexCache.set(keyword, regex);
	}

	return regex.test(text);
};

const matchesAny = (text: string, keywords: readonly string[]): boolean =>
	keywords.some((keyword) => matchesKeyword(text, keyword));

export const getBlueprintReadinessCategory = (
	item: string
): ReadinessCategory => {
	if (matchesAny(item, ["passport", "visa", "id", "document"])) {
		return "documents";
	}

	if (matchesAny(item, ["booking", "book", "reserve", "reservation"])) {
		return "bookings";
	}

	if (matchesAny(item, ["flight", "ferry", "transfer", "transport"])) {
		return "transport";
	}

	if (matchesAny(item, ["budget", "cash", "cost"])) {
		return "budget";
	}

	if (matchesAny(item, ["weather", "rain"])) {
		return "weather";
	}

	if (matchesAny(item, ["safety", "emergency"])) {
		return "safety";
	}

	if (matchesAny(item, ["pack", "packing"])) {
		return "packing";
	}

	return "schedule";
};

export const getBlueprintTravelStyle = (items: readonly string[]): string => {
	const text = items.join(" ");

	if (matchesAny(text, ["luxury", "premium"])) {
		return "luxury";
	}

	if (matchesKeyword(text, "budget")) {
		return "budget";
	}

	if (matchesKeyword(text, "adventure")) {
		return "adventure";
	}

	if (matchesAny(text, ["relaxed", "laid-back", "slow"])) {
		return "relaxed";
	}

	if (matchesAny(text, ["packed", "fast"])) {
		return "packed";
	}

	return "balanced";
};

export const getBlueprintPace = (items: readonly string[]): string => {
	const text = items.join(" ");

	if (matchesAny(text, ["relaxed", "laid-back", "slow", "light"])) {
		return "slow";
	}

	if (matchesAny(text, ["packed", "fast"])) {
		return "fast";
	}

	return "moderate";
};

export const getBlueprintGroupType = (items: readonly string[]): string => {
	const text = items.join(" ");

	if (matchesKeyword(text, "family")) {
		return "family";
	}

	if (matchesKeyword(text, "friend")) {
		return "friends";
	}

	if (matchesAny(text, ["work", "business"])) {
		return "work";
	}

	if (matchesAny(text, ["couple", "partner", "2"])) {
		return "couple";
	}

	return "solo";
};

export type BlueprintBookingType =
	| "flight"
	| "hotel"
	| "activity"
	| "transport"
	| "other";

export const getBlueprintBookingType = (item: string): BlueprintBookingType => {
	if (matchesKeyword(item, "flight")) {
		return "flight";
	}

	if (
		matchesAny(item, ["hotel", "stay", "accommodation", "resort", "hostel"])
	) {
		return "hotel";
	}

	if (matchesAny(item, ["tour", "activity", "ticket"])) {
		return "activity";
	}

	if (matchesAny(item, ["ferry", "transfer", "transport"])) {
		return "transport";
	}

	return "other";
};

export type BlueprintRiskType =
	| "weather"
	| "budget"
	| "booking"
	| "transport"
	| "fatigue"
	| "safety"
	| "unknown";

export const getBlueprintRiskType = (item: string): BlueprintRiskType => {
	if (matchesAny(item, ["weather", "rain", "typhoon"])) {
		return "weather";
	}

	if (matchesAny(item, ["budget", "cost"])) {
		return "budget";
	}

	if (matchesAny(item, ["booking", "hotel", "availability"])) {
		return "booking";
	}

	if (matchesAny(item, ["flight", "ferry", "transfer", "transport"])) {
		return "transport";
	}

	if (matchesAny(item, ["tired", "fatigue"])) {
		return "fatigue";
	}

	if (matchesKeyword(item, "safety")) {
		return "safety";
	}

	return "unknown";
};

export type BlueprintRiskSeverity = "low" | "medium" | "high" | "critical";

export const getBlueprintRiskSeverity = (
	item: string
): BlueprintRiskSeverity => {
	if (matchesAny(item, ["critical", "major"])) {
		return "critical";
	}

	if (matchesKeyword(item, "high")) {
		return "high";
	}

	if (matchesKeyword(item, "low")) {
		return "low";
	}

	return "medium";
};

export interface BlueprintDateRange {
	endDate: string;
	/** True when the blueprint had no usable dates and these are stand-ins. */
	isPlaceholder: boolean;
	startDate: string;
}

/**
 * Picks the trip range from blueprint date lines. Only real calendar dates
 * count. With none, returns a short placeholder range so the trip and its
 * itinerary days stay valid (never an empty start date).
 */
export const resolveBlueprintDateRange = (
	dateLines: readonly string[],
	todayKey: string
): BlueprintDateRange => {
	const found = Array.from(dateLines.join(" ").matchAll(ISO_DATE_PATTERN))
		.map((match) => match[1] ?? "")
		.filter((key) => key !== "" && getDayOffset(key, key) !== null);

	if (found.length === 0) {
		const startDate = addDaysToKey(todayKey, PLACEHOLDER_LEAD_DAYS);

		return {
			endDate: addDaysToKey(startDate, PLACEHOLDER_TRIP_DAYS - 1),
			isPlaceholder: true,
			startDate,
		};
	}

	const first = found[0] ?? "";
	const second = found[1] ?? first;
	const startDate = first <= second ? first : second;
	const endDate = first <= second ? second : first;

	return { endDate, isPlaceholder: false, startDate };
};
