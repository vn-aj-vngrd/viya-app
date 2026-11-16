// biome-ignore-all lint/style/useFilenamingConvention: Convex module names are public API paths.

import {
	addDaysToKey,
	getBudgetWalletSummary,
	getDateKeyInTimeZone,
	getTripDayCount,
} from "@viya-app/domain";
import { ConvexError, v } from "convex/values";

import { TRIP_CONTEXT_TIME_ZONE } from "../../src/ai/trip-context";
import type { Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";

const toolListLimit = 100;

const getOwnedTrip = async (
	ctx: QueryCtx,
	ownerId: string,
	tripId: Id<"trips">
) => {
	const trip = await ctx.db.get(tripId);

	if (!trip || trip.ownerId !== ownerId) {
		throw new ConvexError("TRIP_NOT_FOUND");
	}

	return trip;
};

const scopeArgs = { ownerId: v.string(), tripId: v.id("trips") };

export const getItinerary = internalQuery({
	args: { ...scopeArgs, date: v.optional(v.string()) },
	handler: async (ctx, args): Promise<string> => {
		await getOwnedTrip(ctx, args.ownerId, args.tripId);
		const [days, items] = await Promise.all([
			ctx.db
				.query("itineraryDays")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.take(toolListLimit),
			ctx.db
				.query("itineraryItems")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.take(toolListLimit * 3),
		]);
		const result = days
			.filter((day) => !args.date || day.date === args.date)
			.sort((first, second) => first.dayNumber - second.dayNumber)
			.map((day) => ({
				date: day.date,
				items: items
					.filter((item) => item.dayId === day._id)
					.sort((first, second) =>
						first.startTime.localeCompare(second.startTime)
					)
					.map((item) => ({
						endTime: item.endTime,
						estimatedCost: item.estimatedCost,
						locationName: item.locationName,
						startTime: item.startTime,
						status: item.status,
						title: item.title,
					})),
				title: day.title,
			}));

		return JSON.stringify(result);
	},
});

// Totals must cover every record, so these reads are not capped.
export const getBudgetSummary = internalQuery({
	args: scopeArgs,
	handler: async (ctx, args): Promise<string> => {
		const trip = await getOwnedTrip(ctx, args.ownerId, args.tripId);
		const [bookings, expenses, days, items] = await Promise.all([
			ctx.db
				.query("bookings")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("expenses")
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
		const today = getDateKeyInTimeZone(Date.now(), TRIP_CONTEXT_TIME_ZONE);
		const firstDay = today > trip.startDate ? today : trip.startDate;
		const remainingTripDays =
			today > trip.endDate ? 1 : (getTripDayCount(firstDay, trip.endDate) ?? 1);
		const summary = getBudgetWalletSummary({
			bookings,
			budgetAmount: trip.budgetAmount,
			budgetCurrency: trip.budgetCurrency,
			expenses,
			itineraryDays: days,
			itineraryItems: items,
			remainingTripDays,
		});

		return JSON.stringify({
			budgetAmount: trip.budgetAmount ?? null,
			budgetCurrency: trip.budgetCurrency ?? "PHP",
			summary,
			today,
			tripEnds: addDaysToKey(trip.endDate, 0),
		});
	},
});

export const getBookings = internalQuery({
	args: scopeArgs,
	handler: async (ctx, args): Promise<string> => {
		await getOwnedTrip(ctx, args.ownerId, args.tripId);
		const bookings = await ctx.db
			.query("bookings")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.take(toolListLimit);

		return JSON.stringify(
			bookings.map((booking) => ({
				cost: booking.cost,
				currency: booking.currency,
				endDateTime: booking.endDateTime,
				locationName: booking.locationName,
				provider: booking.provider,
				startDateTime: booking.startDateTime,
				status: booking.status,
				title: booking.title,
				type: booking.type,
			}))
		);
	},
});

export const getReadiness = internalQuery({
	args: scopeArgs,
	handler: async (ctx, args): Promise<string> => {
		const trip = await getOwnedTrip(ctx, args.ownerId, args.tripId);
		const [items, risks] = await Promise.all([
			ctx.db
				.query("readinessItems")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.take(toolListLimit),
			ctx.db
				.query("risks")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.take(toolListLimit),
		]);

		return JSON.stringify({
			readinessItems: items.map((item) => ({
				category: item.category,
				dueDate: item.dueDate,
				priority: item.priority,
				status: item.status,
				title: item.title,
			})),
			readinessScore: trip.readinessScore,
			risks: risks.map((risk) => ({
				severity: risk.severity,
				status: risk.status,
				suggestedAction: risk.suggestedAction,
				title: risk.title,
			})),
		});
	},
});
