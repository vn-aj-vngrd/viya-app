import { z } from "zod";

const maxDraftItems = 6;
const defaultFallbackDayCount = 4;
const genericDayTitlePattern = /^day \d+$/;
const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
const minimumArrivalStops = 5;
const minimumCoreStops = 5;
const minimumDepartureStops = 4;

const changeSchema = z.object({
	detail: z.string(),
	title: z.string(),
	type: z.string(),
});

const itineraryItemSchema = z.object({
	aiReason: z.string(),
	category: z.string(),
	description: z.string(),
	durationMinutes: z.number(),
	endTime: z.string(),
	estimatedCost: z.number(),
	locationName: z.string(),
	priority: z.string(),
	startTime: z.string(),
	title: z.string(),
});

const readinessUpdateSchema = z.object({
	category: z.string(),
	reason: z.string(),
	status: z.literal("done"),
	title: z.string(),
});

export const tripAgentDraftPayloadSchema = z.object({
	bookingTargets: z
		.array(
			z.object({
				cost: z.number().optional(),
				currency: z.string().optional(),
				locationName: z.string().optional(),
				notes: z.string().optional(),
				provider: z.string().optional(),
				title: z.string(),
				type: z.string(),
			})
		)
		.default([]),
	budgetAmount: z.number().optional(),
	changes: z.array(changeSchema).default([]),
	days: z
		.array(
			z.object({
				date: z.string(),
				estimatedCost: z.number(),
				items: z.array(itineraryItemSchema).default([]),
				pace: z.string(),
				summary: z.string(),
				theme: z.string(),
				title: z.string(),
				weatherNote: z.string(),
			})
		)
		.default([]),
	moments: z
		.array(
			z.object({
				caption: z.string(),
				locationName: z.string(),
				note: z.string(),
				title: z.string(),
			})
		)
		.default([]),
	places: z
		.array(
			z.object({
				address: z.string().optional(),
				category: z.string(),
				description: z.string(),
				locationName: z.string(),
				title: z.string(),
			})
		)
		.default([]),
	rationale: z.string(),
	readinessItems: z
		.array(
			z.object({
				category: z.string(),
				description: z.string(),
				dueDate: z.string(),
				priority: z.string(),
				title: z.string(),
			})
		)
		.default([]),
	readinessUpdates: z.array(readinessUpdateSchema).default([]),
	risks: z
		.array(
			z.object({
				message: z.string(),
				severity: z.string(),
				suggestedAction: z.string(),
				title: z.string(),
				type: z.string(),
			})
		)
		.default([]),
	title: z.string(),
});

export type TripAgentDraftPayload = z.infer<typeof tripAgentDraftPayloadSchema>;

interface FallbackTripInput {
	budgetAmount?: number;
	budgetCurrency?: string;
	destination: string;
	endDate: string;
	startDate: string;
	summary?: string;
	title: string;
}

type FallbackItineraryDayKind = "arrival" | "core" | "departure";

export interface ReadinessCompletionInput {
	category: string;
	description: string;
	status: string;
	title: string;
}

const normalizeForMatch = (value: string) =>
	value
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, " ")
		.trim();

const hasAnyKeyword = (value: string, keywords: readonly string[]) =>
	keywords.some((keyword) => value.includes(keyword));

const readinessEvidenceKeywordGroups = [
	["booking", "bookings", "confirmation", "confirmed", "voucher", "pass"],
	["document", "documents", "passport", "arrival card", "ticket", "permit"],
	["airport", "transfer", "flight", "transport"],
	["flight", "airline", "confirmation", "ticket"],
	["hotel", "voucher", "check in", "accommodation"],
	["badge", "tech week", "event", "conference", "pass"],
	["passport", "arrival card", "sg arrival"],
	["outfit", "packing", "smart casual"],
	["jet lag", "backup", "recovery"],
	["budget", "receipt", "expense", "paid", "sgd", "php"],
	["schedule", "conference", "check in", "buffer", "focus block"],
	["weather", "forecast", "rain", "indoor", "outdoor"],
	["safety", "emergency", "passport", "health", "contact"],
	["group", "team", "traveler", "handoff", "roles"],
] as const;

const hasEvidenceForReadinessItem = (
	item: ReadinessCompletionInput,
	evidenceText: string
) => {
	const normalizedItemText = normalizeForMatch(
		`${item.title} ${item.description} ${item.category}`
	);
	const normalizedEvidenceText = normalizeForMatch(evidenceText);

	return readinessEvidenceKeywordGroups.some(
		(keywords) =>
			hasAnyKeyword(normalizedItemText, keywords) &&
			hasAnyKeyword(normalizedEvidenceText, keywords)
	);
};

