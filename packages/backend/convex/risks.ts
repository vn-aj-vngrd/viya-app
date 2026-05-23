import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";

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
		const risk = await ctx.db.get(args.riskId);

		if (!risk) {
			throw new ConvexError("RISK_NOT_FOUND");
		}

		await ensureTripAccess(ctx, risk.tripId, identity.subject);
		await ctx.db.patch(args.riskId, {
			status: "dismissed",
		});

		return ctx.db.get(args.riskId);
	},
});

export const mitigateRisk = mutation({
	args: {
		riskId: v.id("risks"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const risk = await ctx.db.get(args.riskId);

		if (!risk) {
			throw new ConvexError("RISK_NOT_FOUND");
		}

		await ensureTripAccess(ctx, risk.tripId, identity.subject);
		await ctx.db.patch(args.riskId, {
			status: "mitigated",
		});

		return ctx.db.get(args.riskId);
	},
});
