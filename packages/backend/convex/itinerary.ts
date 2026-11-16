import {
	cleanText,
	findDuplicateItineraryDay,
	findNextFreeSlot,
	getItineraryCategoryForBooking,
	getItineraryCategoryForPlace,
	isDateWithinTripRange,
	normalizeTimeOfDay,
	parseTimeOfDay,
	sortTripItineraryItemsForTimeline,
	validateItineraryTiming,
} from "@viya-app/domain";
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";
import { clearDeletedTripEntityReferences } from "./lib/tripLinks";

const itineraryItemCategoryValidator = v.union(
	v.literal("activity"),
	v.literal("food"),
	v.literal("transport"),
	v.literal("hotel"),
	v.literal("rest"),
	v.literal("shopping"),
	v.literal("note"),
	v.literal("flight"),
	v.literal("emergency")
);

const itineraryItemPriorityValidator = v.union(
	v.literal("required"),
	v.literal("recommended"),
	v.literal("optional")
);

const itineraryItemStatusValidator = v.union(
	v.literal("planned"),
	v.literal("confirmed"),
	v.literal("skipped"),
	v.literal("completed")
);

const itineraryPaceValidator = v.union(
	v.literal("light"),
	v.literal("balanced"),
	v.literal("packed")
);

const touchTrip = async (ctx: MutationCtx, tripId: Id<"trips">) => {
	await ctx.db.patch(tripId, { updatedAt: Date.now() });
};

const getRequiredItineraryDay = async (
	ctx: MutationCtx,
	dayId: Id<"itineraryDays">,
	ownerId: string
) => {
	const day = await ctx.db.get(dayId);

	if (!day) {
		throw new ConvexError("ITINERARY_DAY_NOT_FOUND");
	}

	await ensureTripAccess(ctx, day.tripId, ownerId);

	return day;
};

const getRequiredItineraryItem = async (
	ctx: MutationCtx,
	itemId: Id<"itineraryItems">,
	ownerId: string
) => {
	const item = await ctx.db.get(itemId);

	if (!item) {
		throw new ConvexError("ITINERARY_ITEM_NOT_FOUND");
	}

	await ensureTripAccess(ctx, item.tripId, ownerId);

	return item;
};

const ensureMatchingDay = async (
	ctx: MutationCtx,
	dayId: Id<"itineraryDays">,
	tripId: Id<"trips">
) => {
	const day = await ctx.db.get(dayId);

	if (!day || day.tripId !== tripId) {
		throw new ConvexError("ITINERARY_DAY_TRIP_MISMATCH");
	}

	return day;
};

const ensureDayWithinTripRange = (
	day: Pick<Doc<"itineraryDays">, "date">,
	trip: Pick<Doc<"trips">, "endDate" | "startDate">
) => {
	if (!isDateWithinTripRange(day.date, trip.startDate, trip.endDate)) {
		throw new ConvexError("ITINERARY_DAY_OUTSIDE_TRIP_RANGE");
	}
};

const getValidatedTiming = (input: {
	endTime: string;
	overnight?: boolean;
	startTime: string;
}) => {
	const timing = validateItineraryTiming(input);

	if (!timing.ok) {
		throw new ConvexError(timing.error);
	}

	return timing;
};

const ensureValidCost = (cost: number | undefined) => {
	if (cost !== undefined && !(Number.isFinite(cost) && cost >= 0)) {
		throw new ConvexError("INVALID_ITINERARY_COST");
	}
};

const ensureNoDuplicateDay = async (
	ctx: MutationCtx,
	tripId: Id<"trips">,
	candidate: { date: string; dayNumber: number; id?: string }
) => {
	const days = await ctx.db
		.query("itineraryDays")
		.withIndex("by_trip", (q) => q.eq("tripId", tripId))
		.collect();
	const duplicate = findDuplicateItineraryDay(
		candidate,
		days.map((day) => ({
			date: day.date,
			dayNumber: day.dayNumber,
			id: day._id,
		}))
	);

	if (duplicate) {
		throw new ConvexError(
			duplicate === "date"
				? "ITINERARY_DAY_DATE_TAKEN"
				: "ITINERARY_DAY_NUMBER_TAKEN"
		);
	}
};

interface ItineraryBookingPatch {
	bookingId?: string;
}

const hasOwnObjectProperty = <T extends object>(
	value: T,
	key: PropertyKey
): boolean => key in value;

