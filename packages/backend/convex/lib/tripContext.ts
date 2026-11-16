// biome-ignore-all lint/style/useFilenamingConvention: Convex module names are public API paths.

import { ConvexError } from "convex/values";

import { buildTripContextJson } from "../../src/ai/trip-context";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

const listLimit = 200;

/** Loads one owner's trip and returns the shared compact AI context JSON. */
export const loadTripContext = async (
	ctx: QueryCtx,
	{ ownerId, tripId }: { ownerId: string; tripId: Id<"trips"> }
) => {
	const trip = await ctx.db.get(tripId);

	if (!trip || trip.ownerId !== ownerId) {
		throw new ConvexError("TRIP_NOT_FOUND");
	}

	const [
		bookings,
		companions,
		documents,
		expenses,
		itineraryDays,
		itineraryItems,
		notes,
		readinessItems,
		risks,
		savedPlaces,
		vaultItems,
	] = await Promise.all([
		ctx.db
			.query("bookings")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.take(listLimit),
		ctx.db
			.query("tripCompanions")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.take(listLimit),
		ctx.db
			.query("travelDocuments")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.take(listLimit),
		ctx.db
			.query("expenses")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.order("desc")
			.take(listLimit),
		ctx.db
			.query("itineraryDays")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.take(listLimit),
		ctx.db
			.query("itineraryItems")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.take(listLimit),
		ctx.db
			.query("tripNotes")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.take(listLimit),
		ctx.db
			.query("readinessItems")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.take(listLimit),
		ctx.db
			.query("risks")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.take(listLimit),
		ctx.db
			.query("savedPlaces")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.take(listLimit),
		ctx.db
			.query("vaultItems")
			.withIndex("by_owner_trip", (q) =>
				q.eq("ownerId", ownerId).eq("tripId", tripId)
			)
			.take(listLimit),
	]);
	const dateByDayId = new Map(itineraryDays.map((day) => [day._id, day.date]));
	const sortedDays = [...itineraryDays].sort(
		(first, second) => first.dayNumber - second.dayNumber
	);
	const datedItems = itineraryItems
		.map((item) => ({ ...item, date: dateByDayId.get(item.dayId) ?? "" }))
		.sort(
			(first, second) =>
				first.date.localeCompare(second.date) ||
				first.startTime.localeCompare(second.startTime)
		);

	return {
		contextJson: buildTripContextJson({
			bookings,
			companions,
			documents,
			expenses,
			itineraryDays: sortedDays,
			itineraryItems: datedItems,
			notes,
			readinessItems,
			risks,
			savedPlaces,
			trip,
			vaultItems,
		}),
		trip,
	};
};
