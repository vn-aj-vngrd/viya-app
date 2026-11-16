import { isBookingSecured } from "./trip-metrics";
import { cleanText, isValidHttpUrl } from "./validation";

interface BookingLike {
	_id?: string;
	id?: string;
	status: string;
	type: string;
}

export const getBookingProgress = (bookings: readonly BookingLike[]) => {
	const confirmed = bookings.filter((booking) =>
		isBookingSecured(booking.status)
	).length;

	return {
		confirmed,
		remaining: Math.max(0, bookings.length - confirmed),
		total: bookings.length,
	};
};

export const groupBookingsByType = <Booking extends BookingLike>(
	bookings: readonly Booking[]
) =>
	Object.entries(
		bookings.reduce<Record<string, Booking[]>>((groups, booking) => {
			const currentGroup = groups[booking.type] ?? [];
			currentGroup.push(booking);
			groups[booking.type] = currentGroup;
			return groups;
		}, {})
	).map(([type, items]) => ({ items, type }));

export const BOOKING_STATUS_OPTIONS = [
	{ label: "Target", value: "target" },
	{ label: "Missing", value: "missing" },
	{ label: "Confirmed", value: "confirmed" },
	{ label: "Booked elsewhere", value: "bookedExternally" },
	{ label: "Cancelled", value: "cancelled" },
] as const;

export type BookingStatusValue =
	(typeof BOOKING_STATUS_OPTIONS)[number]["value"];

export type BookingInputError =
	| "INVALID_BOOKING_TITLE"
	| "INVALID_BOOKING_COST"
	| "INVALID_BOOKING_URL"
	| "BOOKING_END_BEFORE_START";

interface BookingInputCheck {
	cost?: number | null;
	endDateTime?: string | null;
	externalUrl?: string | null;
	startDateTime?: string | null;
	title?: string;
}

/** First problem with a booking's user-editable fields, or null when valid. */
const BOOKING_DATE_LENGTH = 10;

/** Compares "YYYY-MM-DD[ T]HH:MM" values; only dates when either lacks a time. */
export const isBookingEndBeforeStart = (start: string, end: string) => {
	const normalize = (value: string) => value.trim().replace("T", " ");
	const first = normalize(start);
	const second = normalize(end);

	if (
		first.length <= BOOKING_DATE_LENGTH ||
		second.length <= BOOKING_DATE_LENGTH
	) {
		return (
			second.slice(0, BOOKING_DATE_LENGTH) < first.slice(0, BOOKING_DATE_LENGTH)
		);
	}

	return second < first;
};

export const getBookingInputError = (
	input: BookingInputCheck
): BookingInputError | null => {
	if (input.title !== undefined && !cleanText(input.title)) {
		return "INVALID_BOOKING_TITLE";
	}

	if (
		input.cost !== undefined &&
		input.cost !== null &&
		!(Number.isFinite(input.cost) && input.cost >= 0)
	) {
		return "INVALID_BOOKING_COST";
	}

	if (input.externalUrl?.trim() && !isValidHttpUrl(input.externalUrl)) {
		return "INVALID_BOOKING_URL";
	}

	if (
		input.startDateTime &&
		input.endDateTime &&
		isBookingEndBeforeStart(input.startDateTime, input.endDateTime)
	) {
		return "BOOKING_END_BEFORE_START";
	}

	return null;
};
