import { sortTripCompanionsForCoordination } from "@viya-app/domain";
import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";
import { clearDeletedTripEntityReferences } from "./lib/tripLinks";

const touchTrip = async (ctx: MutationCtx, tripId: Id<"trips">) => {
	await ctx.db.patch(tripId, { updatedAt: Date.now() });
};

const getRequiredCompanion = async (
	ctx: MutationCtx,
	companionId: Id<"tripCompanions">,
	ownerId: string
) => {
	const companion = await ctx.db.get(companionId);

	if (!companion) {
		throw new ConvexError("TRIP_COMPANION_NOT_FOUND");
	}

	await ensureTripAccess(ctx, companion.tripId, ownerId);

	return companion;
};

const clearDeletedCompanionAssignments = async (
	ctx: MutationCtx,
	companionId: Id<"tripCompanions">,
	tripId: Id<"trips">
) => {
	const readinessItems = await ctx.db
		.query("readinessItems")
		.withIndex("by_trip", (q) => q.eq("tripId", tripId))
		.collect();

	for (const item of readinessItems) {
		if (item.assignedToMemberId === companionId) {
			await ctx.db.patch(item._id, {
				assignedToMemberId: undefined,
			});
		}
	}
};

export const listTripCompanions = query({
	args: { tripId: v.id("trips") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		const companions = await ctx.db
			.query("tripCompanions")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.collect();

		return sortTripCompanionsForCoordination(companions);
	},
});

export const createTripCompanion = mutation({
	args: {
		email: v.optional(v.string()),
		name: v.string(),
		notes: v.optional(v.string()),
		phone: v.optional(v.string()),
		role: v.string(),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		const now = Date.now();
		const companionId = await ctx.db.insert("tripCompanions", {
			...args,
			createdAt: now,
			updatedAt: now,
		});
		await touchTrip(ctx, args.tripId);

		return ctx.db.get(companionId);
	},
});

export const updateTripCompanion = mutation({
	args: {
		companionId: v.id("tripCompanions"),
		email: v.optional(v.string()),
		name: v.optional(v.string()),
		notes: v.optional(v.string()),
		phone: v.optional(v.string()),
		role: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const companion = await getRequiredCompanion(
			ctx,
			args.companionId,
			identity.subject
		);
		const { companionId, ...patch } = args;
		await ctx.db.patch(companionId, {
			...patch,
			updatedAt: Date.now(),
		});
		await touchTrip(ctx, companion.tripId);

		return ctx.db.get(companionId);
	},
});

export const deleteTripCompanion = mutation({
	args: { companionId: v.id("tripCompanions") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const companion = await getRequiredCompanion(
			ctx,
			args.companionId,
			identity.subject
		);
		await clearDeletedCompanionAssignments(
			ctx,
			args.companionId,
			companion.tripId
		);
		await clearDeletedTripEntityReferences({
			ctx,
			linkedEntityId: args.companionId,
			linkedEntityType: "companion",
			tripId: companion.tripId,
		});
		await ctx.db.delete(args.companionId);
		await touchTrip(ctx, companion.tripId);

		return { deletedCompanionId: args.companionId };
	},
});