const getItineraryBookingPatch = async (
	ctx: MutationCtx,
	bookingId: string | undefined,
	tripId: Id<"trips">
): Promise<ItineraryBookingPatch> => {
	if (bookingId === undefined) {
		return {};
	}

	const normalizedBookingId = bookingId.trim();

	if (!normalizedBookingId) {
		return { bookingId: undefined };
	}

	const id = ctx.db.normalizeId("bookings", normalizedBookingId);
	const booking = id ? await ctx.db.get(id) : null;

	if (!booking || booking.tripId !== tripId) {
		throw new ConvexError("BOOKING_TRIP_MISMATCH");
	}

	return { bookingId: booking._id };
};

const ensureItineraryPlace = async (
	ctx: MutationCtx,
	item: Doc<"itineraryItems">
) => {
	if (!item.locationName) {
		return;
	}

	const places = await ctx.db
		.query("savedPlaces")
		.withIndex("by_trip", (q) => q.eq("tripId", item.tripId))
		.collect();
	const matchingPlace = places.find(
		(place) =>
			place.source === "itinerary" &&
			place.locationName.toLowerCase() === item.locationName.toLowerCase()
	);
	const patch = {
		address: item.address || undefined,
		assignedDayId: item.dayId,
		category: item.category,
		description: item.description || undefined,
		latitude: item.latitude,
		locationName: item.locationName,
		longitude: item.longitude,
		title: item.title,
		updatedAt: Date.now(),
	};

	if (matchingPlace) {
		await ctx.db.patch(matchingPlace._id, patch);
		return;
	}

	await ctx.db.insert("savedPlaces", {
		...patch,
		createdAt: Date.now(),
		source: "itinerary",
		tripId: item.tripId,
	});
};

export const listTripItinerary = query({
	args: { tripId: v.id("trips") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		const [days, items] = await Promise.all([
			ctx.db
				.query("itineraryDays")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("itineraryItems")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
		]);

		const sortedDays = [...days].sort(
			(firstDay, secondDay) => firstDay.dayNumber - secondDay.dayNumber
		);
		const dayOrderById = new Map(
			sortedDays.map((day) => [day._id, day.dayNumber])
		);

		return {
			days: sortedDays,
			items: sortTripItineraryItemsForTimeline(items, dayOrderById),
		};
	},
});

export const createItineraryDay = mutation({
	args: {
		date: v.string(),
		dayNumber: v.number(),
		estimatedCost: v.number(),
		pace: itineraryPaceValidator,
		summary: v.string(),
		theme: v.string(),
		title: v.string(),
		tripId: v.id("trips"),
		weatherNote: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const trip = await ensureTripAccess(ctx, args.tripId, identity.subject);

		if (!(Number.isInteger(args.dayNumber) && args.dayNumber >= 1)) {
			throw new ConvexError("INVALID_DAY_NUMBER");
		}

		ensureDayWithinTripRange(args, trip);
		ensureValidCost(args.estimatedCost);
		await ensureNoDuplicateDay(ctx, args.tripId, args);
		const dayId = await ctx.db.insert("itineraryDays", {
			...args,
			title: cleanText(args.title) || `Day ${args.dayNumber}`,
		});
		await touchTrip(ctx, args.tripId);

		return ctx.db.get(dayId);
	},
});

export const updateItineraryDay = mutation({
	args: {
		dayId: v.id("itineraryDays"),
		date: v.optional(v.string()),
		dayNumber: v.optional(v.number()),
		estimatedCost: v.optional(v.number()),
		pace: v.optional(itineraryPaceValidator),
		summary: v.optional(v.string()),
		theme: v.optional(v.string()),
		title: v.optional(v.string()),
		weatherNote: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const day = await getRequiredItineraryDay(
			ctx,
			args.dayId,
			identity.subject
		);
		const { dayId, ...patch } = args;

		if (args.date !== undefined || args.dayNumber !== undefined) {
			const trip = await ensureTripAccess(ctx, day.tripId, identity.subject);
			const next = {
				date: args.date ?? day.date,
				dayNumber: args.dayNumber ?? day.dayNumber,
			};

			if (!(Number.isInteger(next.dayNumber) && next.dayNumber >= 1)) {
				throw new ConvexError("INVALID_DAY_NUMBER");
			}

			ensureDayWithinTripRange(next, trip);
			await ensureNoDuplicateDay(ctx, day.tripId, { ...next, id: dayId });
		}

		ensureValidCost(args.estimatedCost);

		if (args.title !== undefined) {
			patch.title = cleanText(args.title) || day.title;
		}

		await ctx.db.patch(dayId, patch);
		await touchTrip(ctx, day.tripId);

		return ctx.db.get(dayId);
	},
});

