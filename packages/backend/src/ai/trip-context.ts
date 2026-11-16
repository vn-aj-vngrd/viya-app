import { getDateKeyInTimeZone } from "@viya-app/domain";

export const TRIP_CONTEXT_TIME_ZONE = "Asia/Manila";

/** Today as YYYY-MM-DD in Manila, the date every chat tool reasons in. */
export const getChatTodayKey = (ms: number = Date.now()) =>
	getDateKeyInTimeZone(ms, TRIP_CONTEXT_TIME_ZONE);

const maxContextChars = 24_000;
const maxNoteChars = 300;
const maxTextChars = 200;
const defaultListLimit = 40;
const minListLimit = 4;
const expenseListLimit = 30;

export interface TripContextSource {
	bookings: readonly Record<string, unknown>[];
	companions: readonly Record<string, unknown>[];
	documents?: readonly Record<string, unknown>[];
	expenses: readonly Record<string, unknown>[];
	itineraryDays: readonly Record<string, unknown>[];
	itineraryItems: readonly Record<string, unknown>[];
	notes: readonly Record<string, unknown>[];
	readinessItems: readonly Record<string, unknown>[];
	risks: readonly Record<string, unknown>[];
	savedPlaces: readonly Record<string, unknown>[];
	trip: Record<string, unknown>;
	vaultItems: readonly Record<string, unknown>[];
}

const clip = (value: unknown, max: number) =>
	typeof value === "string" && value.length > max
		? `${value.slice(0, max - 1)}...`
		: value;

const pick = (
	record: Record<string, unknown>,
	keys: readonly string[],
	maxText = maxTextChars
) => {
	const picked: Record<string, unknown> = {};

	for (const key of keys) {
		if (record[key] !== undefined && record[key] !== null) {
			picked[key] = clip(record[key], maxText);
		}
	}

	return picked;
};

type ListKey = Exclude<keyof TripContextSource, "trip">;

const listFields: Record<ListKey, readonly string[]> = {
	bookings: [
		"title",
		"type",
		"status",
		"provider",
		"startDateTime",
		"endDateTime",
		"locationName",
		"cost",
		"currency",
	],
	companions: ["name", "role", "notes"],
	documents: ["title", "type", "status", "expiryDate", "notes"],
	expenses: ["title", "category", "amount", "currency", "spentAt"],
	itineraryDays: ["date", "dayNumber", "title", "pace", "weatherNote"],
	itineraryItems: [
		"date",
		"title",
		"category",
		"locationName",
		"startTime",
		"endTime",
		"estimatedCost",
		"status",
	],
	notes: ["title", "body", "category"],
	readinessItems: ["title", "category", "status", "priority", "dueDate"],
	risks: ["title", "type", "severity", "status", "suggestedAction"],
	savedPlaces: ["title", "locationName", "category", "description"],
	vaultItems: ["title", "kind", "status", "extractedSummary", "note"],
};

const tripFields = [
	"title",
	"destination",
	"startDate",
	"endDate",
	"arrivalTime",
	"departureTime",
	"budgetAmount",
	"budgetCurrency",
	"travelStyle",
	"pace",
	"groupType",
	"travelerCount",
	"status",
	"readinessScore",
	"summary",
] as const;

const buildContext = (source: TripContextSource, limit: number) => {
	const context: Record<string, unknown> = {
		trip: pick(source.trip, tripFields, 400),
	};

	for (const key of Object.keys(listFields) as ListKey[]) {
		const rows = source[key] ?? [];
		const cap = key === "expenses" ? Math.min(limit, expenseListLimit) : limit;
		const textCap = key === "notes" ? maxNoteChars : maxTextChars;

		context[key] = rows
			.slice(0, cap)
			.map((row) => pick(row, listFields[key], textCap));
	}

	return context;
};

/**
 * One compact trip snapshot for every AI surface (chat, drafts, tools): trip
 * facts, schedule, money, bookings, readiness, risks, places, notes and
 * companions (names only, no contact details). Lists are trimmed until the JSON
 * fits the size budget.
 */
export const buildTripContextJson = (
	source: TripContextSource,
	maxChars = maxContextChars
) => {
	let limit = defaultListLimit;
	let json = JSON.stringify(buildContext(source, limit));

	while (json.length > maxChars && limit > minListLimit) {
		limit = Math.max(minListLimit, Math.floor(limit / 2));
		json = JSON.stringify(buildContext(source, limit));
	}

	return json;
};
