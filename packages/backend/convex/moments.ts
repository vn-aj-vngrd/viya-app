import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";
import { clearDeletedTripEntityReferences } from "./lib/tripLinks";

const touchTrip = async (ctx: MutationCtx, tripId: Id<"trips">) => {
	await ctx.db.patch(tripId, { updatedAt: Date.now() });
};

const ensureDayBelongsToTrip = async (
	ctx: MutationCtx,
	dayId: string | undefined,
	tripId: Id<"trips">
) => {
	if (!dayId) {
		return;
	}

	const normalizedDayId = ctx.db.normalizeId("itineraryDays", dayId);
	const day = normalizedDayId ? await ctx.db.get(normalizedDayId) : null;

	if (!day || day.tripId !== tripId) {
		throw new ConvexError("ITINERARY_DAY_TRIP_MISMATCH");
	}
};

const getRequiredMoment = async (
	ctx: MutationCtx,
	momentId: Id<"moments">,
	ownerId: string
) => {
	const moment = await ctx.db.get(momentId);

	if (!moment) {
		throw new ConvexError("MOMENT_NOT_FOUND");
	}

	await ensureTripAccess(ctx, moment.tripId, ownerId);

	return moment;
};

export const listTripMoments = query({
	args: { tripId: v.id("trips") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		const moments = await ctx.db
			.query("moments")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.collect();

		return [...moments].sort(
			(firstMoment, secondMoment) =>
				secondMoment.createdAt - firstMoment.createdAt
		);
	},
});

export const createMoment = mutation({
	args: {
		caption: v.string(),
		dayId: v.optional(v.string()),
		isHighlight: v.optional(v.boolean()),
		locationName: v.string(),
		note: v.string(),
		photoUrl: v.optional(v.string()),
		title: v.string(),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		await ensureDayBelongsToTrip(ctx, args.dayId, args.tripId);
		const momentId = await ctx.db.insert("moments", {
			...args,
			createdAt: Date.now(),
			isHighlight: args.isHighlight ?? false,
		});
		await touchTrip(ctx, args.tripId);

		return ctx.db.get(momentId);
	},
});

export const updateMoment = mutation({
	args: {
		momentId: v.id("moments"),
		caption: v.optional(v.string()),
		dayId: v.optional(v.string()),
		isHighlight: v.optional(v.boolean()),
		locationName: v.optional(v.string()),
		note: v.optional(v.string()),
		photoUrl: v.optional(v.string()),
		title: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const moment = await getRequiredMoment(
			ctx,
			args.momentId,
			identity.subject
		);
		await ensureDayBelongsToTrip(ctx, args.dayId, moment.tripId);
		const { momentId, ...patch } = args;
		await ctx.db.patch(momentId, patch);
		await touchTrip(ctx, moment.tripId);

		return ctx.db.get(momentId);
	},
});

export const toggleMomentHighlight = mutation({
	args: {
		isHighlight: v.optional(v.boolean()),
		momentId: v.id("moments"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const moment = await getRequiredMoment(
			ctx,
			args.momentId,
			identity.subject
		);
		const isHighlight = args.isHighlight ?? !moment.isHighlight;
		await ctx.db.patch(args.momentId, { isHighlight });
		await touchTrip(ctx, moment.tripId);

		return ctx.db.get(args.momentId);
	},
});

export const deleteMoment = mutation({
	args: { momentId: v.id("moments") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const moment = await getRequiredMoment(
			ctx,
			args.momentId,
			identity.subject
		);
		await clearDeletedTripEntityReferences({
			ctx,
			linkedEntityId: args.momentId,
			linkedEntityType: "moment",
			tripId: moment.tripId,
		});
		await ctx.db.delete(args.momentId);
		await touchTrip(ctx, moment.tripId);

		return { deletedMomentId: args.momentId };
	},
});
