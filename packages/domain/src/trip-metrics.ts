import type {
	Priority,
	ReadinessCategory,
	ReadinessItem,
	WorkStatus,
} from "./types";

const MS_PER_DAY = 86_400_000;
const DEFAULT_ITEM_MINUTES = 60;
const MINUTES_PER_HOUR = 60;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const TIME_PATTERN = /^(\d{1,2}):(\d{1,2})/;
const NON_TRAVELER_ROLES = new Set(["emergencyContact", "localContact"]);

const parseKey = (key: string): number | null => {
	const match = DATE_KEY_PATTERN.exec(key);

	if (!match) {
		return null;
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day, 12));

	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return null;
	}

	return date.getTime();
};

// Calendar math on "YYYY-MM-DD" keys (UTC-noon based).
export const getDayOffset = (fromKey: string, toKey: string): number | null => {
	const from = parseKey(fromKey);
	const to = parseKey(toKey);

	if (from === null || to === null) {
		return null;
	}

	return Math.round((to - from) / MS_PER_DAY);
};

export const getTripDayCount = (
	start?: string | null,
	end?: string | null
): number | null => {
	if (!(start && end)) {
		return null;
	}

	const offset = getDayOffset(start, end);

	return offset === null ? null : Math.max(1, offset + 1);
};

export const addDaysToKey = (key: string, days: number): string => {
	const base = parseKey(key);

	if (base === null) {
		return key;
	}

	return new Date(base + days * MS_PER_DAY).toISOString().slice(0, 10);
};

export const getDateKeyInTimeZone = (ms: number, timeZone: string): string =>
	new Intl.DateTimeFormat("en-CA", {
		day: "2-digit",
		month: "2-digit",
		timeZone,
		year: "numeric",
	}).format(new Date(ms));

/** Single time zone for "today" across backend and app. */
export const TRIP_TIME_ZONE = "Asia/Manila";

export const getTripTodayKey = (ms: number = Date.now()): string =>
	getDateKeyInTimeZone(ms, TRIP_TIME_ZONE);

// Bookings
export const isBookingSecured = (status: string): boolean =>
	status === "confirmed" || status === "bookedExternally";

interface BookingCountInput {
	cost?: number;
	currency?: string;
	startDateTime?: string;
	status: string;
	title: string;
}

const normalizeCurrency = (currency?: string) =>
	(currency ?? "PHP").trim().toUpperCase();

export const getBookingCounts = <Booking extends BookingCountInput>(
	bookings: readonly Booking[],
	budgetCurrency = "PHP"
) => {
	const currency = normalizeCurrency(budgetCurrency);
	let booked = 0;
	let cancelled = 0;
	let bookedCost = 0;
	const toBookItems: Booking[] = [];

	for (const booking of bookings) {
		if (isBookingSecured(booking.status)) {
			booked += 1;
			if (
				normalizeCurrency(booking.currency) === currency &&
				Number.isFinite(booking.cost) &&
				(booking.cost ?? 0) > 0
			) {
				bookedCost += booking.cost ?? 0;
			}
		} else if (booking.status === "cancelled") {
			cancelled += 1;
		} else if (booking.status === "target" || booking.status === "missing") {
			toBookItems.push(booking);
		}
	}

	toBookItems.sort(
		(left, right) =>
			(left.startDateTime || "9999").localeCompare(
				right.startDateTime || "9999"
			) || left.title.localeCompare(right.title)
	);

	return {
		booked,
		bookedCost,
		cancelled,
		nextToBook: toBookItems[0] ?? null,
		toBook: toBookItems.length,
		total: bookings.length,
	};
};

// Readiness. Percent = share of active tasks that are done.
interface ReadinessProgressInput {
	dueDate?: string;
	priority: string;
	status: string;
}

const READINESS_WEIGHT: Record<string, number> = {
	critical: 4,
	high: 3,
	low: 1,
	medium: 2,
};
const READINESS_IN_PROGRESS_CREDIT = 0.5;
/** Blocked or overdue open work weighs more, so it drags the score harder. */
const READINESS_ESCALATION = 1.5;

const isReadinessOverdue = (
	item: ReadinessProgressInput,
	todayKey: string
): boolean => Boolean(item.dueDate && item.dueDate < todayKey);

/**
 * The one readiness formula. Priority-weighted share of active (non-ignored)
 * items that are done; in-progress earns half credit unless blocked/overdue,
 * which earn nothing and weigh 1.5x. All done is exactly 100. Null if no items.
 */
