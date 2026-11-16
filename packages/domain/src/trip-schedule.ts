import { addDaysToKey, getTripDayCount } from "./trip-metrics";

const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/** Parses "9:00" or "09:00" into minutes since midnight; null when invalid. */
export const parseTimeOfDay = (value: string): number | null => {
	const match = TIME_PATTERN.exec(value.trim());

	if (!match) {
		return null;
	}

	const hours = Number(match[1]);
	const minutes = Number(match[2]);

	if (hours > 23 || minutes > 59) {
		return null;
	}

	return hours * MINUTES_PER_HOUR + minutes;
};

/** Canonical zero-padded "HH:MM", or null when the input is not a time. */
export const normalizeTimeOfDay = (value: string): string | null => {
	const minutes = parseTimeOfDay(value);

	if (minutes === null) {
		return null;
	}

	const hours = Math.floor(minutes / MINUTES_PER_HOUR);

	return `${String(hours).padStart(2, "0")}:${String(minutes % MINUTES_PER_HOUR).padStart(2, "0")}`;
};

/** Numeric time compare; unparseable times sort last. */
export const compareTimesOfDay = (first: string, second: string): number => {
	const firstMinutes = parseTimeOfDay(first) ?? MINUTES_PER_DAY;
	const secondMinutes = parseTimeOfDay(second) ?? MINUTES_PER_DAY;

	return firstMinutes - secondMinutes;
};

/** Minutes from start to end; an end before start means it runs past midnight. */
export const getDurationMinutes = (start: string, end: string): number => {
	const startMinutes = parseTimeOfDay(start);
	const endMinutes = parseTimeOfDay(end);

	if (startMinutes === null || endMinutes === null) {
		return 0;
	}

	return endMinutes >= startMinutes
		? endMinutes - startMinutes
		: endMinutes + MINUTES_PER_DAY - startMinutes;
};

interface ScheduledItem {
	endTime: string;
	id: string;
	startTime: string;
	title: string;
}

export interface ItineraryConflict {
	firstId: string;
	reason: "overlap";
	secondId: string;
}

/** Pairs of items on the same day whose time ranges overlap. */
export const findItineraryConflicts = (
	items: readonly ScheduledItem[]
): ItineraryConflict[] => {
	const ranged = items
		.map((item) => ({
			end: parseTimeOfDay(item.endTime),
			id: item.id,
			start: parseTimeOfDay(item.startTime),
		}))
		.filter(
			(item): item is { end: number; id: string; start: number } =>
				item.start !== null && item.end !== null && item.end > item.start
		)
		.sort((first, second) => first.start - second.start);
	const conflicts: ItineraryConflict[] = [];

	ranged.forEach((current, index) => {
		for (const other of ranged.slice(index + 1)) {
			if (other.start >= current.end) {
				break;
			}

			conflicts.push({
				firstId: current.id,
				reason: "overlap",
				secondId: other.id,
			});
		}
	});

	return conflicts;
};

const getDaysBetween = (from: string, to: string): number => {
	if (to >= from) {
		return (getTripDayCount(from, to) ?? 1) - 1;
	}

	return -((getTripDayCount(to, from) ?? 1) - 1);
};

interface ExistingDay {
	date: string;
	dayNumber: number;
	hasItems: boolean;
	id: string;
}

export interface ItineraryDayPlan {
	create: { date: string; dayNumber: number }[];
	/** Empty days that fall past the new end date. */
	remove: string[];
	/** Existing days whose date or number must change to match the range. */
	update: { dayNumber: number; date: string; id: string }[];
}

/**
 * Aligns itinerary days to a trip's date range. Day N always sits on
 * startDate + N - 1. Days with items are never removed, even past the end.
 */
export const planItineraryDaysForRange = (
	startDate: string,
	endDate: string,
	existing: readonly ExistingDay[],
	previousStartDate?: string
): ItineraryDayPlan => {
	const total = getTripDayCount(startDate, endDate) ?? 0;

	if (previousStartDate) {
		return planShiftedDays(startDate, total, existing, previousStartDate);
	}

	const sorted = [...existing].sort(
		(first, second) => first.dayNumber - second.dayNumber
	);
	const plan: ItineraryDayPlan = { create: [], remove: [], update: [] };

	let kept = 0;

	for (const day of sorted) {
		if (kept + 1 > total && !day.hasItems) {
			plan.remove.push(day.id);
			continue;
		}

		const dayNumber = kept + 1;
		const date = addDaysToKey(startDate, kept);
		kept += 1;

		if (day.date !== date || day.dayNumber !== dayNumber) {
			plan.update.push({ date, dayNumber, id: day.id });
		}
	}

	for (let dayNumber = kept + 1; dayNumber <= total; dayNumber += 1) {
		plan.create.push({
			date: addDaysToKey(startDate, dayNumber - 1),
			dayNumber,
		});
	}

	return plan;
};

/** Moves every day by the start-date change so gaps and item dates are kept. */
const planShiftedDays = (
	startDate: string,
	total: number,
	existing: readonly ExistingDay[],
	previousStartDate: string
): ItineraryDayPlan => {
	const delta = getDaysBetween(previousStartDate, startDate);
	const plan: ItineraryDayPlan = { create: [], remove: [], update: [] };
	const taken = new Set<number>();

	for (const day of [...existing].sort(
		(first, second) => first.dayNumber - second.dayNumber
	)) {
		const date = addDaysToKey(day.date, delta);
		const dayNumber = getDaysBetween(startDate, date) + 1;
		const isInRange = dayNumber >= 1 && dayNumber <= total;

		if (!(isInRange || day.hasItems)) {
			plan.remove.push(day.id);
			continue;
		}

		taken.add(dayNumber);

		if (day.date !== date || day.dayNumber !== dayNumber) {
			plan.update.push({ date, dayNumber, id: day.id });
		}
	}

	for (let dayNumber = 1; dayNumber <= total; dayNumber += 1) {
		if (!taken.has(dayNumber)) {
			plan.create.push({
				date: addDaysToKey(startDate, dayNumber - 1),
				dayNumber,
			});
		}
	}

	return plan;
};
