import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";

export const listTripBookings = query({
	args: { tripId: v.id("trips") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);

		return ctx.db
			.query("bookings")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.collect();
	},
});

export const updateBookingStatus = mutation({
	args: {
		bookingId: v.id("bookings"),
		status: v.union(
			v.literal("target"),
			v.literal("bookedExternally"),
			v.literal("confirmed"),
			v.literal("missing"),
			v.literal("cancelled")
		),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const booking = await ctx.db.get(args.bookingId);

		if (!booking) {
			throw new ConvexError("BOOKING_NOT_FOUND");
		}

		await ensureTripAccess(ctx, booking.tripId, identity.subject);
		await ctx.db.patch(args.bookingId, {
			status: args.status,
			updatedAt: Date.now(),
		});

		return ctx.db.get(args.bookingId);
	},
});
