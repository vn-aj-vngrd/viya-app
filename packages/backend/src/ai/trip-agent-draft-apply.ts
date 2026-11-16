import { getTripDayCount, normalizeTimeOfDay } from "@viya-app/domain";
import { z } from "zod";

const maxDraftItems = 6;
/** Items kept per itinerary day (a day is a timeline, not a short list). */
export const maxItemsPerDay = 8;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]?\d|2[0-3]):[0-5]\d$/;

const isoDateSchema = z
	.string()
	.regex(isoDatePattern, "Use an ISO date (YYYY-MM-DD).");
const timeSchema = z.string().regex(timePattern, "Use a 24-hour HH:MM time.");

const priorityEnum = z.enum(["low", "medium", "high", "critical"]);
const itineraryPriorityEnum = z.enum([
	"required",
	"recommended",
	"optional",
	"low",
	"medium",
	"high",
]);
const itineraryCategoryEnum = z.enum([
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
const readinessCategoryEnum = z.enum([
	"documents",
	"bookings",
	"packing",
	"budget",
	"schedule",
	"transport",
	"weather",
	"safety",
	"group",
	"backupPlan",
]);
const bookingTypeEnum = z.enum([
	"flight",
	"hotel",
	"activity",
	"transport",
	"restaurant",
	"insurance",
	"other",
]);
const riskTypeEnum = z.enum([
	"weather",
	"schedule",
	"booking",
	"budget",
	"transport",
	"safety",
	"group",
	"document",
	"fatigue",
	"unknown",
]);
const changeTypeEnum = z.enum([
	"review",
	"add",
	"update",
	"budget",
	"note",
	"other",
]);

const changeSchema = z.object({
	detail: z.string(),
	title: z.string(),
	type: changeTypeEnum,
});

const generatedItineraryItemSchema = z.object({
	aiReason: z.string(),
	category: itineraryCategoryEnum,
	description: z.string(),
	durationMinutes: z.number(),
	endTime: timeSchema,
	estimatedCost: z.number(),
	locationName: z.string(),
	priority: itineraryPriorityEnum,
	startTime: timeSchema,
	title: z.string(),
});

const itineraryItemSchema = generatedItineraryItemSchema.extend({
	/** Existing stop to change or move; omitted for a new stop. */
	stopId: z.string().optional(),
});

const buildDaySchema = <Item extends z.ZodType>(item: Item) =>
	z.object({
		date: isoDateSchema,
		estimatedCost: z.number(),
		items: z.array(item).default([]),
		pace: z.string(),
		summary: z.string(),
		theme: z.string(),
		title: z.string(),
		weatherNote: z.string(),
	});

export const tripGroupTypeEnum = z.enum([
	"solo",
	"couple",
	"family",
	"friends",
	"work",
]);
export const tripPaceEnum = z.enum(["light", "balanced", "packed"]);

/** Trip profile fields a "profile" draft may change. All optional. */
export const tripProfileChangeSchema = z.object({
	arrivalTime: timeSchema.optional(),
	departureTime: timeSchema.optional(),
	destination: z.string().optional(),
	endDate: isoDateSchema.optional(),
	groupType: tripGroupTypeEnum.optional(),
	pace: tripPaceEnum.optional(),
	startDate: isoDateSchema.optional(),
	summary: z.string().optional(),
	title: z.string().optional(),
	travelerCount: z.number().int().optional(),
});

export type TripProfileChange = z.infer<typeof tripProfileChangeSchema>;

/**
 * What the one-shot module generator (generateTripAgentDraft) may return: no
 * stop ids, removals or profile changes, because it never sees record ids and
 * those edits are only validated on the chat path.
 */
export const generatedTripAgentDraftPayloadSchema = z.object({
	bookingTargets: z
		.array(
			z.object({
				cost: z.number().optional(),
				currency: z.string().optional(),
				endDateTime: z.string().optional(),
				locationName: z.string().optional(),
				notes: z.string().optional(),
				provider: z.string().optional(),
				startDateTime: z.string().optional(),
				title: z.string(),
				type: bookingTypeEnum,
			})
		)
		.default([]),
	budgetAmount: z.number().optional(),
	changes: z.array(changeSchema).default([]),
	days: z.array(buildDaySchema(generatedItineraryItemSchema)).default([]),
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
				category: readinessCategoryEnum,
				description: z.string(),
				dueDate: z.string(),
				priority: priorityEnum,
				title: z.string(),
			})
		)
		.default([]),
	risks: z
		.array(
			z.object({
				message: z.string(),
				severity: priorityEnum,
				suggestedAction: z.string(),
				title: z.string(),
				type: riskTypeEnum,
			})
		)
		.default([]),
	title: z.string(),
});

