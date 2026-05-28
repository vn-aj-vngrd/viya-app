import {
	calculateReadinessScore,
	getMissingRequiredReadinessCategories,
	type Priority,
	type ReadinessCategory,
	type ReadinessItem,
	type WorkStatus,
} from "@viya-app/domain";
import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";

const baselineReadinessItems: Record<
	ReadinessCategory,
	{ description: string; priority: Priority; title: string }
> = {
	backupPlan: {
		description: "Add a practical fallback for delays, closures, or weather.",
		priority: "low",
		title: "Add backup plan",
	},
	bookings: {
		description: "Confirm transport, stay, and activity booking coverage.",
		priority: "high",
		title: "Confirm booking coverage",
	},
	budget: {
		description: "Check budget, cash access, and payment buffer.",
		priority: "medium",
		title: "Check travel budget",
	},
	documents: {
		description: "Upload IDs, tickets, vouchers, permits, or insurance.",
		priority: "high",
		title: "Upload required documents",
	},
	group: {
		description: "Confirm group roles and contact details.",
		priority: "medium",
		title: "Confirm group details",
	},
	packing: {
		description: "Prepare trip-specific packing needs.",
		priority: "low",
		title: "Prepare packing list",
	},
	safety: {
		description: "Save emergency contacts, health notes, and safety backups.",
		priority: "high",
		title: "Prepare safety basics",
	},
	schedule: {
		description: "Check buffers between flights, transfers, and activities.",
		priority: "medium",
		title: "Review schedule buffers",
	},
	transport: {
		description: "Confirm local transfers and transport timing.",
		priority: "medium",
		title: "Confirm transport plan",
	},
	weather: {
		description: "Check weather-sensitive plans and alternatives.",
		priority: "medium",
		title: "Review weather backup",
	},
};

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

const updateTripReadinessScore = async (
	ctx: MutationCtx,
	tripId: Doc<"trips">["_id"]
) => {
	const items = await ctx.db
		.query("readinessItems")
		.withIndex("by_trip", (q) => q.eq("tripId", tripId))
		.collect();
	const readiness = calculateReadinessScore(items.map(toDomainReadinessItem));

	await ctx.db.patch(tripId, {
		readinessScore: readiness.overallScore,
		updatedAt: Date.now(),
	});

	return readiness;
};

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
		await updateTripReadinessScore(ctx, item.tripId);

		return ctx.db.get(args.readinessItemId);
	},
});

export const ensureBaselineReadinessItems = mutation({
	args: {
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const trip = await ensureTripAccess(ctx, args.tripId, identity.subject);
		const existingItems = await ctx.db
			.query("readinessItems")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.collect();
		const missingCategories = getMissingRequiredReadinessCategories(
			existingItems.map(toDomainReadinessItem)
		);
		const now = Date.now();

		for (const category of missingCategories) {
			const baseline = baselineReadinessItems[category];
			await ctx.db.insert("readinessItems", {
				aiReason: "Baseline preparation coverage for this trip.",
				category,
				description: baseline.description,
				dueDate: trip.startDate,
				priority: baseline.priority,
				source: "system",
				status: "todo",
				title: baseline.title,
				tripId: args.tripId,
			});
		}

		if (missingCategories.length > 0) {
			await updateTripReadinessScore(ctx, args.tripId);
			await ctx.db.patch(args.tripId, { updatedAt: now });
		}

		return { createdCount: missingCategories.length };
	},
});

export const recalculateReadinessScore = mutation({
	args: {
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		const readiness = await updateTripReadinessScore(ctx, args.tripId);

		return {
			tripId: args.tripId,
			readinessScore: readiness.overallScore,
		};
	},
});
