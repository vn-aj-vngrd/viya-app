import { sortTripPlacesForRouteReview } from "@viya-app/domain";
import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";
import { clearDeletedTripEntityReferences } from "./lib/tripLinks";

const touchTrip = async (ctx: MutationCtx, tripId: Id<"trips">) => {
	await ctx.db.patch(tripId, { updatedAt: Date.now() });
};

const getRequiredSavedPlace = async (
	ctx: MutationCtx,
	placeId: Id<"savedPlaces">,
	ownerId: string
) => {
	const place = await ctx.db.get(placeId);

	if (!place) {
		throw new ConvexError("SAVED_PLACE_NOT_FOUND");
	}

	await ensureTripAccess(ctx, place.tripId, ownerId);

	return place;
};

const ensureDayBelongsToTrip = async (
	ctx: MutationCtx,
	dayId: Id<"itineraryDays"> | undefined,
	tripId: Id<"trips">
) => {
	if (!dayId) {
		return;
	}

	const day = await ctx.db.get(dayId);

	if (!day || day.tripId !== tripId) {
		throw new ConvexError("ITINERARY_DAY_TRIP_MISMATCH");
	}
};

export const listTripPlaces = query({
	args: { tripId: v.id("trips") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		const [savedPlaces, itineraryDays, itineraryItems] = await Promise.all([
			ctx.db
				.query("savedPlaces")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("itineraryDays")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("itineraryItems")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
		]);
		const dayOrderById = new Map(
			itineraryDays.map((day) => [day._id, day.dayNumber])
		);

		const itineraryPlaces = itineraryItems
			.filter((item) => item.locationName)
			.map((item) => ({
				address: item.address,
				assignedDayId: item.dayId,
				category: item.category,
				description: item.description,
				id: item._id,
				latitude: item.latitude,
				locationName: item.locationName,
				longitude: item.longitude,
				source: "itinerary" as const,
				title: item.title,
			}));
		const sortedSavedPlaces = sortTripPlacesForRouteReview(
			savedPlaces,
			dayOrderById
		);
		const sortedItineraryPlaces = sortTripPlacesForRouteReview(
			itineraryPlaces,
			dayOrderById
		);

		return {
			itineraryPlaces: sortedItineraryPlaces,
			routeStats: {
				geocodedPlaceCount: [
					...sortedSavedPlaces,
					...sortedItineraryPlaces,
				].filter(
					(place) =>
						place.latitude !== undefined && place.longitude !== undefined
				).length,
				placeCount: sortedSavedPlaces.length + sortedItineraryPlaces.length,
				savedPlaceCount: sortedSavedPlaces.length,
			},
			savedPlaces: sortedSavedPlaces,
		};
	},
});

export const createSavedPlace = mutation({
	args: {
		assignedDayId: v.optional(v.id("itineraryDays")),
		address: v.optional(v.string()),
		category: v.string(),
		description: v.optional(v.string()),
		latitude: v.optional(v.number()),
		locationName: v.string(),
		longitude: v.optional(v.number()),
		title: v.string(),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		await ensureDayBelongsToTrip(ctx, args.assignedDayId, args.tripId);
		const now = Date.now();
		const placeId = await ctx.db.insert("savedPlaces", {
			...args,
			createdAt: now,
			source: "user",
			updatedAt: now,
		});
		await touchTrip(ctx, args.tripId);

		return ctx.db.get(placeId);
	},
});

export const updateSavedPlace = mutation({
	args: {
		placeId: v.id("savedPlaces"),
		assignedDayId: v.optional(v.id("itineraryDays")),
		address: v.optional(v.string()),
		category: v.optional(v.string()),
		description: v.optional(v.string()),
		latitude: v.optional(v.number()),
		locationName: v.optional(v.string()),
		longitude: v.optional(v.number()),
		title: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const place = await getRequiredSavedPlace(
			ctx,
			args.placeId,
			identity.subject
		);
		await ensureDayBelongsToTrip(ctx, args.assignedDayId, place.tripId);
		const { placeId, ...patch } = args;
		await ctx.db.patch(placeId, {
			...patch,
			updatedAt: Date.now(),
		});
		await touchTrip(ctx, place.tripId);

		return ctx.db.get(placeId);
	},
});

export const assignPlaceToDay = mutation({
	args: {
		assignedDayId: v.optional(v.id("itineraryDays")),
		placeId: v.id("savedPlaces"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const place = await getRequiredSavedPlace(
			ctx,
			args.placeId,
			identity.subject
		);
		await ensureDayBelongsToTrip(ctx, args.assignedDayId, place.tripId);
		await ctx.db.patch(args.placeId, {
			assignedDayId: args.assignedDayId,
			updatedAt: Date.now(),
		});
		await touchTrip(ctx, place.tripId);

		return ctx.db.get(args.placeId);
	},
});

export const deleteSavedPlace = mutation({
	args: { placeId: v.id("savedPlaces") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const place = await getRequiredSavedPlace(
			ctx,
			args.placeId,
			identity.subject
		);
		await clearDeletedTripEntityReferences({
			ctx,
			linkedEntityId: args.placeId,
			linkedEntityType: "savedPlace",
			tripId: place.tripId,
		});
		await ctx.db.delete(args.placeId);
		await touchTrip(ctx, place.tripId);

		return { deletedPlaceId: args.placeId };
	},
});
