import { addDaysToKey, getDayOffset } from "./trip-metrics";
import {
	getDurationMinutes,
	normalizeTimeOfDay,
	parseTimeOfDay,
} from "./trip-schedule";

export type ItineraryTimingError =
	| "INVALID_START_TIME"
	| "INVALID_END_TIME"
	| "END_BEFORE_START";

export type ItineraryTimingResult =
	| {
			durationMinutes: number;
			endTime: string;
			ok: true;
			startTime: string;
	  }
	| { error: ItineraryTimingError; ok: false };

/**
 * Normalises start/end to "HH:MM" and derives the duration. An end at or
 * before the start is only valid when the stop explicitly runs overnight.
 */
export const validateItineraryTiming = ({
	endTime,
	overnight = false,
	startTime,
}: {
	endTime: string;
	overnight?: boolean;
	startTime: string;
}): ItineraryTimingResult => {
	const start = normalizeTimeOfDay(startTime);
	const end = normalizeTimeOfDay(endTime);

	if (!start) {
		return { error: "INVALID_START_TIME", ok: false };
	}

	if (!end) {
		return { error: "INVALID_END_TIME", ok: false };
	}

	if (end <= start && !overnight) {
		return { error: "END_BEFORE_START", ok: false };
	}

	return {
		durationMinutes: getDurationMinutes(start, end),
		endTime: end,
		ok: true,
		startTime: start,
	};
};

/** True when dateKey sits within the trip's inclusive date range. */
export const isDateWithinTripRange = (
	dateKey: string,
	startDate: string,
	endDate: string
): boolean => {
	const fromStart = getDayOffset(startDate, dateKey);
	const toEnd = getDayOffset(dateKey, endDate);

	return fromStart !== null && toEnd !== null && fromStart >= 0 && toEnd >= 0;
};

interface DayKey {
	date: string;
	dayNumber: number;
	id?: string;
}

/** Returns which field a candidate day collides on, if any. */
export const findDuplicateItineraryDay = (
	candidate: { date: string; dayNumber: number; id?: string },
	existing: readonly DayKey[]
): "date" | "dayNumber" | null => {
	for (const day of existing) {
		if (candidate.id && day.id === candidate.id) {
			continue;
		}

		if (day.dayNumber === candidate.dayNumber) {
			return "dayNumber";
		}

		if (day.date === candidate.date) {
			return "date";
		}
	}

	return null;
};

/** The date a new day number would sit on within a trip. */
export const getDateForDayNumber = (
	startDate: string,
	dayNumber: number
): string => addDaysToKey(startDate, dayNumber - 1);

const DEFAULT_SLOT_START = "09:00";
const DEFAULT_SLOT_MINUTES = 60;
const MINUTES_PER_HOUR = 60;
const LAST_MINUTE_OF_DAY = 23 * MINUTES_PER_HOUR + 59;

const toClock = (minutes: number) =>
	`${String(Math.floor(minutes / MINUTES_PER_HOUR)).padStart(2, "0")}:${String(minutes % MINUTES_PER_HOUR).padStart(2, "0")}`;

/**
 * First free slot of the given length that starts at or after dayStart and
 * does not overlap existing timed stops. Falls back to dayStart when the day
 * is too full to fit one before midnight.
 */
export const findNextFreeSlot = (
	items: readonly { endTime: string; startTime: string }[],
	durationMinutes: number = DEFAULT_SLOT_MINUTES,
	dayStart: string = DEFAULT_SLOT_START
): { endTime: string; startTime: string } => {
	const startMinutes = parseTimeOfDay(dayStart) ?? 9 * MINUTES_PER_HOUR;
	const ranges = items
		.map((item) => ({
			end: parseTimeOfDay(item.endTime),
			start: parseTimeOfDay(item.startTime),
		}))
		.filter(
			(range): range is { end: number; start: number } =>
				range.start !== null && range.end !== null && range.end > range.start
		)
		.sort((first, second) => first.start - second.start);
	let cursor = startMinutes;

	for (const range of ranges) {
		if (range.start < cursor + durationMinutes && range.end > cursor) {
			cursor = range.end;
		}
	}

	if (cursor + durationMinutes > LAST_MINUTE_OF_DAY) {
		cursor = startMinutes;
	}

	return {
		endTime: toClock(Math.min(cursor + durationMinutes, LAST_MINUTE_OF_DAY)),
		startTime: toClock(cursor),
	};
};

const BOOKING_ITEM_CATEGORY: Record<string, string> = {
	activity: "activity",
	flight: "flight",
	hotel: "hotel",
	insurance: "note",
	restaurant: "food",
	transport: "transport",
};

/** Itinerary category for a booking type. */
export const getItineraryCategoryForBooking = (type: string): string =>
	BOOKING_ITEM_CATEGORY[type] ?? "note";

const PLACE_ITEM_CATEGORIES = new Set([
	"activity",
	"food",
	"transport",
	"hotel",
	"rest",
	"shopping",
	"note",
	"flight",
	"emergency",
]);

/** Itinerary category for a saved place; unknown categories become activity. */
export const getItineraryCategoryForPlace = (category: string): string =>
	PLACE_ITEM_CATEGORIES.has(category) ? category : "activity";