export const getReadinessPercent = (
	items: readonly ReadinessProgressInput[],
	todayKey: string
): number | null => {
	let total = 0;
	let earned = 0;

	for (const item of items) {
		if (item.status === "ignored") {
			continue;
		}

		const base = READINESS_WEIGHT[item.priority] ?? 2;

		if (item.status === "done") {
			total += base;
			earned += base;
			continue;
		}

		const escalated =
			item.status === "blocked" || isReadinessOverdue(item, todayKey);

		total += escalated ? base * READINESS_ESCALATION : base;

		if (item.status === "inProgress" && !escalated) {
			earned += base * READINESS_IN_PROGRESS_CREDIT;
		}
	}

	return total === 0 ? null : Math.round((earned / total) * 100);
};

export const getReadinessProgress = (
	items: readonly ReadinessProgressInput[],
	todayKey: string
) => {
	let active = 0;
	let done = 0;
	let highOpen = 0;
	let overdue = 0;

	for (const item of items) {
		if (item.status === "ignored") {
			continue;
		}

		active += 1;

		if (item.status === "done") {
			done += 1;
			continue;
		}

		if (item.priority === "high" || item.priority === "critical") {
			highOpen += 1;
		}

		if (isReadinessOverdue(item, todayKey)) {
			overdue += 1;
		}
	}

	return {
		active,
		done,
		highOpen,
		open: active - done,
		overdue,
		percent: getReadinessPercent(items, todayKey),
	};
};

interface ReadinessItemDocLike {
	_id: string;
	aiReason: string;
	assignedToMemberId?: string | null;
	category: string;
	description: string;
	dueDate: string;
	priority: string;
	source: string;
	status: string;
	title: string;
	tripId: string;
}

export const toReadinessItem = (item: ReadinessItemDocLike): ReadinessItem => ({
	aiReason: item.aiReason,
	assignedToMemberId: item.assignedToMemberId ?? null,
	category: item.category as ReadinessCategory,
	description: item.description,
	dueDate: item.dueDate,
	id: item._id,
	priority: item.priority as Priority,
	source: item.source as ReadinessItem["source"],
	status: item.status as WorkStatus,
	title: item.title,
	tripId: item.tripId,
});

// Trip phase and countdown
export type TripPhase =
	| "archived"
	| "completed"
	| "undated"
	| "upcoming"
	| "during"
	| "ended";

interface TripDatesInput {
	endDate?: string | null;
	startDate?: string | null;
	status: string;
}

export const getTripPhase = (
	trip: TripDatesInput,
	todayKey: string
): TripPhase => {
	if (trip.status === "archived") {
		return "archived";
	}

	if (trip.status === "completed") {
		return "completed";
	}

	if (!trip.startDate) {
		return "undated";
	}

	if (todayKey < trip.startDate) {
		return "upcoming";
	}

	if (trip.endDate && todayKey > trip.endDate) {
		return "ended";
	}

	return "during";
};

export type EffectiveTripStatus =
	| "planning"
	| "traveling"
	| "completed"
	| "archived";

/**
 * The one rule for trip status. Archived and manually completed trips keep
 * that status; otherwise dates decide (Manila "today"): before start is
 * planning, within the range is traveling, after the end is completed.
 * Undated trips stay planning.
 */
export const getEffectiveTripStatus = (
	trip: TripDatesInput,
	todayKey: string
): EffectiveTripStatus => {
	const phase = getTripPhase(trip, todayKey);

	if (phase === "archived") {
		return "archived";
	}

	if (phase === "completed" || phase === "ended") {
		return "completed";
	}

	return phase === "during" ? "traveling" : "planning";
};

export interface TripCountdown {
	dayNumber: number | null;
	daysUntil: number | null;
	endDate?: string;
	phase: TripPhase;
	totalDays: number | null;
}

export const getTripCountdown = (
	trip: TripDatesInput,
	todayKey: string
): TripCountdown => {
	const phase = getTripPhase(trip, todayKey);
	const startDate = trip.startDate ?? undefined;
	const endDate = trip.endDate ?? undefined;
	const countdown: TripCountdown = {
		dayNumber: null,
		daysUntil: null,
		endDate,
		phase,
		totalDays: null,
	};

	if (phase === "upcoming" && startDate) {
		countdown.daysUntil = getDayOffset(todayKey, startDate);
	}

	if (phase === "during" && startDate) {
		const offset = getDayOffset(startDate, todayKey);

		countdown.dayNumber = offset === null ? null : offset + 1;
		countdown.totalDays = getTripDayCount(startDate, endDate);
	}

	return countdown;
};

// Days used for the daily budget amount
export const getBudgetDayCount = (
	trip: { endDate?: string | null; startDate?: string | null },
	todayKey: string
): number => {
	if (!(trip.startDate && trip.endDate)) {
		return 1;
	}

	if (todayKey < trip.startDate) {
		return getTripDayCount(trip.startDate, trip.endDate) ?? 1;
	}

	const remaining = getDayOffset(todayKey, trip.endDate);

	return remaining === null ? 1 : Math.max(1, remaining + 1);
};

