import { mutation, query } from "./_generated/server";
import { ensureUserRecord, getRequiredIdentity } from "./lib/auth";

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		const identity = await getRequiredIdentity(ctx);

		return ctx.db
			.query("users")
			.withIndex("by_clerk_subject", (q) =>
				q.eq("clerkSubject", identity.subject)
			)
			.unique();
	},
});

export const ensureCurrentUser = mutation({
	args: {},
	handler: async (ctx) => ensureUserRecord(ctx),
});
