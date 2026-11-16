import {
	findItineraryConflicts,
	getBookingInputError,
	getDayOffset,
	getTripDayCount,
	isDateWithinTripRange,
	validateItineraryTiming,
} from "@viya-app/domain";

import {
	buildTripProfilePatch,
	maxItemsPerDay,
	normalizeTitleKey,
	type TripAgentDraftPayload,
} from "./trip-agent-draft-apply";

/** Modules the chat agent can draft; each maps to one review card. */
export type ProposalModule =
	| "itinerary"
	| "bookings"
	| "budget"
	| "readiness"
	| "places"
	| "risks"
	| "profile";

export interface ProposalTrip {
	arrivalTime?: string;
	budgetAmount?: number;
	budgetCurrency?: string;
	departureTime?: string;
	destination: string;
	endDate: string;
	groupType: string;
	pace: string;
	startDate: string;
	summary: string;
	title: string;
	travelerCount?: number;
}

export interface ProposalContext {
	bookings: readonly { title: string; type?: string }[];
	/** Spent plus planned in the trip currency, for budget sanity checks. */
	committedSpend?: number;
	days: readonly { date: string; id: string }[];
	places: readonly { locationName?: string; title: string }[];
	readinessItems: readonly { title: string }[];
	risks: readonly { title: string }[];
	stops: readonly {
		dayId: string;
		endTime: string;
		id: string;
		startTime: string;
		status?: string;
		title: string;
	}[];
	/** Today as YYYY-MM-DD in Asia/Manila. */
	today: string;
	trip: ProposalTrip;
}

export interface ProposalValidation {
	/** Problems the model must fix before a draft is saved. */
	errors: string[];
	/** Facts the user should hear about; the draft is still saved. */
	warnings: string[];
}

const maxBudgetAmount = 100_000_000;
const maxTravelerCount = 99;
const longTripDays = 30;
const packedDayStops = 10;
const bookingDateTimePattern = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2})?$/;
const isoDateLength = 10;

const isRealDate = (value: string) =>
	value.length >= isoDateLength &&
	getDayOffset(value.slice(0, isoDateLength), value.slice(0, isoDateLength)) ===
		0;

const tripRangeLabel = (trip: ProposalTrip) =>
	`${trip.startDate} to ${trip.endDate}`;

type Stop = ProposalContext["stops"][number];
type DraftDay = TripAgentDraftPayload["days"][number];

const timingMessages = {
	END_BEFORE_START:
		"ends at or before it starts. Use an end time after the start; split overnight travel into two stops",
	INVALID_END_TIME: "has an invalid end time. Use 24-hour HH:MM",
	INVALID_START_TIME: "has an invalid start time. Use 24-hour HH:MM",
} as const;

const checkDayShape = (
	day: DraftDay,
	context: ProposalContext,
	seenDates: Set<string>,
	result: ProposalValidation
) => {
	const { trip } = context;

	if (!isDateWithinTripRange(day.date, trip.startDate, trip.endDate)) {
		result.errors.push(
			`Day ${day.date} is outside the trip (${tripRangeLabel(trip)}). Use a date inside the trip, or draft a date change with proposeTripProfileChanges first.`
		);
	}

	if (seenDates.has(day.date)) {
		result.errors.push(
			`Day ${day.date} appears twice. Put all of that day's stops in one day entry.`
		);
	}

	seenDates.add(day.date);

	if (day.items.length > maxItemsPerDay) {
		result.errors.push(
			`Day ${day.date} has ${day.items.length} stops; the limit is ${maxItemsPerDay} per day. Split them across days or drop the least important.`
		);
	}

	if (day.date < context.today) {
		result.warnings.push(`${day.date} is already in the past.`);
	}
};

const checkStops = (
	day: DraftDay,
	stopById: Map<string, Stop>,
	seenStopIds: Set<string>,
	result: ProposalValidation
) => {
	for (const item of day.items) {
		const label = `Stop "${item.title}" on ${day.date}`;

		if (!item.title.trim()) {
			result.errors.push(`A stop on ${day.date} has no title.`);
		}

		const timing = validateItineraryTiming({
			endTime: item.endTime,
			startTime: item.startTime,
		});

		if (!timing.ok) {
			result.errors.push(`${label} ${timingMessages[timing.error]}.`);
		}

		if (!item.stopId) {
			continue;
		}

		if (!stopById.has(item.stopId)) {
			result.errors.push(
				`${label} uses stopId ${item.stopId}, which is not in this trip. Call getItinerary for current ids, or omit stopId to add a new stop.`
			);
		}

		if (seenStopIds.has(item.stopId)) {
			result.errors.push(
				`stopId ${item.stopId} is used more than once. Each existing stop can be changed once per draft.`
			);
		}

		seenStopIds.add(item.stopId);
	}
};

