import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { ensureUserRecord, getRequiredIdentity } from "./lib/auth";

const travelStyleValidator = v.union(
	v.literal("relaxed"),
	v.literal("balanced"),
	v.literal("packed"),
	v.literal("adventure"),
	v.literal("luxury"),
	v.literal("budget")
);

const pacePreferenceValidator = v.union(
	v.literal("slow"),
	v.literal("moderate"),
	v.literal("fast")
);

const budgetPreferenceValidator = v.union(
	v.literal("budget"),
	v.literal("midRange"),
	v.literal("premium")
);

const travelInterestValidator = v.union(
	v.literal("nature"),
	v.literal("food"),
	v.literal("culture"),
	v.literal("shopping"),
	v.literal("nightlife"),
	v.literal("wellness"),
	v.literal("beaches"),
	v.literal("hiddenGems")
);

const foodPreferenceValidator = v.union(
	v.literal("localEats"),
	v.literal("popularSpots"),
	v.literal("dietaryAware"),
	v.literal("flexible"),
	v.literal("lowPriority")
);

const groupPreferenceValidator = v.union(
	v.literal("solo"),
	v.literal("couple"),
	v.literal("family"),
	v.literal("friends"),
	v.literal("work"),
	v.literal("varies")
);

const planningStyleValidator = v.union(
	v.literal("decideForMe"),
	v.literal("giveOptions"),
	v.literal("flagRisks")
);

const specialNeedValidator = v.union(
	v.literal("accessibility"),
	v.literal("dietaryRestrictions"),
	v.literal("earlyStarts"),
	v.literal("restBreaks"),
	v.literal("none")
);

export const getCurrentPreferences = query({
	args: {},
	handler: async (ctx) => {
		const identity = await getRequiredIdentity(ctx);

		return await ctx.db
			.query("userPreferences")
			.withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
			.unique();
	},
});

export const upsertCurrentPreferences = mutation({
	args: {
		budgetPreference: budgetPreferenceValidator,
		foodPreference: foodPreferenceValidator,
		groupPreference: groupPreferenceValidator,
		interests: v.array(travelInterestValidator),
		pacePreference: pacePreferenceValidator,
		planningStyle: planningStyleValidator,
		specialNeeds: v.array(specialNeedValidator),
		specialNeedsNote: v.optional(v.string()),
		travelStyle: travelStyleValidator,
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureUserRecord(ctx);

		const now = Date.now();
		const existingPreferences = await ctx.db
			.query("userPreferences")
			.withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
			.unique();

		const preferences = {
			...args,
			ownerId: identity.subject,
			specialNeedsNote: args.specialNeedsNote?.trim() || undefined,
			updatedAt: now,
		};

		if (existingPreferences) {
			await ctx.db.patch(existingPreferences._id, preferences);
			return existingPreferences._id;
		}

		return await ctx.db.insert("userPreferences", {
			...preferences,
			createdAt: now,
			onboardingCompletedAt: now,
		});
	},
});