/** Stored draft payload: the generated shape plus chat-only edits. */
export const tripAgentDraftPayloadSchema =
	generatedTripAgentDraftPayloadSchema.extend({
		days: z.array(buildDaySchema(itineraryItemSchema)).default([]),
		profile: tripProfileChangeSchema.optional(),
		/** Existing stop ids an itinerary draft removes. */
		removeStopIds: z.array(z.string()).optional(),
	});

export type TripAgentDraftPayload = z.infer<typeof tripAgentDraftPayloadSchema>;

export type TripAgentDraftSource = "ai" | "fallback";

export const cleanString = (value: string, fallback: string) => {
	const trimmedValue = value.trim();

	return trimmedValue || fallback;
};

export const limitDraftItems = <T>(items: readonly T[]) =>
	items.slice(0, maxDraftItems);

const nonAlphanumericPattern = /[^\p{L}\p{N}]+/gu;

/** Case, punctuation and spacing insensitive key used to match titles. */
export const normalizeTitleKey = (value: string | undefined | null) =>
	(value ?? "").toLowerCase().replace(nonAlphanumericPattern, " ").trim();

const normalizeTimeKey = (value: string) => normalizeTimeOfDay(value) ?? "";

const keepUnique = <T>(items: readonly T[], getKey: (item: T) => string) => {
	const seen = new Set<string>();
	const unique: T[] = [];

	for (const item of items) {
		const key = getKey(item);

		if (!key || seen.has(key)) {
			continue;
		}

		seen.add(key);
		unique.push(item);
	}

	return unique;
};

type DraftDay = TripAgentDraftPayload["days"][number];
type DraftItem = DraftDay["items"][number];

export interface ExistingDayRef<DayId> {
	date: string;
	dayNumber: number;
	id: DayId;
}

export interface ExistingItemRef<ItemId, DayId> {
	dayId: DayId;
	id: ItemId;
	startTime: string;
	title: string;
}

const buildItemFields = (item: DraftItem) => ({
	aiReason: cleanString(item.aiReason, "Generated by Viya."),
	category: cleanString(item.category, "activity"),
	description: item.description,
	durationMinutes: Math.max(0, item.durationMinutes),
	endTime: normalizeTimeOfDay(item.endTime) ?? "",
	estimatedCost: Math.max(0, item.estimatedCost),
	locationName: item.locationName,
	priority: cleanString(item.priority, "medium"),
	startTime: normalizeTimeOfDay(item.startTime) ?? "",
	title: cleanString(item.title, "Draft itinerary item"),
});

export const buildItineraryItemRecords = <TripId, DayId>({
	day,
	dayId,
	tripId,
}: {
	day: DraftDay;
	dayId: DayId;
	tripId: TripId;
}) =>
	day.items.slice(0, maxItemsPerDay).map((item) => ({
		...buildItemFields(item),
		address: "",
		dayId,
		status: "planned" as const,
		tripId,
	}));

export const buildItineraryDayRecords = <TripId>({
	existingDayCount,
	payload,
	tripId,
}: {
	existingDayCount: number;
	payload: TripAgentDraftPayload;
	tripId: TripId;
}) =>
	payload.days.map((day, index) => {
		const dayNumber = existingDayCount + index + 1;

		return {
			date: day.date,
			dayNumber,
			estimatedCost: Math.max(0, day.estimatedCost),
			pace: cleanString(day.pace, "balanced"),
			summary: cleanString(day.summary, "Draft itinerary day."),
			theme: cleanString(day.theme, "Trip day"),
			title: cleanString(day.title, `Day ${dayNumber}`),
			tripId,
			weatherNote: day.weatherNote,
		};
	});