const formatStop = (stop: {
	endTime: string;
	startTime: string;
	title: string;
}) => `"${stop.title}" ${stop.startTime}-${stop.endTime}`;

/** Existing stops that stay on this date after the draft is applied. */
const getRemainingStops = ({
	date,
	day,
	dayIdByDate,
	movedOrRemovedIds,
	stops,
}: {
	date: string;
	day: DraftDay;
	dayIdByDate: Map<string, string>;
	movedOrRemovedIds: Set<string>;
	stops: readonly Stop[];
}) => {
	const dayId = dayIdByDate.get(date);
	const draftTitles = new Set(
		day.items
			.filter((item) => !item.stopId)
			.map((item) => normalizeTitleKey(item.title))
	);

	return stops.filter(
		(stop) =>
			stop.dayId === dayId &&
			stop.status !== "skipped" &&
			!movedOrRemovedIds.has(stop.id) &&
			// A same-title stop is updated in place by the draft, not duplicated.
			!draftTitles.has(normalizeTitleKey(stop.title))
	);
};

const checkDayConflicts = (
	day: DraftDay,
	remaining: readonly Stop[],
	result: ProposalValidation
) => {
	const draftStops = day.items.map((item, index) => ({
		endTime: item.endTime,
		id: `draft:${index}`,
		startTime: item.startTime,
		title: item.title,
	}));
	const existingById = new Map(remaining.map((stop) => [stop.id, stop]));
	const draftById = new Map(draftStops.map((stop) => [stop.id, stop]));
	const describe = (id: string) => {
		const existing = existingById.get(id);

		if (existing) {
			return `existing stop ${formatStop(existing)} (stopId ${existing.id})`;
		}

		const draftStop = draftById.get(id);

		return draftStop ? `drafted stop ${formatStop(draftStop)}` : id;
	};

	for (const conflict of findItineraryConflicts([
		...remaining,
		...draftStops,
	])) {
		if (
			!(draftById.has(conflict.firstId) || draftById.has(conflict.secondId))
		) {
			continue;
		}

		result.errors.push(
			`On ${day.date}, ${describe(conflict.firstId)} overlaps ${describe(conflict.secondId)}. Shift a time, or pass the existing stop's stopId to move it or list it in removeStopIds.`
		);
	}

	if (remaining.length + day.items.length > packedDayStops) {
		result.warnings.push(
			`${day.date} would have ${remaining.length + day.items.length} stops, which is a packed day.`
		);
	}
};

const validateItinerary = (
	payload: TripAgentDraftPayload,
	context: ProposalContext,
	result: ProposalValidation
) => {
	const removeStopIds = payload.removeStopIds ?? [];

	if (payload.days.length === 0 && removeStopIds.length === 0) {
		result.errors.push(
			"The draft has no days and no removals. Add at least one day with stops."
		);
		return;
	}

	const stopById = new Map(context.stops.map((stop) => [stop.id, stop]));
	const seenStopIds = new Set<string>();
	const seenDates = new Set<string>();

	for (const day of payload.days) {
		checkDayShape(day, context, seenDates, result);
		checkStops(day, stopById, seenStopIds, result);
	}

	for (const stopId of removeStopIds) {
		if (!stopById.has(stopId)) {
			result.errors.push(
				`removeStopIds has ${stopId}, which is not in this trip. Call getItinerary for current ids.`
			);
		}

		if (seenStopIds.has(stopId)) {
			result.errors.push(
				`stopId ${stopId} is both changed and removed. Do one or the other.`
			);
		}
	}

	if (result.errors.length > 0) {
		return;
	}

	const movedOrRemovedIds = new Set([...seenStopIds, ...removeStopIds]);
	const dayIdByDate = new Map(context.days.map((day) => [day.date, day.id]));

	for (const day of payload.days) {
		checkDayConflicts(
			day,
			getRemainingStops({
				date: day.date,
				day,
				dayIdByDate,
				movedOrRemovedIds,
				stops: context.stops,
			}),
			result
		);
	}
};