export const getReadinessCompletionPatch = ({
	evidenceText,
	item,
	readinessUpdates,
}: {
	evidenceText: string;
	item: ReadinessCompletionInput;
	readinessUpdates: TripAgentDraftPayload["readinessUpdates"];
}): { aiReason: string; status: "done" } | null => {
	if (item.status === "done" || item.status === "ignored") {
		return null;
	}

	const normalizedTitle = normalizeForMatch(item.title);
	const explicitUpdate = readinessUpdates.find(
		(update) =>
			update.status === "done" &&
			normalizeForMatch(update.title) === normalizedTitle
	);

	if (explicitUpdate) {
		return {
			aiReason: explicitUpdate.reason,
			status: "done",
		};
	}

	if (hasEvidenceForReadinessItem(item, evidenceText)) {
		return {
			aiReason: "Completed by Viya from uploaded workspace evidence.",
			status: "done",
		};
	}

	return null;
};

export const cleanString = (value: string, fallback: string) => {
	const trimmedValue = value.trim();

	return trimmedValue || fallback;
};

export const limitDraftItems = <T>(items: readonly T[]) =>
	items.slice(0, maxDraftItems);

const getDurationFallbackDayCount = (summary?: string) => {
	const normalizedSummary = normalizeForMatch(summary ?? "");

	if (normalizedSummary.includes("weekend")) {
		return 2;
	}

	if (
		normalizedSummary.includes("3 4 days") ||
		normalizedSummary.includes("3 to 4 days")
	) {
		return 4;
	}

	if (
		normalizedSummary.includes("5 7 days") ||
		normalizedSummary.includes("5 to 7 days")
	) {
		return 6;
	}

	if (
		normalizedSummary.includes("1 2 weeks") ||
		normalizedSummary.includes("1 to 2 weeks")
	) {
		return maxDraftItems;
	}

	return defaultFallbackDayCount;
};

const getValidDate = (value: string) => {
	const date = new Date(`${value}T00:00:00.000Z`);

	return Number.isFinite(date.getTime()) ? date : null;
};

const getTripDatesForFallback = (trip: FallbackTripInput) => {
	const start = getValidDate(trip.startDate);
	const end = getValidDate(trip.endDate);

	if (!(start && end)) {
		const anchorDate = start ?? end;
		const fallbackDayCount = Math.min(
			maxDraftItems,
			getDurationFallbackDayCount(trip.summary)
		);

		return Array.from({ length: fallbackDayCount }, (_, index) => {
			if (!anchorDate) {
				return "";
			}

			const date = new Date(
				anchorDate.getTime() + index * oneDayInMilliseconds
			);

			return date.toISOString().slice(0, 10);
		});
	}

	const dayCount = Math.max(
		1,
		Math.min(
			maxDraftItems,
			Math.floor((end.getTime() - start.getTime()) / oneDayInMilliseconds) + 1
		)
	);

	return Array.from({ length: dayCount }, (_, index) => {
		const date = new Date(start.getTime() + index * oneDayInMilliseconds);

		return date.toISOString().slice(0, 10);
	});
};

const getFallbackItineraryDayKind = (
	index: number,
	totalDays: number
): FallbackItineraryDayKind => {
	if (index === 0) {
		return "arrival";
	}

	if (index === totalDays - 1) {
		return "departure";
	}

	return "core";
};

const getFallbackItineraryTheme = (kind: FallbackItineraryDayKind) => {
	if (kind === "arrival") {
		return "Arrival and orientation";
	}

	if (kind === "departure") {
		return "Final checks and departure buffer";
	}

	return "Anchored exploration";
};