export type ItineraryMergeAction = "generate" | "refine" | "audit" | "explain";

type MergeDayTarget<DayId> = { existingId: DayId } | { createDate: string };

export interface ItineraryMergePlan<DayId, ItemId> {
	/** New items; `day` points at an existing day or a day to create. */
	itemInserts: {
		day: MergeDayTarget<DayId>;
		fields: ReturnType<typeof buildItemFields>;
	}[];
	/** Existing stops the draft removes. */
	itemRemovals: ItemId[];
	/** Items already present that the draft changes; `day` is set when it moves. */
	itemUpdates: {
		day?: MergeDayTarget<DayId>;
		fields: ReturnType<typeof buildItemFields>;
		id: ItemId;
	}[];
	/** Days missing from the trip that this draft needs. */
	newDays: {
		date: string;
		dayNumber: number;
		estimatedCost: number;
		pace: string;
		summary: string;
		theme: string;
		title: string;
		weatherNote: string;
	}[];
	skippedDuplicates: number;
	/** Stops the draft referenced by id that are no longer in the trip. */
	skippedMissing: number;
	skippedOutOfRange: number;
}

interface MergeState<DayId, ItemId> {
	action: ItineraryMergeAction;
	claimedItemIds: Set<ItemId>;
	dayByDate: Map<string, ExistingDayRef<DayId>>;
	existingItems: readonly ExistingItemRef<ItemId, DayId>[];
	plan: ItineraryMergePlan<DayId, ItemId>;
	plannedNewDates: Set<string>;
	seenInsertKeys: Set<string>;
	trip: { endDate: string; startDate: string };
}

const planNewDay = <DayId, ItemId>(
	state: MergeState<DayId, ItemId>,
	day: DraftDay
) => {
	if (state.dayByDate.has(day.date) || state.plannedNewDates.has(day.date)) {
		return;
	}

	const dayNumber = getTripDayCount(state.trip.startDate, day.date) ?? 1;

	state.plannedNewDates.add(day.date);
	state.plan.newDays.push({
		date: day.date,
		dayNumber,
		estimatedCost: Math.max(0, day.estimatedCost),
		pace: cleanString(day.pace, "balanced"),
		summary: cleanString(day.summary, "Draft itinerary day."),
		theme: cleanString(day.theme, "Trip day"),
		title: cleanString(day.title, `Day ${dayNumber}`),
		weatherNote: day.weatherNote,
	});
};

/** A stop the draft names by id: update it in place, or move it to this day. */
const planStopIdUpdate = <DayId, ItemId>(
	state: MergeState<DayId, ItemId>,
	item: DraftItem,
	target: MergeDayTarget<DayId>
) => {
	const existing = state.existingItems.find(
		(candidate) => candidate.id === item.stopId
	);

	if (!existing || state.claimedItemIds.has(existing.id)) {
		state.plan.skippedMissing += 1;
		return;
	}

	state.claimedItemIds.add(existing.id);
	const isSameDay =
		"existingId" in target && target.existingId === existing.dayId;

	state.plan.itemUpdates.push({
		...(isSameDay ? {} : { day: target }),
		fields: buildItemFields(item),
		id: existing.id,
	});
};

const findTitleMatch = <DayId, ItemId>(
	state: MergeState<DayId, ItemId>,
	dayItems: readonly ExistingItemRef<ItemId, DayId>[],
	fields: ReturnType<typeof buildItemFields>
) => {
	const titleKey = normalizeTitleKey(fields.title);
	const isFree = (existing: ExistingItemRef<ItemId, DayId>) =>
		!state.claimedItemIds.has(existing.id) &&
		normalizeTitleKey(existing.title) === titleKey;
	const exactMatch = dayItems.find(
		(existing) =>
			isFree(existing) &&
			normalizeTimeKey(existing.startTime) === fields.startTime
	);

	if (exactMatch || state.action !== "refine") {
		return exactMatch;
	}

	return dayItems.find(isFree);
};