/** Duplicate check shared by the list modules: all duplicates is an error. */
const checkDuplicates = <Item>({
	existingKeys,
	getKey,
	getLabel,
	items,
	noun,
	result,
}: {
	existingKeys: Set<string>;
	getKey: (item: Item) => string[];
	getLabel: (item: Item) => string;
	items: readonly Item[];
	noun: string;
	result: ProposalValidation;
}) => {
	if (items.length === 0) {
		result.errors.push(`The draft has no ${noun}s. Add at least one.`);
		return;
	}

	const duplicates = items.filter((item) =>
		getKey(item).some((key) => key !== "" && existingKeys.has(key))
	);

	if (duplicates.length === items.length) {
		result.errors.push(
			`Every ${noun} is already in the trip (${duplicates.map(getLabel).join(", ")}). Propose something new or tell the user it is already covered.`
		);
		return;
	}

	for (const item of duplicates) {
		result.warnings.push(
			`"${getLabel(item)}" is already in the trip and will be skipped.`
		);
	}
};

const bookingErrorMessages = {
	BOOKING_END_BEFORE_START: "ends before it starts",
	INVALID_BOOKING_COST: "has a negative or invalid cost",
	INVALID_BOOKING_TITLE: "has no title",
	INVALID_BOOKING_URL: "has an invalid link",
} as const;

const checkBookingDate = (
	label: string,
	field: string,
	value: string | undefined,
	context: ProposalContext,
	result: ProposalValidation
) => {
	if (!value) {
		return;
	}

	if (
		!(bookingDateTimePattern.test(value.trim()) && isRealDate(value.trim()))
	) {
		result.errors.push(
			`Booking "${label}" ${field} "${value}" is not valid. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM.`
		);
		return;
	}

	const date = value.trim().slice(0, isoDateLength);

	if (
		!isDateWithinTripRange(date, context.trip.startDate, context.trip.endDate)
	) {
		result.warnings.push(
			`Booking "${label}" ${field} ${date} is outside the trip dates (${tripRangeLabel(context.trip)}).`
		);
	}
};

const validateBookings = (
	payload: TripAgentDraftPayload,
	context: ProposalContext,
	result: ProposalValidation
) => {
	for (const target of payload.bookingTargets) {
		const error = getBookingInputError({
			cost: target.cost,
			endDateTime: target.endDateTime,
			startDateTime: target.startDateTime,
			title: target.title,
		});

		if (error) {
			result.errors.push(
				`Booking "${target.title || "untitled"}" ${bookingErrorMessages[error]}.`
			);
		}

		checkBookingDate(
			target.title,
			"start",
			target.startDateTime,
			context,
			result
		);
		checkBookingDate(target.title, "end", target.endDateTime, context, result);
	}

	checkDuplicates({
		existingKeys: new Set(
			context.bookings.map(
				(booking) => `${normalizeTitleKey(booking.title)}|${booking.type ?? ""}`
			)
		),
		getKey: (item) => [`${normalizeTitleKey(item.title)}|${item.type}`],
		getLabel: (item) => item.title,
		items: payload.bookingTargets,
		noun: "booking target",
		result,
	});
};

const formatPhp = (amount: number) =>
	Math.round(amount).toLocaleString("en-US");

const validateBudget = (
	payload: TripAgentDraftPayload,
	context: ProposalContext,
	result: ProposalValidation
) => {
	const amount = payload.budgetAmount;
	const currency = context.trip.budgetCurrency ?? "PHP";

	if (amount === undefined || !Number.isFinite(amount) || amount <= 0) {
		result.errors.push("budgetAmount must be a positive number.");
		return;
	}

	if (amount > maxBudgetAmount) {
		result.errors.push(
			`budgetAmount ${formatPhp(amount)} is not realistic. Use the trip total in ${currency}.`
		);
		return;
	}

	if (amount === context.trip.budgetAmount) {
		result.errors.push(
			`The trip budget is already ${formatPhp(amount)} ${currency}. No draft needed.`
		);
		return;
	}

	if (context.committedSpend !== undefined && context.committedSpend > amount) {
		result.warnings.push(
			`${formatPhp(amount)} ${currency} is below the ${formatPhp(context.committedSpend)} ${currency} already spent or planned.`
		);
	}
};