const buildFallbackItineraryItems = ({
	dayKind,
	destination,
	perDayBudget,
}: {
	dayKind: FallbackItineraryDayKind;
	destination: string;
	perDayBudget: number;
}): TripAgentDraftPayload["days"][number]["items"] => {
	const isArrivalDay = dayKind === "arrival";
	const isDepartureDay = dayKind === "departure";
	const firstStop = {
		aiReason:
			"Generated as a paced anchor so the day has a clear structure without overpacking.",
		category: isDepartureDay ? "transport" : "activity",
		description:
			"Use this as the main scheduled block and keep transfer time, ticket needs, and pacing visible.",
		durationMinutes: isDepartureDay ? 120 : 150,
		endTime: isDepartureDay ? "11:30" : "11:30",
		estimatedCost: Math.round(perDayBudget * 0.3),
		locationName: destination,
		priority: "high",
		startTime: isDepartureDay ? "09:30" : "09:00",
		title: `${destination} anchor block`,
	};
	const secondStop = {
		aiReason:
			"Adds a meal decision with location context so the itinerary is usable during the trip.",
		category: "meal",
		description:
			"Choose a nearby, low-transfer option that fits the trip pace, group needs, and budget.",
		durationMinutes: 90,
		endTime: isDepartureDay ? "13:00" : "13:00",
		estimatedCost: Math.round(perDayBudget * 0.18),
		locationName: destination,
		priority: "medium",
		startTime: isDepartureDay ? "11:30" : "11:30",
		title: "Local food and culture block",
	};
	const afternoonStop = {
		aiReason:
			"Creates an afternoon block so the plan has enough detail without relying on generic free time.",
		category: "activity",
		description:
			"Keep this close to the day's anchor area, note entry requirements, and leave a buffer before dinner.",
		durationMinutes: isArrivalDay ? 90 : 150,
		endTime: isArrivalDay ? "17:00" : "16:30",
		estimatedCost: Math.round(perDayBudget * 0.22),
		locationName: destination,
		priority: isDepartureDay ? "low" : "medium",
		startTime: isArrivalDay ? "15:30" : "14:00",
		title: isArrivalDay ? "Light orientation stop" : "Afternoon focused stop",
	};
	const eveningStop = {
		aiReason:
			"Adds a light evening plan with an explicit rest boundary for realistic pacing.",
		category: "activity",
		description:
			"Use this as an optional low-transfer evening moment, then protect rest time for the next day.",
		durationMinutes: 90,
		endTime: "20:30",
		estimatedCost: Math.round(perDayBudget * 0.2),
		locationName: destination,
		priority: "medium",
		startTime: "19:00",
		title: "Light evening highlight",
	};
	const logisticsStop = {
		aiReason:
			"Protects schedule quality by making transfers, readiness checks, and recovery time explicit.",
		category: "transport",
		description:
			"Confirm route, travel time, documents, payment method, and the next fixed commitment before moving on.",
		durationMinutes: 45,
		endTime: isDepartureDay ? "14:00" : "18:15",
		estimatedCost: Math.round(perDayBudget * 0.1),
		locationName: destination,
		priority: "high",
		startTime: isDepartureDay ? "13:15" : "17:30",
		title: isDepartureDay
			? "Departure transfer check"
			: "Transfer and readiness buffer",
	};

	if (dayKind === "arrival") {
		return [
			{
				...firstStop,
				durationMinutes: 120,
				endTime: "12:30",
				description:
					"Keep arrival light, confirm transfers, and settle before adding optional stops.",
				startTime: "10:30",
				title: `Arrive and settle into ${destination}`,
			},
			{
				...secondStop,
				endTime: "14:00",
				startTime: "12:30",
				title: "Easy arrival meal",
			},
			afternoonStop,
			logisticsStop,
			eveningStop,
		];
	}

	if (dayKind === "departure") {
		return [
			{
				...firstStop,
				description:
					"Leave room for checkout, luggage, airport transfer, and delays.",
				title: "Pack, checkout, and airport buffer",
			},
			{
				...secondStop,
				title: "Easy final meal near the transfer route",
			},
			{
				...afternoonStop,
				description:
					"Use only if timing allows; keep luggage, transfer route, and airport buffer protected.",
				durationMinutes: 75,
				endTime: "15:15",
				priority: "low",
				startTime: "14:00",
				title: "Optional final nearby stop",
			},
			logisticsStop,
		];
	}

	return [firstStop, secondStop, afternoonStop, logisticsStop, eveningStop];
};

const getMinimumItineraryStops = (dayKind: FallbackItineraryDayKind) => {
	if (dayKind === "departure") {
		return minimumDepartureStops;
	}

	if (dayKind === "arrival") {
		return minimumArrivalStops;
	}

	return minimumCoreStops;
};

const hasSimilarItineraryItem = (
	items: TripAgentDraftPayload["days"][number]["items"],
	candidate: TripAgentDraftPayload["days"][number]["items"][number]
) => {
	const normalizedCandidateTitle = normalizeForMatch(candidate.title);

	return items.some((item) => {
		const normalizedItemTitle = normalizeForMatch(item.title);

		return (
			normalizedItemTitle === normalizedCandidateTitle ||
			(item.startTime === candidate.startTime &&
				item.endTime === candidate.endTime)
		);
	});
};

