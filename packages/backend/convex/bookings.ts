import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";
import { clearDeletedTripEntityReferences } from "./lib/tripLinks";

const bookingTypeValidator = v.union(
	v.literal("flight"),
	v.literal("hotel"),
	v.literal("activity"),
	v.literal("transport"),
	v.literal("restaurant"),
	v.literal("insurance"),
	v.literal("other")
);

const bookingStatusValidator = v.union(
	v.literal("target"),
	v.literal("bookedExternally"),
	v.literal("confirmed"),
	v.literal("missing"),
	v.literal("cancelled")
);

const touchTrip = async (ctx: MutationCtx, tripId: Id<"trips">) => {
	await ctx.db.patch(tripId, { updatedAt: Date.now() });
};

const getRequiredBooking = async (
	ctx: MutationCtx,
	bookingId: Id<"bookings">,
	ownerId: string
) => {
	const booking = await ctx.db.get(bookingId);

	if (!booking) {
		throw new ConvexError("BOOKING_NOT_FOUND");
	}

	await ensureTripAccess(ctx, booking.tripId, ownerId);

	return booking;
};

const ensureVaultItemBelongsToTrip = async (
	ctx: MutationCtx,
	vaultItemId: Id<"vaultItems"> | undefined,
	tripId: Id<"trips">
) => {
	if (!vaultItemId) {
		return;
	}

	const vaultItem = await ctx.db.get(vaultItemId);

	if (!vaultItem || vaultItem.tripId !== tripId) {
		throw new ConvexError("VAULT_ITEM_TRIP_MISMATCH");
	}
};

const hasOwnObjectProperty = <T extends object>(
	value: T,
	key: PropertyKey
): boolean => key in value;

const syncBookingVaultLink = async (
	ctx: MutationCtx,
	previousVaultItemId: Id<"vaultItems"> | undefined,
	nextVaultItemId: Id<"vaultItems"> | undefined,
	bookingId: Id<"bookings">
) => {
	const now = Date.now();

	if (previousVaultItemId && previousVaultItemId !== nextVaultItemId) {
		const previousVaultItem = await ctx.db.get(previousVaultItemId);

		if (
			previousVaultItem?.linkedEntityId === bookingId &&
			previousVaultItem.linkedEntityType === "booking"
		) {
			await ctx.db.patch(previousVaultItemId, {
				linkedEntityId: undefined,
				linkedEntityType: undefined,
				updatedAt: now,
			});
		}
	}

	if (nextVaultItemId) {
		await ctx.db.patch(nextVaultItemId, {
			linkedEntityId: bookingId,
			linkedEntityType: "booking",
			updatedAt: now,
		});
	}
};

const clearDeletedBookingReferences = async (
	ctx: MutationCtx,
	bookingId: Id<"bookings">,
	tripId: Id<"trips">
) => {
	const now = Date.now();
	const [expenses, itineraryItems] = await Promise.all([
		ctx.db
			.query("expenses")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("itineraryItems")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
	]);

	for (const expense of expenses) {
		if (expense.bookingId === bookingId) {
			await ctx.db.patch(expense._id, {
				bookingId: undefined,
				updatedAt: now,
			});
		}
	}

	for (const item of itineraryItems) {
		if (item.bookingId === bookingId) {
			await ctx.db.patch(item._id, {
				bookingId: undefined,
			});
		}
	}

	await clearDeletedTripEntityReferences({
		ctx,
		linkedEntityId: bookingId,
		linkedEntityType: "booking",
		now,
		tripId,
	});
};

export const listTripBookings = query({
	args: { tripId: v.id("trips") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);

		const bookings = await ctx.db
			.query("bookings")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.collect();
		const sortedBookings = [...bookings].sort((firstBooking, secondBooking) =>
			`${firstBooking.startDateTime ?? ""}-${firstBooking.title}`.localeCompare(
				`${secondBooking.startDateTime ?? ""}-${secondBooking.title}`
			)
		);

		return sortedBookings;
	},
});