const planDayItem = <DayId, ItemId>(
	state: MergeState<DayId, ItemId>,
	day: DraftDay,
	item: DraftItem,
	dayItems: readonly ExistingItemRef<ItemId, DayId>[]
) => {
	const existingDay = state.dayByDate.get(day.date);
	const target: MergeDayTarget<DayId> = existingDay
		? { existingId: existingDay.id }
		: { createDate: day.date };

	if (item.stopId) {
		planStopIdUpdate(state, item, target);
		return;
	}

	const fields = buildItemFields(item);
	const match = findTitleMatch(state, dayItems, fields);

	if (match) {
		state.claimedItemIds.add(match.id);

		if (state.action === "refine") {
			state.plan.itemUpdates.push({ fields, id: match.id });
		} else {
			state.plan.skippedDuplicates += 1;
		}

		return;
	}

	const insertKey = `${day.date}|${normalizeTitleKey(fields.title)}|${fields.startTime}`;

	if (state.seenInsertKeys.has(insertKey)) {
		state.plan.skippedDuplicates += 1;
		return;
	}

	state.seenInsertKeys.add(insertKey);
	state.plan.itemInserts.push({ day: target, fields });
};

const planRemovals = <DayId, ItemId>(
	state: MergeState<DayId, ItemId>,
	removeStopIds: readonly string[]
) => {
	for (const stopId of new Set(removeStopIds)) {
		const existing = state.existingItems.find(
			(candidate) => candidate.id === stopId
		);

		if (!existing || state.claimedItemIds.has(existing.id)) {
			state.plan.skippedMissing += 1;
			continue;
		}

		state.claimedItemIds.add(existing.id);
		state.plan.itemRemovals.push(existing.id);
	}
};

/**
 * Plans how a draft's itinerary merges into the trip: days are matched by
 * date, days outside the trip are skipped, and items already present (same
 * title and start time on the same day) are not added again. A refine draft
 * updates the matching item instead of skipping it. A stop with a `stopId`
 * updates (or moves) that exact stop, and `removeStopIds` deletes stops; ids
 * that are no longer in the trip are skipped, never guessed.
 */
export const planItineraryMerge = <
	DayId extends string,
	ItemId extends string,
>({
	action,
	existingDays,
	existingItems,
	payload,
	trip,
}: {
	action: ItineraryMergeAction;
	existingDays: readonly ExistingDayRef<DayId>[];
	existingItems: readonly ExistingItemRef<ItemId, DayId>[];
	payload: TripAgentDraftPayload;
	trip: { endDate: string; startDate: string };
}): ItineraryMergePlan<DayId, ItemId> => {
	const state: MergeState<DayId, ItemId> = {
		action,
		claimedItemIds: new Set<ItemId>(),
		dayByDate: new Map(existingDays.map((day) => [day.date, day])),
		existingItems,
		plan: {
			itemInserts: [],
			itemRemovals: [],
			itemUpdates: [],
			newDays: [],
			skippedDuplicates: 0,
			skippedMissing: 0,
			skippedOutOfRange: 0,
		},
		plannedNewDates: new Set<string>(),
		seenInsertKeys: new Set<string>(),
		trip,
	};

	for (const day of payload.days) {
		const items = day.items.slice(0, maxItemsPerDay);

		if (day.date < trip.startDate || day.date > trip.endDate) {
			state.plan.skippedOutOfRange += items.length;
			continue;
		}

		planNewDay(state, day);
		const existingDay = state.dayByDate.get(day.date);
		const dayItems = existingDay
			? existingItems.filter((item) => item.dayId === existingDay.id)
			: [];

		for (const item of items) {
			planDayItem(state, day, item, dayItems);
		}
	}

	planRemovals(state, payload.removeStopIds ?? []);

	return state.plan;
};

export interface ExistingSimpleRecords {
	bookings?: readonly { title: string; type?: string }[];
	moments?: readonly { title: string }[];
	places?: readonly { locationName?: string; title: string }[];
	readinessItems?: readonly { title: string }[];
	risks?: readonly { title: string }[];
}

