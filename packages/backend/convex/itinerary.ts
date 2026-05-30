import { sortTripItineraryItemsForTimeline } from "@viya-app/domain";
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
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		const dayId = await ctx.db.insert("itineraryDays", args);
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
		priority: itineraryItemPriorityValidator,
		startTime: v.string(),
		status: itineraryItemStatusValidator,
		title: v.string(),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		await ensureMatchingDay(ctx, args.dayId, args.tripId);
		const { bookingId, ...itemArgs } = args;
		const itemId = await ctx.db.insert("itineraryItems", {
			...itemArgs,
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
			await ensureMatchingDay(ctx, args.dayId, item.tripId);
		}

		const shouldUpdateBooking = hasOwnObjectProperty(args, "bookingId");
		const { bookingId, itemId, ...patch } = args;
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
		endTime: v.string(),
		itemId: v.id("itineraryItems"),
		startTime: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const item = await getRequiredItineraryItem(
			ctx,
			args.itemId,
			identity.subject
		);
		await ensureMatchingDay(ctx, args.dayId, item.tripId);
		await ctx.db.patch(args.itemId, {
			dayId: args.dayId,
			endTime: args.endTime,
			startTime: args.startTime,
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