export const deleteItineraryDay = mutation({
	args: { dayId: v.id("itineraryDays") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const day = await getRequiredItineraryDay(
			ctx,
			args.dayId,
			identity.subject
		);
		const [items, places, moments] = await Promise.all([
			ctx.db
				.query("itineraryItems")
				.withIndex("by_trip", (q) => q.eq("tripId", day.tripId))
				.collect(),
			ctx.db
				.query("savedPlaces")
				.withIndex("by_trip", (q) => q.eq("tripId", day.tripId))
				.collect(),
			ctx.db
				.query("moments")
				.withIndex("by_trip", (q) => q.eq("tripId", day.tripId))
				.collect(),
		]);
		const now = Date.now();

		for (const item of items) {
			if (item.dayId === args.dayId) {
				await clearDeletedTripEntityReferences({
					ctx,
					linkedEntityId: item._id,
					linkedEntityType: "itineraryItem",
					tripId: day.tripId,
				});
				await ctx.db.delete(item._id);
			}
		}

		for (const place of places) {
			if (place.assignedDayId === args.dayId) {
				await ctx.db.patch(place._id, {
					assignedDayId: undefined,
					updatedAt: now,
				});
			}
		}

		for (const moment of moments) {
			if (moment.dayId === args.dayId) {
				await ctx.db.patch(moment._id, {
					dayId: undefined,
				});
			}
		}

		await clearDeletedTripEntityReferences({
			ctx,
			linkedEntityId: args.dayId,
			linkedEntityType: "itineraryDay",
			tripId: day.tripId,
		});
		await ctx.db.delete(args.dayId);
		await touchTrip(ctx, day.tripId);

		return { deletedDayId: args.dayId };
	},
});

export const createItineraryItem = mutation({
	args: {
		address: v.string(),
		aiReason: v.string(),
		bookingId: v.optional(v.string()),
		category: itineraryItemCategoryValidator,
		dayId: v.id("itineraryDays"),
		description: v.string(),
		durationMinutes: v.number(),
		endTime: v.string(),
		estimatedCost: v.number(),
		latitude: v.optional(v.number()),
		locationName: v.string(),
		longitude: v.optional(v.number()),
		/** Allows an end time at or before the start (the stop runs past midnight). */
		overnight: v.optional(v.boolean()),
		priority: itineraryItemPriorityValidator,
		startTime: v.string(),
		status: itineraryItemStatusValidator,
		title: v.string(),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const trip = await ensureTripAccess(ctx, args.tripId, identity.subject);
		const day = await ensureMatchingDay(ctx, args.dayId, args.tripId);
		ensureDayWithinTripRange(day, trip);
		const title = cleanText(args.title);

		if (!title) {
			throw new ConvexError("INVALID_ITINERARY_TITLE");
		}

		ensureValidCost(args.estimatedCost);
		const timing = getValidatedTiming(args);
		const { bookingId, overnight: _overnight, ...itemArgs } = args;
		const itemId = await ctx.db.insert("itineraryItems", {
			...itemArgs,
			durationMinutes: timing.durationMinutes,
			endTime: timing.endTime,
			startTime: timing.startTime,
			title,
			...(await getItineraryBookingPatch(ctx, bookingId, args.tripId)),
		});
		const item = await ctx.db.get(itemId);

		if (item) {
			await ensureItineraryPlace(ctx, item);
		}

		await touchTrip(ctx, args.tripId);

		return ctx.db.get(itemId);
	},
});

