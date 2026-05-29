import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";

const riskSeverityValidator = v.union(
	v.literal("low"),
	v.literal("medium"),
	v.literal("high"),
	v.literal("critical")
);

const riskStatusValidator = v.union(
	v.literal("open"),
	v.literal("mitigated"),
	v.literal("dismissed")
);

const riskTypeValidator = v.union(
	v.literal("weather"),
	v.literal("schedule"),
	v.literal("booking"),
	v.literal("budget"),
	v.literal("transport"),
	v.literal("safety"),
	v.literal("group"),
	v.literal("document"),
	v.literal("fatigue"),
	v.literal("unknown")
);

const touchTrip = async (ctx: MutationCtx, tripId: Id<"trips">) => {
	await ctx.db.patch(tripId, { updatedAt: Date.now() });
};

const getRequiredRisk = async (
	ctx: MutationCtx,
	riskId: Id<"risks">,
	ownerId: string
) => {
	const risk = await ctx.db.get(riskId);

	if (!risk) {
		throw new ConvexError("RISK_NOT_FOUND");
	}

	await ensureTripAccess(ctx, risk.tripId, ownerId);

	return risk;
};

export const listRisks = query({
	args: {
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);

		return ctx.db
			.query("risks")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.collect();
	},
});

export const dismissRisk = mutation({
	args: {
		riskId: v.id("risks"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const risk = await getRequiredRisk(ctx, args.riskId, identity.subject);
		await ctx.db.patch(args.riskId, {
			status: "dismissed",
		});
		await touchTrip(ctx, risk.tripId);

		return ctx.db.get(args.riskId);
	},
});

export const createRisk = mutation({
	args: {
		tripId: v.id("trips"),
		message: v.string(),
		severity: riskSeverityValidator,
		suggestedAction: v.string(),
		title: v.string(),
		type: riskTypeValidator,
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		const riskId = await ctx.db.insert("risks", {
			aiReason: "Created by the traveler.",
			createdAt: Date.now(),
			message: args.message,
			severity: args.severity,
			status: "open",
			suggestedAction: args.suggestedAction,
			title: args.title,
			tripId: args.tripId,
			type: args.type,
		});
		await touchTrip(ctx, args.tripId);

		return ctx.db.get(riskId);
	},
});

export const updateRisk = mutation({
	args: {
		riskId: v.id("risks"),
		message: v.optional(v.string()),
		relatedEntityId: v.optional(v.string()),
		relatedEntityType: v.optional(v.string()),
		severity: v.optional(riskSeverityValidator),
		status: v.optional(riskStatusValidator),
		suggestedAction: v.optional(v.string()),
		title: v.optional(v.string()),
		type: v.optional(riskTypeValidator),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const risk = await getRequiredRisk(ctx, args.riskId, identity.subject);
		const { riskId, ...patch } = args;
		await ctx.db.patch(riskId, patch);
		await touchTrip(ctx, risk.tripId);

		return ctx.db.get(riskId);
	},
});

export const deleteRisk = mutation({
	args: { riskId: v.id("risks") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const risk = await getRequiredRisk(ctx, args.riskId, identity.subject);
		await ctx.db.delete(args.riskId);
		await touchTrip(ctx, risk.tripId);

		return { deletedRiskId: args.riskId };
	},
});

export const mitigateRisk = mutation({
	args: {
		riskId: v.id("risks"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const risk = await getRequiredRisk(ctx, args.riskId, identity.subject);
		await ctx.db.patch(args.riskId, {
			status: "mitigated",
		});
		await touchTrip(ctx, risk.tripId);

		return ctx.db.get(args.riskId);
	},
});