// People, places, files
export const getTravelerCount = (
	trip: { groupType: string; travelerCount?: number | null },
	companions: readonly { role: string }[]
): number | null => {
	if (
		typeof trip.travelerCount === "number" &&
		Number.isInteger(trip.travelerCount) &&
		trip.travelerCount > 0
	) {
		return trip.travelerCount;
	}

	if (trip.groupType === "solo") {
		return 1;
	}

	if (trip.groupType === "couple") {
		return 2;
	}

	const travelers = getCompanionCounts(companions).travelers;

	return travelers > 0 ? travelers : null;
};

export const getCompanionCounts = (companions: readonly { role: string }[]) => {
	const travelers = companions.filter(
		(companion) => !NON_TRAVELER_ROLES.has(companion.role)
	).length;

	return { contacts: companions.length - travelers, travelers };
};

export const getPlaceCounts = (
	savedPlaces: readonly { assignedDayId?: string | null }[]
) => ({
	saved: savedPlaces.length,
	unassigned: savedPlaces.filter((place) => !place.assignedDayId).length,
});

export const getVaultCounts = (
	vaultItems: readonly { kind: string; linkedEntityId?: string | null }[],
	documents: readonly { expiryDate?: string; status: string }[]
) => ({
	files: vaultItems.length,
	linked: vaultItems.filter((item) => Boolean(item.linkedEntityId)).length,
	missingDocuments: documents.filter(
		(document) => document.status === "missing"
	).length,
});

// Itinerary now / next
interface NowNextDay {
	date: string;
	id: string;
}

interface NowNextItem {
	dayId: string;
	endTime?: string;
	startTime?: string;
}

const toMinutes = (time: string | undefined): number | null => {
	const match = time ? TIME_PATTERN.exec(time) : null;

	if (!match) {
		return null;
	}

	return Number(match[1]) * MINUTES_PER_HOUR + Number(match[2]);
};

export const getItineraryNowNext = <
	Day extends NowNextDay,
	Item extends NowNextItem,
>({
	days,
	items,
	maxUpcoming = 3,
	nowTime,
	todayKey,
}: {
	days: readonly Day[];
	items: readonly Item[];
	maxUpcoming?: number;
	nowTime: string;
	todayKey: string;
}) => {
	const dayById = new Map(days.map((day) => [day.id, day]));
	const nowMinutes = toMinutes(nowTime) ?? 0;
	const nowStamp = `${todayKey}T${nowTime}`;
	const sorted = items
		.map((item) => ({
			item,
			stamp: `${dayById.get(item.dayId)?.date ?? ""}T${item.startTime || "00:00"}`,
		}))
		.filter((entry) => dayById.has(entry.item.dayId))
		.sort((left, right) => left.stamp.localeCompare(right.stamp));
	const todayItems = sorted
		.filter((entry) => dayById.get(entry.item.dayId)?.date === todayKey)
		.map((entry) => entry.item);
	const now =
		todayItems.find((item) => {
			const start = toMinutes(item.startTime);

			if (start === null || start > nowMinutes) {
				return false;
			}

			const end = toMinutes(item.endTime) ?? start + DEFAULT_ITEM_MINUTES;

			return nowMinutes < end;
		}) ?? null;
	const nextIndex = sorted.findIndex((entry) => entry.stamp > nowStamp);
	const next = nextIndex === -1 ? null : (sorted[nextIndex]?.item ?? null);
	const upcoming =
		nextIndex === -1
			? []
			: sorted
					.slice(nextIndex + 1, nextIndex + 1 + maxUpcoming)
					.map((entry) => entry.item);

	return { next, now, todayItems, upcoming };
};

// Next trip for Discover: in progress first, then soonest upcoming, then undated.
export const getNextTrip = <
	Trip extends TripDatesInput & { isDemo?: boolean; updatedAt?: number },
>(
	trips: readonly Trip[],
	todayKey: string
): Trip | null => {
	const ranked = trips
		.filter((trip) => !trip.isDemo)
		.map((trip) => ({ phase: getTripPhase(trip, todayKey), trip }))
		.filter(
			({ phase }) =>
				phase === "during" || phase === "upcoming" || phase === "undated"
		);
	const order = { during: 0, undated: 2, upcoming: 1 } as const;

	ranked.sort((a, b) => {
		const byPhase =
			order[a.phase as keyof typeof order] -
			order[b.phase as keyof typeof order];

		if (byPhase !== 0) {
			return byPhase;
		}

		if (a.phase === "upcoming") {
			return (a.trip.startDate ?? "").localeCompare(b.trip.startDate ?? "");
		}

		return (b.trip.updatedAt ?? 0) - (a.trip.updatedAt ?? 0);
	});

	return ranked[0]?.trip ?? null;
};
