// biome-ignore-all lint/style/useFilenamingConvention: Convex module names are public API paths.

import { v } from "convex/values";

import { query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";

export const getTripWorkspace = query({
	args: { tripId: v.id("trips") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const trip = await ensureTripAccess(ctx, args.tripId, identity.subject);
		const [
			bookings,
			documents,
			expenses,
			itineraryDays,
			itineraryItems,
			moments,
			readinessItems,
			risks,
			vaultItems,
		] = await Promise.all([
			ctx.db
				.query("bookings")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("travelDocuments")
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
			ctx.db
				.query("moments")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("readinessItems")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("risks")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("vaultItems")
				.withIndex("by_owner_trip", (q) =>
					q.eq("ownerId", identity.subject).eq("tripId", args.tripId)
				)
				.collect(),
		]);

		return {
			bookings,
			documents,
			expenses,
			itineraryDays,
			itineraryItems,
			moments,
			readinessItems,
			risks,
			trip,
			vaultItems: await Promise.all(
				vaultItems.map(async (item) => ({
					...item,
					url: await ctx.storage.getUrl(item.storageId),
				}))
			),
		};
	},
});
