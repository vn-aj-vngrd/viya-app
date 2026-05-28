import {
	calculateReadinessScore,
	type Priority,
	type ReadinessCategory,
	type ReadinessItem,
	type WorkStatus,
} from "@viya-app/domain";
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
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

const vaultKindValidator = v.union(
	v.literal("booking"),
	v.literal("document"),
	v.literal("momentPhoto"),
	v.literal("receipt"),
	v.literal("noteAttachment"),
	v.literal("other")
);

const readinessCategoryValidator = v.union(
	v.literal("documents"),
	v.literal("bookings"),
	v.literal("packing"),
	v.literal("budget"),
	v.literal("schedule"),
	v.literal("transport"),
	v.literal("weather"),
	v.literal("safety"),
	v.literal("group"),
	v.literal("backupPlan")
);

const priorityValidator = v.union(
	v.literal("low"),
	v.literal("medium"),
	v.literal("high"),
	v.literal("critical")
);

const bookingDraftValidator = v.object({
	confirmationCode: v.union(v.string(), v.null()),
	endDateTime: v.union(v.string(), v.null()),
	locationName: v.union(v.string(), v.null()),
	provider: v.union(v.string(), v.null()),
	startDateTime: v.union(v.string(), v.null()),
	title: v.string(),
	type: v.union(
		v.literal("flight"),
		v.literal("hotel"),
		v.literal("activity"),
		v.literal("transport"),
		v.literal("restaurant"),
		v.literal("insurance"),
		v.literal("other")
	),
});

const toOptional = <T>(value: T | null): T | undefined => value ?? undefined;

const toDomainReadinessItem = (item: Doc<"readinessItems">): ReadinessItem => ({
	aiReason: item.aiReason,
	assignedToMemberId: item.assignedToMemberId ?? null,
	category: item.category as ReadinessCategory,
	description: item.description,
	dueDate: item.dueDate,
	id: item._id,
	priority: item.priority as Priority,
	source: item.source as ReadinessItem["source"],
	status: item.status as WorkStatus,
	title: item.title,
	tripId: item.tripId,
});

const recalculateTripReadiness = async (
	ctx: MutationCtx,
	tripId: Id<"trips">
) => {
	const items = await ctx.db
		.query("readinessItems")
		.withIndex("by_trip", (q) => q.eq("tripId", tripId))
		.collect();
	const readiness = calculateReadinessScore(items.map(toDomainReadinessItem));

	await ctx.db.patch(tripId, {
		readinessScore: readiness.overallScore,
		updatedAt: Date.now(),
	});
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

export const confirmTripSyncReview = mutation({
	args: {
		extraction: v.object({
			booking: v.union(bookingDraftValidator, v.null()),
			confidence: v.number(),
			documentType: v.union(
				v.literal("passport"),
				v.literal("id"),
				v.literal("visa"),
				v.literal("insurance"),
				v.literal("ticket"),
				v.literal("voucher"),
				v.literal("qr"),
				v.literal("permit"),
				v.literal("other")
			),
			extractedTitle: v.string(),
			readinessSuggestions: v.array(
				v.object({
					category: readinessCategoryValidator,
					priority: priorityValidator,
					reason: v.string(),
					title: v.string(),
				})
			),
			summary: v.string(),
		}),
		fileName: v.string(),
		fileSize: v.number(),
		kind: vaultKindValidator,
		mimeType: v.string(),
		storageId: v.id("_storage"),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const trip = await ensureTripAccess(ctx, args.tripId, identity.subject);
		const now = Date.now();
		const vaultItemId = await ctx.db.insert("vaultItems", {
			createdAt: now,
			extractedSummary: args.extraction.summary,
			fileName: args.fileName,
			fileSize: args.fileSize,
			kind: args.kind,
			mimeType: args.mimeType,
			ownerId: identity.subject,
			status: "ready",
			storageId: args.storageId,
			title: args.extraction.extractedTitle,
			tripId: args.tripId,
			updatedAt: now,
		});

		if (args.extraction.booking) {
			const booking = args.extraction.booking;
			const existingBookings = await ctx.db
				.query("bookings")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect();
			const matchingBooking = existingBookings.find(
				(item) =>
					booking.confirmationCode &&
					item.confirmationCode === booking.confirmationCode
			);
			const bookingPatch = {
				confirmationCode: toOptional(booking.confirmationCode),
				endDateTime: toOptional(booking.endDateTime),
				extractedFrom: "tripSync",
				locationName: toOptional(booking.locationName),
				provider: toOptional(booking.provider),
				startDateTime: toOptional(booking.startDateTime),
				status: "confirmed",
				title: booking.title,
				type: booking.type,
				updatedAt: now,
				vaultItemId,
			};

			if (matchingBooking) {
				await ctx.db.patch(matchingBooking._id, bookingPatch);
			} else {
				await ctx.db.insert("bookings", {
					...bookingPatch,
					createdAt: now,
					tripId: args.tripId,
				});
			}
		}

		if (args.kind === "document" || args.extraction.documentType !== "other") {
			await ctx.db.insert("travelDocuments", {
				createdAt: now,
				status: "uploaded",
				title: args.extraction.extractedTitle,
				tripId: args.tripId,
				type: args.extraction.documentType,
				updatedAt: now,
				vaultItemId,
			});
		}

		const existingReadinessItems = await ctx.db
			.query("readinessItems")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.collect();
		const existingTitles = new Set(
			existingReadinessItems.map((item) => item.title.toLowerCase())
		);

		for (const suggestion of args.extraction.readinessSuggestions) {
			if (existingTitles.has(suggestion.title.toLowerCase())) {
				continue;
			}

			await ctx.db.insert("readinessItems", {
				aiReason: suggestion.reason,
				category: suggestion.category,
				description: suggestion.reason,
				dueDate: trip.startDate,
				priority: suggestion.priority,
				source: "ai",
				status: "todo",
				title: suggestion.title,
				tripId: args.tripId,
			});
		}

		await recalculateTripReadiness(ctx, args.tripId);

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