const fillSparseItineraryItems = ({
	dayKind,
	destination,
	items,
	perDayBudget,
}: {
	dayKind: FallbackItineraryDayKind;
	destination: string;
	items: TripAgentDraftPayload["days"][number]["items"];
	perDayBudget: number;
}) => {
	const minimumStopCount = getMinimumItineraryStops(dayKind);
	const fallbackItems = buildFallbackItineraryItems({
		dayKind,
		destination,
		perDayBudget,
	});
	const filledItems = [...items];

	for (const fallbackItem of fallbackItems) {
		if (filledItems.length >= minimumStopCount) {
			break;
		}

		if (!hasSimilarItineraryItem(filledItems, fallbackItem)) {
			filledItems.push(fallbackItem);
		}
	}

	return limitDraftItems(filledItems);
};

export const ensureDetailedItineraryDraft = (
	payload: TripAgentDraftPayload,
	trip: FallbackTripInput
): TripAgentDraftPayload => {
	const fallbackDates = getTripDatesForFallback(trip);
	const sourceDaysByDate = new Map(
		payload.days
			.filter((day) => day.date)
			.map((day) => [day.date, day] as const)
	);
	const perDayBudget = Math.max(
		2000,
		Math.round(
			(trip.budgetAmount ?? 12_000) / Math.max(1, fallbackDates.length) / 100
		) * 100
	);
	const sourceDays =
		payload.days.length > 0
			? payload.days
			: buildFallbackItineraryDraft(trip).days;

	return {
		...payload,
		changes: [
			...payload.changes,
			{
				detail:
					"Expanded sparse itinerary output into full-day timed blocks where needed.",
				title: "Full-day itinerary detail",
				type: "review",
			},
		],
		days: fallbackDates.map((date, index) => {
			const dayKind = getFallbackItineraryDayKind(index, fallbackDates.length);
			const fallbackTheme = getFallbackItineraryTheme(dayKind);
			const sourceDay = sourceDaysByDate.get(date) ?? sourceDays[index];
			const sourceItems = sourceDay?.items ?? [];
			const dayNumber = index + 1;

			return {
				date,
				estimatedCost: Math.max(0, sourceDay?.estimatedCost ?? perDayBudget),
				items: fillSparseItineraryItems({
					dayKind,
					destination: trip.destination,
					items: sourceItems,
					perDayBudget,
				}),
				pace: cleanString(sourceDay?.pace ?? "", "balanced"),
				summary: cleanString(
					sourceDay?.summary ?? "",
					`${fallbackTheme} with a natural whole-day flow, timed stops, meals, transfers, and buffers.`
				),
				theme: cleanString(sourceDay?.theme ?? "", fallbackTheme),
				title: cleanString(sourceDay?.title ?? "", `Day ${dayNumber}`),
				weatherNote: cleanString(
					sourceDay?.weatherNote ?? "",
					"Confirm forecast and transfer conditions before locking plans."
				),
			};
		}),
		rationale: cleanString(
			payload.rationale,
			"Viya generated a detailed full-day itinerary across the trip dates."
		),
		title: cleanString(payload.title, "Detailed itinerary draft"),
	};
};

export const buildFallbackItineraryDraft = (
	trip: FallbackTripInput
): TripAgentDraftPayload => {
	const dates = getTripDatesForFallback(trip);
	const perDayBudget = Math.max(
		2000,
		Math.round(
			(trip.budgetAmount ?? 12_000) / Math.max(1, dates.length) / 100
		) * 100
	);

	return {
		bookingTargets: [],
		changes: [
			{
				detail: `Generated from ${trip.title} details for ${trip.destination}.`,
				title: "Review before applying",
				type: "review",
			},
		],
		days: dates.map((date, index) => {
			const dayNumber = index + 1;
			const dayKind = getFallbackItineraryDayKind(index, dates.length);
			const theme = getFallbackItineraryTheme(dayKind);

			return {
				date,
				estimatedCost: perDayBudget,
				items: buildFallbackItineraryItems({
					dayKind,
					destination: trip.destination,
					perDayBudget,
				}),
				pace: "balanced",
				summary: `${theme} with concrete stops, budget estimates, and buffers.`,
				theme,
				title: `Day ${dayNumber}`,
				weatherNote:
					"Confirm forecast and transfer conditions before locking plans.",
			};
		}),
		moments: [],
		places: [],
		rationale:
			"Viya created a complete fallback itinerary across the trip dates.",
		readinessItems: [],
		readinessUpdates: [],
		risks: [],
		title: "Complete itinerary draft",
	};
};

