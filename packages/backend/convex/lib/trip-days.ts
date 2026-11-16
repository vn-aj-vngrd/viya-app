import { planItineraryDaysForRange } from "@viya-app/domain";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { clearDeletedTripEntityReferences } from "./tripLinks";

/** Makes itinerary days match the trip's date range; never deletes days with items. */
export async function syncItineraryDaysToTripRange(
	ctx: MutationCtx,
	tripId: Id<"trips">,
	range: { endDate: string; previousStartDate?: string; startDate: string }
) {
	const [days, items, places, moments] = await Promise.all([
		ctx.db
			.query("itineraryDays")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("itineraryItems")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("savedPlaces")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("moments")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
	]);
	const dayIdsWithItems = new Set(items.map((item) => item.dayId));
	const plan = planItineraryDaysForRange(
		range.startDate,
		range.endDate,
		days.map((day) => ({
			date: day.date,
			dayNumber: day.dayNumber,
			hasItems: dayIdsWithItems.has(day._id),
			id: day._id,
		})),
		range.previousStartDate
	);

	for (const removedId of plan.remove) {
		const dayId = removedId as Id<"itineraryDays">;

		for (const place of places) {
			if (place.assignedDayId === dayId) {
				await ctx.db.patch(place._id, {
					assignedDayId: undefined,
					updatedAt: Date.now(),
				});
			}
		}

		for (const moment of moments) {
			if (moment.dayId === dayId) {
				await ctx.db.patch(moment._id, { dayId: undefined });
			}
		}

		await clearDeletedTripEntityReferences({
			ctx,
			linkedEntityId: dayId,
			linkedEntityType: "itineraryDay",
			tripId,
		});
		await ctx.db.delete(dayId);
	}

	for (const update of plan.update) {
		await ctx.db.patch(update.id as Id<"itineraryDays">, {
			date: update.date,
			dayNumber: update.dayNumber,
		});
	}

	for (const day of plan.create) {
		await ctx.db.insert("itineraryDays", {
			date: day.date,
			dayNumber: day.dayNumber,
			estimatedCost: 0,
			pace: "balanced",
			summary: "",
			theme: "",
			title: `Day ${day.dayNumber}`,
			tripId,
			weatherNote: "",
		});
	}
}
