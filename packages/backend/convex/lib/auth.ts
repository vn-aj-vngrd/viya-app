import { ConvexError } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export const getRequiredIdentity = async (ctx: QueryCtx | MutationCtx) => {
	const identity = await ctx.auth.getUserIdentity();

	if (!identity) {
		throw new ConvexError("AUTH_REQUIRED");
	}

	return identity;
};

export const ensureUserRecord = async (ctx: MutationCtx) => {
	const identity = await getRequiredIdentity(ctx);
	const now = Date.now();
	const existingUser = await ctx.db
		.query("users")
		.withIndex("by_clerk_subject", (q) =>
			q.eq("clerkSubject", identity.subject)
		)
		.unique();

	const email = identity.email ?? undefined;
	const name = identity.name ?? undefined;
	const avatarUrl = identity.pictureUrl ?? undefined;

	if (existingUser) {
		await ctx.db.patch(existingUser._id, {
			avatarUrl,
			email,
			name,
			updatedAt: now,
		});

		return ctx.db.get(existingUser._id);
	}

	const userId = await ctx.db.insert("users", {
		avatarUrl,
		clerkSubject: identity.subject,
		createdAt: now,
		email,
		name,
		updatedAt: now,
	});

	return ctx.db.get(userId);
};

export const ensureTripAccess = async (
	ctx: QueryCtx | MutationCtx,
	tripId: Id<"trips">,
	ownerId: string
) => {
	const trip = await ctx.db.get(tripId);

	if (!trip || trip.ownerId !== ownerId) {
		throw new ConvexError("TRIP_NOT_FOUND");
	}

	return trip;
};