const validateReadiness = (
	payload: TripAgentDraftPayload,
	context: ProposalContext,
	result: ProposalValidation
) => {
	for (const item of payload.readinessItems) {
		if (!isRealDate(item.dueDate)) {
			result.errors.push(
				`Task "${item.title}" dueDate "${item.dueDate}" is not a real YYYY-MM-DD date.`
			);
			continue;
		}

		if (item.dueDate > context.trip.endDate) {
			result.warnings.push(
				`Task "${item.title}" is due after the trip ends (${context.trip.endDate}).`
			);
		} else if (item.dueDate < context.today) {
			result.warnings.push(`Task "${item.title}" is already overdue.`);
		}
	}

	checkDuplicates({
		existingKeys: new Set(
			context.readinessItems.map((item) => normalizeTitleKey(item.title))
		),
		getKey: (item) => [normalizeTitleKey(item.title)],
		getLabel: (item) => item.title,
		items: payload.readinessItems,
		noun: "checklist task",
		result,
	});
};

const validatePlaces = (
	payload: TripAgentDraftPayload,
	context: ProposalContext,
	result: ProposalValidation
) => {
	for (const place of payload.places) {
		if (!(place.title.trim() && place.locationName.trim())) {
			result.errors.push(
				"Every place needs a title and a locationName (area or address)."
			);
			break;
		}
	}

	checkDuplicates({
		existingKeys: new Set(
			context.places.flatMap((place) => [
				normalizeTitleKey(place.title),
				normalizeTitleKey(place.locationName),
			])
		),
		getKey: (item) => [normalizeTitleKey(item.title)],
		getLabel: (item) => item.title,
		items: payload.places,
		noun: "place",
		result,
	});
};

const validateRisks = (
	payload: TripAgentDraftPayload,
	context: ProposalContext,
	result: ProposalValidation
) => {
	checkDuplicates({
		existingKeys: new Set(
			context.risks.map((risk) => normalizeTitleKey(risk.title))
		),
		getKey: (item) => [normalizeTitleKey(item.title)],
		getLabel: (item) => item.title,
		items: payload.risks,
		noun: "risk",
		result,
	});
};

const checkProfileDates = (
	startDate: string,
	endDate: string,
	context: ProposalContext,
	result: ProposalValidation
) => {
	if (!(isRealDate(startDate) && isRealDate(endDate))) {
		result.errors.push(
			`Trip dates ${startDate} to ${endDate} are not real YYYY-MM-DD dates.`
		);
		return;
	}

	if (startDate > endDate) {
		result.errors.push(
			`The new start date ${startDate} is after the end date ${endDate}. Send both dates.`
		);
		return;
	}

	if (startDate < context.today) {
		result.warnings.push(`The new start date ${startDate} is in the past.`);
	}

	if ((getTripDayCount(startDate, endDate) ?? 0) > longTripDays) {
		result.warnings.push(
			`${startDate} to ${endDate} is longer than ${longTripDays} days.`
		);
	}

	result.warnings.push(
		"Itinerary days move with the new dates; days that still have stops are kept, never deleted."
	);
};

const validateProfile = (
	payload: TripAgentDraftPayload,
	context: ProposalContext,
	result: ProposalValidation
) => {
	const change = payload.profile ?? {};
	const { labels } = buildTripProfilePatch(change, context.trip);

	if (labels.length === 0) {
		result.errors.push(
			"Nothing would change: every field matches the current trip. Send only fields that differ."
		);
		return;
	}

	if (
		change.travelerCount !== undefined &&
		!(change.travelerCount >= 1 && change.travelerCount <= maxTravelerCount)
	) {
		result.errors.push(
			`travelerCount must be a whole number from 1 to ${maxTravelerCount}.`
		);
	}

	if (change.startDate !== undefined || change.endDate !== undefined) {
		checkProfileDates(
			change.startDate ?? context.trip.startDate,
			change.endDate ?? context.trip.endDate,
			context,
			result
		);
	}
};

const validators: Record<
	ProposalModule,
	(
		payload: TripAgentDraftPayload,
		context: ProposalContext,
		result: ProposalValidation
	) => void
> = {
	bookings: validateBookings,
	budget: validateBudget,
	itinerary: validateItinerary,
	places: validatePlaces,
	profile: validateProfile,
	readiness: validateReadiness,
	risks: validateRisks,
};

/**
 * Checks a chat draft against the trip as it is now. Errors are written for
 * the model to fix and resend (dates, times, overlaps, unknown ids,
 * duplicates); warnings are saved with the draft and told to the user.
 */
export const validateDraftProposal = ({
	context,
	module,
	payload,
}: {
	context: ProposalContext;
	module: ProposalModule;
	payload: TripAgentDraftPayload;
}): ProposalValidation => {
	const result: ProposalValidation = { errors: [], warnings: [] };

	validators[module](payload, context, result);

	return result;
};