export const buildItineraryDayRecords = <TripId>({
	existingDayCount,
	payload,
	tripId,
}: {
	existingDayCount: number;
	payload: TripAgentDraftPayload;
	tripId: TripId;
}) =>
	limitDraftItems(payload.days).map((day, index) => {
		const dayNumber = existingDayCount + index + 1;
		const dayTitle = cleanString(day.title, `Day ${dayNumber}`);
		const normalizedDayTitle = normalizeForMatch(dayTitle);
		const shouldUseSequentialDayTitle =
			genericDayTitlePattern.test(normalizedDayTitle);

		return {
			date: day.date,
			dayNumber,
			estimatedCost: Math.max(0, day.estimatedCost),
			pace: cleanString(day.pace, "balanced"),
			summary: cleanString(day.summary, "Draft itinerary day."),
			theme: cleanString(day.theme, "Trip day"),
			title: shouldUseSequentialDayTitle ? `Day ${dayNumber}` : dayTitle,
			tripId,
			weatherNote: day.weatherNote,
		};
	});

export const buildItineraryItemRecords = <TripId, DayId>({
	day,
	dayId,
	tripId,
}: {
	day: TripAgentDraftPayload["days"][number];
	dayId: DayId;
	tripId: TripId;
}) =>
	limitDraftItems(day.items).map((item) => ({
		address: "",
		aiReason: cleanString(item.aiReason, "Generated by Viya."),
		category: cleanString(item.category, "activity"),
		dayId,
		description: item.description,
		durationMinutes: Math.max(0, item.durationMinutes),
		endTime: item.endTime,
		estimatedCost: Math.max(0, item.estimatedCost),
		locationName: item.locationName,
		priority: cleanString(item.priority, "medium"),
		startTime: item.startTime,
		status: "planned" as const,
		title: cleanString(item.title, "Draft itinerary item"),
		tripId,
	}));

export const buildSimpleDraftRecords = <TripId>({
	now,
	payload,
	tripId,
}: {
	now: number;
	payload: TripAgentDraftPayload;
	tripId: TripId;
}) => ({
	bookings: limitDraftItems(payload.bookingTargets).map((item) => ({
		cost: item.cost,
		createdAt: now,
		currency: item.currency,
		locationName: item.locationName,
		notes: item.notes,
		provider: item.provider,
		status: "target" as const,
		title: cleanString(item.title, "Booking target"),
		tripId,
		type: cleanString(item.type, "other"),
		updatedAt: now,
	})),
	budgetAmount:
		payload.budgetAmount && payload.budgetAmount > 0
			? payload.budgetAmount
			: undefined,
	moments: limitDraftItems(payload.moments).map((moment) => ({
		caption: cleanString(moment.caption, moment.title),
		createdAt: now,
		isHighlight: true as const,
		locationName: moment.locationName,
		note: moment.note,
		title: cleanString(moment.title, "Trip moment"),
		tripId,
	})),
	places: limitDraftItems(payload.places).map((item) => ({
		address: item.address,
		category: cleanString(item.category, "place"),
		createdAt: now,
		description: item.description,
		locationName: item.locationName,
		source: "ai" as const,
		title: cleanString(item.title, item.locationName),
		tripId,
		updatedAt: now,
	})),
	readinessItems: limitDraftItems(payload.readinessItems).map((item) => ({
		aiReason: "Generated by Viya.",
		category: cleanString(item.category, "schedule"),
		description: item.description,
		dueDate: item.dueDate,
		priority: cleanString(item.priority, "medium"),
		source: "ai" as const,
		status: "todo" as const,
		title: cleanString(item.title, "Readiness task"),
		tripId,
	})),
	risks: limitDraftItems(payload.risks).map((risk) => ({
		aiReason: "Generated by Viya.",
		createdAt: now,
		message: risk.message,
		severity: cleanString(risk.severity, "medium"),
		status: "open" as const,
		suggestedAction: risk.suggestedAction,
		title: cleanString(risk.title, "Trip risk"),
		tripId,
		type: cleanString(risk.type, "schedule"),
	})),
});
