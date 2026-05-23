import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { ensureUserRecord, getRequiredIdentity } from "./lib/auth";

export const listTrips = query({
	args: {},
	handler: async (ctx) => {
		const identity = await getRequiredIdentity(ctx);

		return ctx.db
			.query("trips")
			.withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
			.collect();
	},
});

export const getTripById = query({
	args: {
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const trip = await ctx.db.get(args.tripId);

		if (!trip || trip.ownerId !== identity.subject) {
			throw new ConvexError("TRIP_NOT_FOUND");
		}

		return trip;
	},
});

export const createTrip = mutation({
	args: {
		title: v.optional(v.string()),
		destination: v.string(),
		startDate: v.string(),
		endDate: v.string(),
		arrivalTime: v.optional(v.string()),
		departureTime: v.optional(v.string()),
		budgetAmount: v.optional(v.number()),
		budgetCurrency: v.optional(v.string()),
		travelStyle: v.optional(v.string()),
		groupType: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureUserRecord(ctx);

		const now = Date.now();
		const tripId = await ctx.db.insert("trips", {
			ownerId: identity.subject,
			title: args.title ?? `${args.destination} Trip`,
			destination: args.destination,
			startDate: args.startDate,
			endDate: args.endDate,
			arrivalTime: args.arrivalTime,
			departureTime: args.departureTime,
			budgetAmount: args.budgetAmount,
			budgetCurrency: args.budgetCurrency ?? "PHP",
			travelStyle: args.travelStyle ?? "balanced",
			pace: "moderate",
			groupType: args.groupType ?? "solo",
			status: "draft",
			readinessScore: 0,
			summary: "Trip draft created from Viya onboarding.",
			isDemo: false,
			createdAt: now,
			updatedAt: now,
		});

		return { tripId };
	},
});