export const updateBookingStatus = mutation({
	args: {
		bookingId: v.id("bookings"),
		status: bookingStatusValidator,
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const booking = await getRequiredBooking(
			ctx,
			args.bookingId,
			identity.subject
		);
		await ctx.db.patch(args.bookingId, {
			status: args.status,
			updatedAt: Date.now(),
		});
		await touchTrip(ctx, booking.tripId);

		return ctx.db.get(args.bookingId);
	},
});

export const createBookingTarget = mutation({
	args: {
		tripId: v.id("trips"),
		address: v.optional(v.string()),
		confirmationCode: v.optional(v.string()),
		cost: v.optional(v.number()),
		currency: v.optional(v.string()),
		endDateTime: v.optional(v.string()),
		externalUrl: v.optional(v.string()),
		locationName: v.optional(v.string()),
		notes: v.optional(v.string()),
		provider: v.optional(v.string()),
		providerCategory: v.optional(v.string()),
		startDateTime: v.optional(v.string()),
		status: v.optional(bookingStatusValidator),
		title: v.string(),
		type: bookingTypeValidator,
		vaultItemId: v.optional(v.id("vaultItems")),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		await ensureVaultItemBelongsToTrip(ctx, args.vaultItemId, args.tripId);
		const now = Date.now();
		const bookingId = await ctx.db.insert("bookings", {
			...args,
			createdAt: now,
			status: args.status ?? "target",
			updatedAt: now,
		});
		await syncBookingVaultLink(ctx, undefined, args.vaultItemId, bookingId);
		await touchTrip(ctx, args.tripId);

		return ctx.db.get(bookingId);
	},
});

export const updateBooking = mutation({
	args: {
		bookingId: v.id("bookings"),
		address: v.optional(v.string()),
		confirmationCode: v.optional(v.string()),
		cost: v.optional(v.number()),
		currency: v.optional(v.string()),
		endDateTime: v.optional(v.string()),
		externalUrl: v.optional(v.string()),
		locationName: v.optional(v.string()),
		notes: v.optional(v.string()),
		provider: v.optional(v.string()),
		providerCategory: v.optional(v.string()),
		startDateTime: v.optional(v.string()),
		status: v.optional(bookingStatusValidator),
		title: v.optional(v.string()),
		type: v.optional(bookingTypeValidator),
		vaultItemId: v.optional(v.id("vaultItems")),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const booking = await getRequiredBooking(
			ctx,
			args.bookingId,
			identity.subject
		);
		const shouldUpdateVaultItem = hasOwnObjectProperty(args, "vaultItemId");
		if (shouldUpdateVaultItem) {
			await ensureVaultItemBelongsToTrip(ctx, args.vaultItemId, booking.tripId);
		}
		const { bookingId, vaultItemId, ...patch } = args;
		await ctx.db.patch(bookingId, {
			...patch,
			...(shouldUpdateVaultItem ? { vaultItemId } : {}),
			updatedAt: Date.now(),
		});
		if (shouldUpdateVaultItem) {
			await syncBookingVaultLink(
				ctx,
				booking.vaultItemId,
				vaultItemId,
				bookingId
			);
		}
		await touchTrip(ctx, booking.tripId);

		return ctx.db.get(bookingId);
	},
});

export const linkBookingVaultItem = mutation({
	args: {
		bookingId: v.id("bookings"),
		vaultItemId: v.id("vaultItems"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const booking = await getRequiredBooking(
			ctx,
			args.bookingId,
			identity.subject
		);
		await ensureVaultItemBelongsToTrip(ctx, args.vaultItemId, booking.tripId);
		await ctx.db.patch(args.bookingId, {
			updatedAt: Date.now(),
			vaultItemId: args.vaultItemId,
		});
		await syncBookingVaultLink(
			ctx,
			booking.vaultItemId,
			args.vaultItemId,
			args.bookingId
		);
		await touchTrip(ctx, booking.tripId);

		return ctx.db.get(args.bookingId);
	},
});

export const deleteBooking = mutation({
	args: { bookingId: v.id("bookings") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const booking = await getRequiredBooking(
			ctx,
			args.bookingId,
			identity.subject
		);
		await clearDeletedBookingReferences(ctx, args.bookingId, booking.tripId);
		await ctx.db.delete(args.bookingId);
		await touchTrip(ctx, booking.tripId);

		return { deletedBookingId: args.bookingId };
	},
});
