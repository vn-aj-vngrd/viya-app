import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";

const ensureOptionalTripAccess = async (
	ctx: Parameters<typeof ensureTripAccess>[0],
	tripId: Id<"trips"> | undefined,
	ownerId: string
) => {
	if (!tripId) {
		return;
	}

	await ensureTripAccess(ctx, tripId, ownerId);
};

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		await getRequiredIdentity(ctx);

		return ctx.storage.generateUploadUrl();
	},
});

export const saveVaultItem = mutation({
	args: {
		storageId: v.id("_storage"),
		tripId: v.optional(v.id("trips")),
		kind: v.union(
			v.literal("booking"),
			v.literal("document"),
			v.literal("momentPhoto"),
			v.literal("receipt"),
			v.literal("noteAttachment"),
			v.literal("other")
		),
		fileName: v.string(),
		mimeType: v.string(),
		fileSize: v.number(),
		title: v.string(),
		note: v.optional(v.string()),
		linkedEntityType: v.optional(v.string()),
		linkedEntityId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureOptionalTripAccess(ctx, args.tripId, identity.subject);

		const now = Date.now();
		const vaultItemId = await ctx.db.insert("vaultItems", {
			ownerId: identity.subject,
			tripId: args.tripId,
			storageId: args.storageId,
			kind: args.kind,
			fileName: args.fileName,
			mimeType: args.mimeType,
			fileSize: args.fileSize,
			title: args.title,
			note: args.note,
			status: "ready",
			linkedEntityType: args.linkedEntityType,
			linkedEntityId: args.linkedEntityId,
			createdAt: now,
			updatedAt: now,
		});

		return { vaultItemId };
	},
});

export const listTripVaultItems = query({
	args: {
		tripId: v.optional(v.id("trips")),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureOptionalTripAccess(ctx, args.tripId, identity.subject);

		const items = args.tripId
			? await ctx.db
					.query("vaultItems")
					.withIndex("by_owner_trip", (q) =>
						q.eq("ownerId", identity.subject).eq("tripId", args.tripId)
					)
					.collect()
			: await ctx.db
					.query("vaultItems")
					.withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
					.collect();

		return Promise.all(
			items.map(async (item) => ({
				...item,
				url: await ctx.storage.getUrl(item.storageId),
			}))
		);
	},
});

export const deleteVaultItem = mutation({
	args: {
		vaultItemId: v.id("vaultItems"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const item = await ctx.db.get(args.vaultItemId);

		if (!item || item.ownerId !== identity.subject) {
			throw new ConvexError("VAULT_ITEM_NOT_FOUND");
		}

		await ctx.storage.delete(item.storageId);
		await ctx.db.delete(args.vaultItemId);

		return { vaultItemId: args.vaultItemId };
	},
});