export const buildSimpleDraftRecords = <TripId>({
	existing,
	now,
	payload,
	tripId,
}: {
	existing?: ExistingSimpleRecords;
	now: number;
	payload: TripAgentDraftPayload;
	tripId: TripId;
}) => {
	const existingKeys = {
		bookings: new Set(
			(existing?.bookings ?? []).map(
				(item) => `${normalizeTitleKey(item.title)}|${item.type ?? ""}`
			)
		),
		moments: new Set(
			(existing?.moments ?? []).map((item) => normalizeTitleKey(item.title))
		),
		places: new Set(
			(existing?.places ?? []).flatMap((item) => [
				normalizeTitleKey(item.title),
				normalizeTitleKey(item.locationName),
			])
		),
		readinessItems: new Set(
			(existing?.readinessItems ?? []).map((item) =>
				normalizeTitleKey(item.title)
			)
		),
		risks: new Set(
			(existing?.risks ?? []).map((item) => normalizeTitleKey(item.title))
		),
	};
	const isNew = (set: Set<string>, key: string) => key !== "" && !set.has(key);
	const bookings = keepUnique(
		limitDraftItems(payload.bookingTargets).map((item) => ({
			cost: item.cost,
			createdAt: now,
			currency: item.currency,
			endDateTime: item.endDateTime?.trim() || undefined,
			locationName: item.locationName,
			notes: item.notes,
			provider: item.provider,
			startDateTime: item.startDateTime?.trim() || undefined,
			status: "target" as const,
			title: cleanString(item.title, "Booking target"),
			tripId,
			type: cleanString(item.type, "other"),
			updatedAt: now,
		})),
		(item) => `${normalizeTitleKey(item.title)}|${item.type}`
	).filter((item) =>
		isNew(
			existingKeys.bookings,
			`${normalizeTitleKey(item.title)}|${item.type}`
		)
	);
	const moments = keepUnique(
		limitDraftItems(payload.moments).map((moment) => ({
			caption: cleanString(moment.caption, moment.title),
			createdAt: now,
			isHighlight: true as const,
			locationName: moment.locationName,
			note: moment.note,
			title: cleanString(moment.title, "Trip moment"),
			tripId,
		})),
		(item) => normalizeTitleKey(item.title)
	).filter((item) =>
		isNew(existingKeys.moments, normalizeTitleKey(item.title))
	);
	const places = keepUnique(
		limitDraftItems(payload.places).map((item) => ({
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
		(item) => normalizeTitleKey(item.title)
	).filter(
		(item) =>
			isNew(existingKeys.places, normalizeTitleKey(item.title)) &&
			!existingKeys.places.has(normalizeTitleKey(item.locationName))
	);
	const readinessItems = keepUnique(
		limitDraftItems(payload.readinessItems).map((item) => ({
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
		(item) => normalizeTitleKey(item.title)
	).filter((item) =>
		isNew(existingKeys.readinessItems, normalizeTitleKey(item.title))
	);
	const risks = keepUnique(
		limitDraftItems(payload.risks).map((risk) => ({
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
		(item) => normalizeTitleKey(item.title)
	).filter((item) => isNew(existingKeys.risks, normalizeTitleKey(item.title)));

	return {
		bookings,
		budgetAmount:
			payload.budgetAmount && payload.budgetAmount > 0
				? payload.budgetAmount
				: undefined,
		moments,
		places,
		readinessItems,
		risks,
	};
};

const formatAmount = (amount: number, currency: string) =>
	`${Math.round(amount).toLocaleString("en-US")} ${currency}`;

/** "10,000 PHP -> 15,000 PHP" when a draft would overwrite the budget. */
export const describeBudgetChange = ({
	currency = "PHP",
	current,
	next,
}: {
	currency?: string;
	current?: number;
	next?: number;
}): string | null => {
	if (!next || next <= 0 || next === current) {
		return null;
	}

	return current
		? `${formatAmount(current, currency)} -> ${formatAmount(next, currency)}`
		: `not set -> ${formatAmount(next, currency)}`;
};

const DRAFT_APPLY_TOUCH_WINDOW_MS = 2000;

/**
 * A draft is stale when the trip was edited after the draft was made. A trip
 * touch caused by applying another draft is not a user edit, so it is ignored.
 */
export const isDraftStale = ({
	draftCreatedAt,
	lastDraftAppliedAt,
	tripUpdatedAt,
}: {
	draftCreatedAt: number;
	lastDraftAppliedAt?: number;
	tripUpdatedAt: number;
}) => {
	if (tripUpdatedAt <= draftCreatedAt) {
		return false;
	}

	return !(
		lastDraftAppliedAt !== undefined &&
		lastDraftAppliedAt > draftCreatedAt &&
		tripUpdatedAt - lastDraftAppliedAt <= DRAFT_APPLY_TOUCH_WINDOW_MS
	);
};

const pluralize = (count: number, singular: string) =>
	`${count} ${singular}${count === 1 ? "" : "s"}`;

/** One-line, honest record of what applying a draft did. */
export const summarizeApply = ({
	added,
	budgetChange,
	isStale,
	profileChanges = [],
	removed = 0,
	skippedDuplicates,
	skippedMissing = 0,
	skippedOutOfRange,
	updated,
}: {
	added: number;
	budgetChange: string | null;
	isStale: boolean;
	profileChanges?: readonly string[];
	removed?: number;
	skippedDuplicates: number;
	skippedMissing?: number;
	skippedOutOfRange: number;
	updated: number;
}) => {
	const parts =
		profileChanges.length > 0 && added === 0
			? [`Updated ${profileChanges.join(", ")}`]
			: [`Added ${pluralize(added, "item")}`];

	if (updated > 0) {
		parts.push(`updated ${updated}`);
	}

	if (removed > 0) {
		parts.push(`removed ${removed}`);
	}

	if (skippedMissing > 0) {
		parts.push(`skipped ${skippedMissing} no longer in the trip`);
	}

	if (skippedDuplicates > 0) {
		parts.push(`skipped ${skippedDuplicates} already in the trip`);
	}

	if (skippedOutOfRange > 0) {
		parts.push(`skipped ${skippedOutOfRange} outside the trip dates`);
	}

	if (budgetChange) {
		parts.push(`budget ${budgetChange}`);
	}

	const summary = `${parts.join(", ")}.`;

	return isStale
		? `${summary} The trip changed after this draft was made, so duplicates were checked.`
		: summary;
};

interface TripProfileFields {
	arrivalTime?: string;
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

const profileFieldLabels: Record<keyof TripProfileChange, string> = {
	arrivalTime: "arrival time",
	departureTime: "departure time",
	destination: "destination",
	endDate: "end date",
	groupType: "group",
	pace: "pace",
	startDate: "start date",
	summary: "summary",
	title: "title",
	travelerCount: "travelers",
};

type TextProfileField = Exclude<keyof TripProfileChange, "travelerCount">;

const textProfileFields: TextProfileField[] = [
	"title",
	"destination",
	"startDate",
	"endDate",
	"arrivalTime",
	"departureTime",
	"groupType",
	"pace",
	"summary",
];

export type TripProfilePatch = Partial<
	Record<TextProfileField, string> & { travelerCount: number }
>;

const cleanProfileText = (key: TextProfileField, value: string | undefined) => {
	if (value === undefined) {
		return;
	}

	if (key === "arrivalTime" || key === "departureTime") {
		return normalizeTimeOfDay(value) ?? undefined;
	}

	return value.replace(/\s+/g, " ").trim() || undefined;
};

/**
 * The patch a profile draft makes against the trip as it is now: only fields
 * that differ are kept, so re-applying an old draft changes nothing twice.
 */
export const buildTripProfilePatch = (
	change: TripProfileChange | undefined,
	trip: TripProfileFields
): { labels: string[]; patch: TripProfilePatch } => {
	const patch: TripProfilePatch = {};
	const labels: string[] = [];

	for (const key of textProfileFields) {
		const value = cleanProfileText(key, change?.[key]);

		if (value !== undefined && value !== trip[key]) {
			patch[key] = value;
			labels.push(profileFieldLabels[key]);
		}
	}

	if (
		change?.travelerCount !== undefined &&
		change.travelerCount !== trip.travelerCount
	) {
		patch.travelerCount = change.travelerCount;
		labels.push(profileFieldLabels.travelerCount);
	}

	return { labels, patch };
};
