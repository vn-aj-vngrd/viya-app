import {
	calculateReadinessScore,
	type Priority,
	type ReadinessCategory,
	type ReadinessItem,
	type WorkStatus,
} from "@viya-app/domain";
import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";

const toDomainReadinessItem = (item: Doc<"readinessItems">): ReadinessItem => ({
	id: item._id,
	tripId: item.tripId,
	category: item.category as ReadinessCategory,
	title: item.title,
	description: item.description,
	status: item.status as WorkStatus,
	priority: item.priority as Priority,
	dueDate: item.dueDate,
	assignedToMemberId: item.assignedToMemberId ?? null,
	aiReason: item.aiReason,
	source: item.source as ReadinessItem["source"],
});

export const listReadinessItems = query({
	args: {
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);

		return ctx.db
			.query("readinessItems")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.collect();
	},
});

export const updateReadinessItem = mutation({
	args: {
		readinessItemId: v.id("readinessItems"),
		status: v.union(
			v.literal("todo"),
			v.literal("inProgress"),
			v.literal("done"),
			v.literal("blocked"),
			v.literal("ignored")
		),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const item = await ctx.db.get(args.readinessItemId);

		if (!item) {
			throw new ConvexError("READINESS_ITEM_NOT_FOUND");
		}

		await ensureTripAccess(ctx, item.tripId, identity.subject);
		await ctx.db.patch(args.readinessItemId, {
			status: args.status,
		});

		return ctx.db.get(args.readinessItemId);
	},
});

export const recalculateReadinessScore = mutation({
	args: {
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		const items = await ctx.db
			.query("readinessItems")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.collect();
		const readiness = calculateReadinessScore(items.map(toDomainReadinessItem));

		await ctx.db.patch(args.tripId, {
			readinessScore: readiness.overallScore,
			updatedAt: Date.now(),
		});

		return {
			tripId: args.tripId,
			readinessScore: readiness.overallScore,
		};
	},
});
