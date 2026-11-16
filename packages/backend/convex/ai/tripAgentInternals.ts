// biome-ignore-all lint/style/useFilenamingConvention: Convex module names are public API paths.

import { ConvexError, v } from "convex/values";

import { internalMutation, internalQuery } from "../_generated/server";
import { loadTripContext } from "../lib/tripContext";

const tripAgentModuleValidator = v.union(
	v.literal("itinerary"),
	v.literal("places"),
	v.literal("bookings"),
	v.literal("documents"),
	v.literal("budget"),
	v.literal("readiness"),
	v.literal("risks"),
	v.literal("travel"),
	v.literal("recap")
);

const tripAgentActionValidator = v.union(
	v.literal("generate"),
	v.literal("refine"),
	v.literal("audit"),
	v.literal("explain")
);

export const getTripAgentContext = internalQuery({
	args: {
		ownerId: v.string(),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const { contextJson, trip } = await loadTripContext(ctx, args);

		return {
			contextJson,
			trip: {
				budgetAmount: trip.budgetAmount,
				budgetCurrency: trip.budgetCurrency,
				destination: trip.destination,
				endDate: trip.endDate,
				startDate: trip.startDate,
				title: trip.title,
			},
		};
	},
});

export const saveGeneratedTripAgentDraft = internalMutation({
	args: {
		action: tripAgentActionValidator,
		module: tripAgentModuleValidator,
		ownerId: v.string(),
		payloadJson: v.string(),
		rationale: v.string(),
		source: v.optional(v.union(v.literal("ai"), v.literal("fallback"))),
		title: v.string(),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const trip = await ctx.db.get(args.tripId);

		if (!trip || trip.ownerId !== args.ownerId) {
			throw new ConvexError("TRIP_NOT_FOUND");
		}

		const now = Date.now();
		const draftId = await ctx.db.insert("tripAgentDrafts", {
			action: args.action,
			createdAt: now,
			module: args.module,
			ownerId: args.ownerId,
			payloadJson: args.payloadJson,
			rationale: args.rationale,
			source: args.source,
			status: "draft",
			title: args.title,
			tripId: args.tripId,
			updatedAt: now,
		});

		await ctx.db.patch(args.tripId, { updatedAt: now });

		return ctx.db.get(draftId);
	},
});