export const updateItineraryItem = mutation({
	args: {
		itemId: v.id("itineraryItems"),
		address: v.optional(v.string()),
		aiReason: v.optional(v.string()),
		bookingId: v.optional(v.string()),
		category: v.optional(itineraryItemCategoryValidator),
		dayId: v.optional(v.id("itineraryDays")),
		description: v.optional(v.string()),
		durationMinutes: v.optional(v.number()),
		endTime: v.optional(v.string()),
		estimatedCost: v.optional(v.number()),
		latitude: v.optional(v.number()),
		locationName: v.optional(v.string()),
		longitude: v.optional(v.number()),
		overnight: v.optional(v.boolean()),
		priority: v.optional(itineraryItemPriorityValidator),
		startTime: v.optional(v.string()),
		status: v.optional(itineraryItemStatusValidator),
		title: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const item = await getRequiredItineraryItem(
			ctx,
			args.itemId,
			identity.subject
		);

		if (args.dayId) {
			const day = await ensureMatchingDay(ctx, args.dayId, item.tripId);
			const trip = await ensureTripAccess(ctx, item.tripId, identity.subject);
			ensureDayWithinTripRange(day, trip);
		}

		ensureValidCost(args.estimatedCost);

		const shouldUpdateBooking = hasOwnObjectProperty(args, "bookingId");
		const { bookingId, itemId, overnight, ...patch } = args;

		if (args.title !== undefined) {
			const title = cleanText(args.title);

			if (!title) {
				throw new ConvexError("INVALID_ITINERARY_TITLE");
			}

			patch.title = title;
		}

		if (args.startTime !== undefined || args.endTime !== undefined) {
			const timing = getValidatedTiming({
				endTime: args.endTime ?? item.endTime,
				overnight,
				startTime: args.startTime ?? item.startTime,
			});
			patch.startTime = timing.startTime;
			patch.endTime = timing.endTime;
			patch.durationMinutes = timing.durationMinutes;
		}

		const bookingPatch = shouldUpdateBooking
			? await getItineraryBookingPatch(ctx, bookingId, item.tripId)
			: {};
		await ctx.db.patch(itemId, {
			...patch,
			...bookingPatch,
		});
		const updatedItem = await ctx.db.get(itemId);

		if (updatedItem) {
			await ensureItineraryPlace(ctx, updatedItem);
		}

		await touchTrip(ctx, item.tripId);

		return updatedItem;
	},
});

export const moveItineraryItem = mutation({
	args: {
		dayId: v.id("itineraryDays"),
		endTime: v.optional(v.string()),
		itemId: v.id("itineraryItems"),
		overnight: v.optional(v.boolean()),
		startTime: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const item = await getRequiredItineraryItem(
			ctx,
			args.itemId,
			identity.subject
		);
		const day = await ensureMatchingDay(ctx, args.dayId, item.tripId);
		const trip = await ensureTripAccess(ctx, item.tripId, identity.subject);
		ensureDayWithinTripRange(day, trip);
		const timing = getValidatedTiming({
			endTime: args.endTime ?? item.endTime,
			overnight: args.overnight,
			startTime: args.startTime ?? item.startTime,
		});
		await ctx.db.patch(args.itemId, {
			dayId: args.dayId,
			durationMinutes: timing.durationMinutes,
			endTime: timing.endTime,
			startTime: timing.startTime,
		});
		const updatedItem = await ctx.db.get(args.itemId);

		if (updatedItem) {
			await ensureItineraryPlace(ctx, updatedItem);
		}

		await touchTrip(ctx, item.tripId);

		return updatedItem;
	},
});

export const deleteItineraryItem = mutation({
	args: { itemId: v.id("itineraryItems") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const item = await getRequiredItineraryItem(
			ctx,
			args.itemId,
			identity.subject
		);
		await clearDeletedTripEntityReferences({
			ctx,
			linkedEntityId: args.itemId,
			linkedEntityType: "itineraryItem",
			tripId: item.tripId,
		});
		await ctx.db.delete(args.itemId);
		await touchTrip(ctx, item.tripId);

		return { deletedItemId: args.itemId };
	},
});

const getDayTimedItems = async (
	ctx: MutationCtx,
	tripId: Id<"trips">,
	dayId: Id<"itineraryDays">
) => {
	const items = await ctx.db
		.query("itineraryItems")
		.withIndex("by_trip", (q) => q.eq("tripId", tripId))
		.collect();

	return items.filter(
		(item) => item.dayId === dayId && item.status !== "skipped"
	);
};

const DEFAULT_STOP_MINUTES = 60;
const MINUTES_PER_HOUR = 60;

