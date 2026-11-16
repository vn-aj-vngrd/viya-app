import { cleanText, getBookingInputError } from "@viya-app/domain";
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

const nullableString = v.optional(v.union(v.string(), v.null()));
const nullableNumber = v.optional(v.union(v.number(), v.null()));

/** Blank or null means "clear this field". */
const toOptionalText = (value: string | null | undefined) =>
	value === null || value === undefined ? undefined : value.trim() || undefined;

const ensureValidBookingInput = (
	input: Parameters<typeof getBookingInputError>[0]
) => {
	const error = getBookingInputError(input);

	if (error) {
		throw new ConvexError(error);
	}
};

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
		ensureValidBookingInput(args);
		const now = Date.now();
		const bookingId = await ctx.db.insert("bookings", {
			...args,
			address: toOptionalText(args.address),
			confirmationCode: toOptionalText(args.confirmationCode),
			externalUrl: toOptionalText(args.externalUrl),
			locationName: toOptionalText(args.locationName),
			notes: toOptionalText(args.notes),
			provider: toOptionalText(args.provider),
			title: cleanText(args.title),
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
		/** For optional fields, null clears the stored value. */
		address: nullableString,
		confirmationCode: nullableString,
		cost: nullableNumber,
		currency: nullableString,
		endDateTime: nullableString,
		externalUrl: nullableString,
		locationName: nullableString,
		notes: nullableString,
		provider: nullableString,
		providerCategory: nullableString,
		startDateTime: nullableString,
		status: v.optional(bookingStatusValidator),
		title: v.optional(v.string()),
		type: v.optional(bookingTypeValidator),
		vaultItemId: v.optional(v.union(v.id("vaultItems"), v.null())),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const booking = await getRequiredBooking(
			ctx,
			args.bookingId,
			identity.subject
		);
		const { bookingId, vaultItemId, title, status, type, ...rest } = args;
		const shouldUpdateVaultItem = vaultItemId !== undefined;
		const nextVaultItemId = vaultItemId ?? undefined;

		if (shouldUpdateVaultItem) {
			await ensureVaultItemBelongsToTrip(ctx, nextVaultItemId, booking.tripId);
		}

		ensureValidBookingInput({
			cost: "cost" in args ? args.cost : booking.cost,
			endDateTime:
				"endDateTime" in args ? args.endDateTime : booking.endDateTime,
			externalUrl: args.externalUrl,
			startDateTime:
				"startDateTime" in args ? args.startDateTime : booking.startDateTime,
			title,
		});

		const patch: Record<string, unknown> = { updatedAt: Date.now() };

		for (const [key, value] of Object.entries(rest)) {
			if (value === undefined) {
				continue;
			}

			// null clears the field; Convex removes a field patched with undefined.
			patch[key] =
				typeof value === "string"
					? toOptionalText(value)
					: (value ?? undefined);
		}

		if (title !== undefined) {
			patch.title = cleanText(title);
		}

		if (status !== undefined) {
			patch.status = status;
		}

		if (type !== undefined) {
			patch.type = type;
		}

		if (shouldUpdateVaultItem) {
			patch.vaultItemId = nextVaultItemId;
		}

		await ctx.db.patch(bookingId, patch);

		if (shouldUpdateVaultItem) {
			await syncBookingVaultLink(
				ctx,
				booking.vaultItemId,
				nextVaultItemId,
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