/** Adds a saved place to a day as a stop, in the next free slot. */
export const addPlaceToItinerary = mutation({
	args: {
		dayId: v.id("itineraryDays"),
		placeId: v.id("savedPlaces"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const place = await ctx.db.get(args.placeId);

		if (!place) {
			throw new ConvexError("PLACE_NOT_FOUND");
		}

		const trip = await ensureTripAccess(ctx, place.tripId, identity.subject);
		const day = await ensureMatchingDay(ctx, args.dayId, place.tripId);
		ensureDayWithinTripRange(day, trip);
		const slot = findNextFreeSlot(
			await getDayTimedItems(ctx, place.tripId, args.dayId)
		);
		const itemId = await ctx.db.insert("itineraryItems", {
			address: place.address ?? place.locationName,
			aiReason: "Added from a saved place.",
			category: getItineraryCategoryForPlace(
				place.category
			) as Doc<"itineraryItems">["category"],
			dayId: args.dayId,
			description: place.description ?? "Planned trip item.",
			durationMinutes: DEFAULT_STOP_MINUTES,
			endTime: slot.endTime,
			estimatedCost: 0,
			latitude: place.latitude,
			locationName: place.locationName,
			longitude: place.longitude,
			priority: "recommended",
			startTime: slot.startTime,
			status: "planned",
			title: place.title,
			tripId: place.tripId,
		});
		await ctx.db.patch(args.placeId, {
			assignedDayId: args.dayId,
			updatedAt: Date.now(),
		});
		await touchTrip(ctx, place.tripId);

		return ctx.db.get(itemId);
	},
});

/**
 * Adds a booking to the itinerary. Uses the day matching its start date, or
 * the given day; keeps the booking's time when it has one.
 */
export const addBookingToItinerary = mutation({
	args: {
		bookingId: v.id("bookings"),
		dayId: v.optional(v.id("itineraryDays")),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const booking = await ctx.db.get(args.bookingId);

		if (!booking) {
			throw new ConvexError("BOOKING_NOT_FOUND");
		}

		const trip = await ensureTripAccess(ctx, booking.tripId, identity.subject);
		const days = await ctx.db
			.query("itineraryDays")
			.withIndex("by_trip", (q) => q.eq("tripId", booking.tripId))
			.collect();
		const bookingDate = booking.startDateTime?.slice(0, 10);
		const day = args.dayId
			? days.find((candidate) => candidate._id === args.dayId)
			: days.find((candidate) => candidate.date === bookingDate);

		if (!day) {
			throw new ConvexError("ITINERARY_DAY_NOT_FOUND");
		}

		ensureDayWithinTripRange(day, trip);
		const existing = await ctx.db
			.query("itineraryItems")
			.withIndex("by_trip", (q) => q.eq("tripId", booking.tripId))
			.collect();

		if (existing.some((item) => item.bookingId === booking._id)) {
			throw new ConvexError("BOOKING_ALREADY_IN_ITINERARY");
		}

		const bookingTime = normalizeBookingTime(booking.startDateTime);
		const slot = bookingTime
			? validateItineraryTiming({
					endTime:
						normalizeBookingTime(booking.endDateTime) ??
						addMinutesToTime(bookingTime, DEFAULT_STOP_MINUTES),
					overnight: true,
					startTime: bookingTime,
				})
			: null;
		const timing =
			slot?.ok === true
				? slot
				: {
						...findNextFreeSlot(
							await getDayTimedItems(ctx, booking.tripId, day._id)
						),
						durationMinutes: DEFAULT_STOP_MINUTES,
					};
		const itemId = await ctx.db.insert("itineraryItems", {
			address: booking.address ?? booking.locationName ?? "",
			aiReason: "Added from a booking.",
			bookingId: booking._id,
			category: getItineraryCategoryForBooking(
				booking.type
			) as Doc<"itineraryItems">["category"],
			dayId: day._id,
			description: booking.notes ?? "Planned trip item.",
			durationMinutes: timing.durationMinutes,
			endTime: timing.endTime,
			estimatedCost: booking.cost ?? 0,
			locationName: booking.locationName ?? booking.provider ?? booking.title,
			priority: "required",
			startTime: timing.startTime,
			status: "planned",
			title: booking.title,
			tripId: booking.tripId,
		});
		await touchTrip(ctx, booking.tripId);

		return ctx.db.get(itemId);
	},
});

const TIME_IN_DATETIME = /[ T](\d{1,2}:\d{2})/;

const normalizeBookingTime = (value: string | undefined) => {
	const match = value ? TIME_IN_DATETIME.exec(value) : null;

	return match?.[1] ? normalizeTimeOfDay(match[1]) : null;
};

const addMinutesToTime = (time: string, minutes: number) => {
	const parsed = parseTimeOfDay(time) ?? 0;
	const total = Math.min(parsed + minutes, 23 * MINUTES_PER_HOUR + 59);

	return `${String(Math.floor(total / MINUTES_PER_HOUR)).padStart(2, "0")}:${String(total % MINUTES_PER_HOUR).padStart(2, "0")}`;
};
