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
import {
	ensureLinkedTripEntityBelongsToTrip,
	getLinkedTripEntityLinkFields,
	getLinkedTripEntityLinkUpdatePatch,
} from "./lib/tripLinks";

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
	cost: v.optional(v.union(v.number(), v.null())),
	currency: v.optional(v.union(v.string(), v.null())),
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

const receiptExpenseValidator = v.object({
	amount: v.number(),
	category: v.union(
		v.literal("activity"),
		v.literal("food"),
		v.literal("hotel"),
		v.literal("shopping"),
		v.literal("transport"),
		v.literal("documents"),
		v.literal("other")
	),
	currency: v.string(),
	notes: v.optional(v.string()),
	spentAt: v.string(),
	title: v.string(),
});

const toOptional = <T>(value: T | null): T | undefined => value ?? undefined;

interface ExtractedBookingLike {
	endDateTime?: string;
	locationName?: string;
	provider?: string;
	startDateTime?: string;
	title: string;
	type: string;
}

const tokenStopWords = new Set([
	"and",
	"booking",
	"confirmation",
	"day",
	"near",
	"pass",
	"the",
	"ticket",
	"to",
	"trip",
]);

const isoDatePattern = /^\d{4}-\d{2}-\d{2}/;
const isoTimePattern = /T(\d{2}:\d{2})/;
const searchTokenPattern = /[^a-z0-9]+/;

const getIsoDate = (value?: string): string | null => {
	const match = value?.match(isoDatePattern);

	return match?.[0] ?? null;
};

const getIsoTime = (value?: string): string | null => {
	const match = value?.match(isoTimePattern);

	return match?.[1] ?? null;
};

const getSearchTokens = (parts: Array<string | undefined>) =>
	new Set(
		parts
			.join(" ")
			.toLowerCase()
			.split(searchTokenPattern)
			.filter((token) => token.length > 2 && !tokenStopWords.has(token))
	);

const hasDateInBookingWindow = ({
	dayDate,
	endDate,
	startDate,
}: {
	dayDate?: string;
	endDate: string | null;
	startDate: string | null;
}) => {
	if (!(dayDate && startDate)) {
		return false;
	}

	if (!endDate) {
		return dayDate === startDate;
	}

	return dayDate >= startDate && dayDate <= endDate;
};

const getBookingItineraryMatchScore = ({
	booking,
	day,
	item,
}: {
	booking: ExtractedBookingLike;
	day?: Doc<"itineraryDays">;
	item: Doc<"itineraryItems">;
}) => {
	const startDate = getIsoDate(booking.startDateTime);
	const endDate = getIsoDate(booking.endDateTime);
	const startTime = getIsoTime(booking.startDateTime);
	const endTime = getIsoTime(booking.endDateTime);
	let score = item.category === booking.type ? 3 : 0;

	if (
		hasDateInBookingWindow({
			dayDate: day?.date,
			endDate,
			startDate,
		})
	) {
		score += 2;
	}

	if (item.startTime === startTime || item.startTime === endTime) {
		score += 3;
	}

	const bookingTokens = getSearchTokens([
		booking.title,
		booking.provider,
		booking.locationName,
	]);
	const itemTokens = getSearchTokens([
		item.title,
		item.description,
		item.locationName,
		item.address,
	]);
	let overlappingTokenCount = 0;
	for (const token of bookingTokens) {
		if (itemTokens.has(token)) {
			overlappingTokenCount += 1;
		}
	}

	return score + Math.min(overlappingTokenCount, 3);
};

const linkMatchingItineraryItemsToBooking = async ({
	booking,
	bookingId,
	ctx,
	tripId,
}: {
	booking: ExtractedBookingLike;
	bookingId: Id<"bookings">;
	ctx: MutationCtx;
	tripId: Id<"trips">;
}) => {
	const [days, items] = await Promise.all([
		ctx.db
			.query("itineraryDays")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("itineraryItems")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
	]);
	const dayById = new Map(days.map((day) => [day._id, day]));

	for (const item of items) {
		if (item.bookingId) {
			continue;
		}

		const score = getBookingItineraryMatchScore({
			booking,
			day: dayById.get(item.dayId),
			item,
		});

		if (score >= 6) {
			await ctx.db.patch(item._id, { bookingId });
		}
	}
};

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

const touchTrip = async (ctx: MutationCtx, tripId: Id<"trips">) => {
	await ctx.db.patch(tripId, { updatedAt: Date.now() });
};

const clearVaultItemProofReferences = async (
	ctx: MutationCtx,
	tripId: Id<"trips">,
	vaultItemId: Id<"vaultItems">,
	now: number
) => {
	const [bookings, documents, expenses] = await Promise.all([
		ctx.db
			.query("bookings")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("travelDocuments")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("expenses")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
	]);

	for (const booking of bookings) {
		if (booking.vaultItemId === vaultItemId) {
			await ctx.db.patch(booking._id, {
				updatedAt: now,
				vaultItemId: undefined,
			});
		}
	}

	for (const document of documents) {
		if (document.vaultItemId === vaultItemId) {
			await ctx.db.patch(document._id, {
				updatedAt: now,
				vaultItemId: undefined,
			});
		}
	}

	for (const expense of expenses) {
		if (expense.vaultItemId === vaultItemId) {
			await ctx.db.patch(expense._id, {
				updatedAt: now,
				vaultItemId: undefined,
			});
		}
	}
};

const clearVaultItemRelatedEntityReferences = async (
	ctx: MutationCtx,
	tripId: Id<"trips">,
	vaultItemId: Id<"vaultItems">,
	now: number
) => {
	const [notes, risks] = await Promise.all([
		ctx.db
			.query("tripNotes")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("risks")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
	]);

	for (const note of notes) {
		if (
			note.relatedEntityId === vaultItemId &&
			note.relatedEntityType === "vaultItem"
		) {
			await ctx.db.patch(note._id, {
				relatedEntityId: undefined,
				relatedEntityType: undefined,
				updatedAt: now,
			});
		}
	}

	for (const risk of risks) {
		if (
			risk.relatedEntityId === vaultItemId &&
			risk.relatedEntityType === "vaultItem"
		) {
			await ctx.db.patch(risk._id, {
				relatedEntityId: undefined,
				relatedEntityType: undefined,
			});
		}
	}
};

const clearVaultItemLinkedVaultReferences = async (
	ctx: MutationCtx,
	tripId: Id<"trips">,
	vaultItemId: Id<"vaultItems">,
	now: number
) => {
	const vaultItems = await ctx.db
		.query("vaultItems")
		.withIndex("by_trip", (q) => q.eq("tripId", tripId))
		.collect();

	for (const vaultItem of vaultItems) {
		if (
			vaultItem._id !== vaultItemId &&
			vaultItem.linkedEntityId === vaultItemId &&
			vaultItem.linkedEntityType === "vaultItem"
		) {
			await ctx.db.patch(vaultItem._id, {
				linkedEntityId: undefined,
				linkedEntityType: undefined,
				updatedAt: now,
			});
		}
	}
};

const clearDeletedVaultItemReferences = async (
	ctx: MutationCtx,
	tripId: Id<"trips">,
	vaultItemId: Id<"vaultItems">
) => {
	const now = Date.now();
	await clearVaultItemProofReferences(ctx, tripId, vaultItemId, now);
	await clearVaultItemRelatedEntityReferences(ctx, tripId, vaultItemId, now);
	await clearVaultItemLinkedVaultReferences(ctx, tripId, vaultItemId, now);
};

const getRequiredVaultItem = async (
	ctx: MutationCtx,
	vaultItemId: Id<"vaultItems">,
	ownerId: string
) => {
	const item = await ctx.db.get(vaultItemId);

	if (!item || item.ownerId !== ownerId) {
		throw new ConvexError("VAULT_ITEM_NOT_FOUND");
	}

	return item;
};

interface VaultLinkedEntityPatch {
	linkedEntityId: string;
	linkedEntityType: string;
}

interface VaultLinkedEntityReferenceInput {
	linkedEntityId?: string;
	linkedEntityType?: string;
	vaultItemId: Id<"vaultItems">;
}

const hasOwnObjectProperty = <T extends object>(
	value: T,
	key: PropertyKey
): boolean => key in value;

const ensureVaultLinkBelongsToTrip = async ({
	ctx,
	linkedEntityId,
	linkedEntityType,
	tripId,
}: {
	ctx: MutationCtx;
	linkedEntityId?: string;
	linkedEntityType?: string;
	tripId?: Id<"trips">;
}) => {
	if (!(linkedEntityId || linkedEntityType)) {
		return;
	}

	if (!tripId) {
		throw new ConvexError("LINKED_ENTITY_TRIP_MISMATCH");
	}

	await ensureLinkedTripEntityBelongsToTrip({
		ctx,
		linkedEntityId,
		linkedEntityType,
		tripId,
	});
};

const clearVaultLinkedEntityReference = async (
	ctx: MutationCtx,
	{
		linkedEntityId,
		linkedEntityType,
		vaultItemId,
	}: VaultLinkedEntityReferenceInput,
	now: number
) => {
	if (!(linkedEntityId && linkedEntityType)) {
		return;
	}

	if (linkedEntityType === "booking") {
		const bookingId = ctx.db.normalizeId("bookings", linkedEntityId);
		const booking = bookingId ? await ctx.db.get(bookingId) : null;

		if (booking?.vaultItemId === vaultItemId) {
			await ctx.db.patch(booking._id, {
				updatedAt: now,
				vaultItemId: undefined,
			});
		}
	}

	if (linkedEntityType === "travelDocument") {
		const documentId = ctx.db.normalizeId("travelDocuments", linkedEntityId);
		const document = documentId ? await ctx.db.get(documentId) : null;

		if (document?.vaultItemId === vaultItemId) {
			await ctx.db.patch(document._id, {
				updatedAt: now,
				vaultItemId: undefined,
			});
		}
	}

	if (linkedEntityType === "expense") {
		const expenseId = ctx.db.normalizeId("expenses", linkedEntityId);
		const expense = expenseId ? await ctx.db.get(expenseId) : null;

		if (expense?.vaultItemId === vaultItemId) {
			await ctx.db.patch(expense._id, {
				updatedAt: now,
				vaultItemId: undefined,
			});
		}
	}
};

const setVaultLinkedEntityReference = async (
	ctx: MutationCtx,
	{
		linkedEntityId,
		linkedEntityType,
		vaultItemId,
	}: VaultLinkedEntityReferenceInput,
	now: number
) => {
	if (!(linkedEntityId && linkedEntityType)) {
		return;
	}

	if (linkedEntityType === "booking") {
		const bookingId = ctx.db.normalizeId("bookings", linkedEntityId);

		if (bookingId) {
			await ctx.db.patch(bookingId, {
				updatedAt: now,
				vaultItemId,
			});
		}
	}

	if (linkedEntityType === "travelDocument") {
		const documentId = ctx.db.normalizeId("travelDocuments", linkedEntityId);

		if (documentId) {
			await ctx.db.patch(documentId, {
				updatedAt: now,
				vaultItemId,
			});
		}
	}

	if (linkedEntityType === "expense") {
		const expenseId = ctx.db.normalizeId("expenses", linkedEntityId);

		if (expenseId) {
			await ctx.db.patch(expenseId, {
				updatedAt: now,
				vaultItemId,
			});
		}
	}
};

const syncVaultLinkedEntityReferences = async (
	ctx: MutationCtx,
	item: Pick<Doc<"vaultItems">, "linkedEntityId" | "linkedEntityType" | "_id">,
	nextReference: VaultLinkedEntityReferenceInput
) => {
	const now = Date.now();
	const nextLinkedEntityId = nextReference.linkedEntityId || undefined;
	const nextLinkedEntityType = nextReference.linkedEntityType || undefined;
	const hasChanged =
		item.linkedEntityId !== nextLinkedEntityId ||
		item.linkedEntityType !== nextLinkedEntityType;

	if (!hasChanged) {
		return;
	}

	await clearVaultLinkedEntityReference(
		ctx,
		{
			linkedEntityId: item.linkedEntityId,
			linkedEntityType: item.linkedEntityType,
			vaultItemId: item._id,
		},
		now
	);
	await setVaultLinkedEntityReference(
		ctx,
		{
			linkedEntityId: nextLinkedEntityId,
			linkedEntityType: nextLinkedEntityType,
			vaultItemId: nextReference.vaultItemId,
		},
		now
	);
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
		await ensureVaultLinkBelongsToTrip({
			ctx,
			linkedEntityId: args.linkedEntityId,
			linkedEntityType: args.linkedEntityType,
			tripId: args.tripId,
		});

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
			...getLinkedTripEntityLinkFields({
				linkedEntityId: args.linkedEntityId,
				linkedEntityType: args.linkedEntityType,
			}),
			createdAt: now,
			updatedAt: now,
		});
		await setVaultLinkedEntityReference(
			ctx,
			{
				linkedEntityId: args.linkedEntityId,
				linkedEntityType: args.linkedEntityType,
				vaultItemId,
			},
			now
		);

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
				v.literal("receipt"),
				v.literal("other")
			),
			expense: v.optional(receiptExpenseValidator),
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
		let vaultLinkedEntityPatch: VaultLinkedEntityPatch | null = null;

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
				cost: booking.cost ?? undefined,
				currency: toOptional(booking.currency),
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
				await linkMatchingItineraryItemsToBooking({
					booking: bookingPatch,
					bookingId: matchingBooking._id,
					ctx,
					tripId: args.tripId,
				});
				vaultLinkedEntityPatch = {
					linkedEntityId: matchingBooking._id,
					linkedEntityType: "booking",
				};
			} else {
				const bookingId = await ctx.db.insert("bookings", {
					...bookingPatch,
					createdAt: now,
					tripId: args.tripId,
				});
				await linkMatchingItineraryItemsToBooking({
					booking: bookingPatch,
					bookingId,
					ctx,
					tripId: args.tripId,
				});
				vaultLinkedEntityPatch = {
					linkedEntityId: bookingId,
					linkedEntityType: "booking",
				};
			}
		}

		if (args.extraction.expense) {
			const expense = args.extraction.expense;
			const expenseId = await ctx.db.insert("expenses", {
				amount: Math.max(0, expense.amount),
				category: expense.category,
				createdAt: now,
				currency: expense.currency,
				notes: expense.notes,
				source: "tripSync",
				spentAt: expense.spentAt,
				title: expense.title,
				tripId: args.tripId,
				updatedAt: now,
				vaultItemId,
			});

			vaultLinkedEntityPatch ??= {
				linkedEntityId: expenseId,
				linkedEntityType: "expense",
			};
		}

		if (args.kind === "document" || args.extraction.documentType !== "other") {
			const documentId = await ctx.db.insert("travelDocuments", {
				createdAt: now,
				status: "uploaded",
				title: args.extraction.extractedTitle,
				tripId: args.tripId,
				type: args.extraction.documentType,
				updatedAt: now,
				vaultItemId,
			});

			vaultLinkedEntityPatch ??= {
				linkedEntityId: documentId,
				linkedEntityType: "travelDocument",
			};
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

		if (vaultLinkedEntityPatch) {
			await ctx.db.patch(vaultItemId, {
				...vaultLinkedEntityPatch,
				updatedAt: now,
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
		const sortedItems = [...items].sort(
			(firstItem, secondItem) => secondItem.createdAt - firstItem.createdAt
		);

		return Promise.all(
			sortedItems.map(async (item) => ({
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

		if (item.tripId) {
			await clearDeletedVaultItemReferences(ctx, item.tripId, args.vaultItemId);
		}

		await ctx.storage.delete(item.storageId);
		await ctx.db.delete(args.vaultItemId);

		if (item.tripId) {
			await touchTrip(ctx, item.tripId);
		}

		return { vaultItemId: args.vaultItemId };
	},
});

export const updateVaultItem = mutation({
	args: {
		vaultItemId: v.id("vaultItems"),
		kind: v.optional(vaultKindValidator),
		linkedEntityId: v.optional(v.string()),
		linkedEntityType: v.optional(v.string()),
		note: v.optional(v.string()),
		status: v.optional(
			v.union(
				v.literal("uploaded"),
				v.literal("processing"),
				v.literal("ready"),
				v.literal("failed"),
				v.literal("archived")
			)
		),
		title: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const item = await getRequiredVaultItem(
			ctx,
			args.vaultItemId,
			identity.subject
		);
		await ensureVaultLinkBelongsToTrip({
			ctx,
			linkedEntityId: args.linkedEntityId,
			linkedEntityType: args.linkedEntityType,
			tripId: item.tripId,
		});
		const shouldUpdateLink =
			hasOwnObjectProperty(args, "linkedEntityId") ||
			hasOwnObjectProperty(args, "linkedEntityType");
		const { linkedEntityId, linkedEntityType, vaultItemId, ...patch } = args;
		await ctx.db.patch(vaultItemId, {
			...patch,
			...getLinkedTripEntityLinkUpdatePatch({
				linkedEntityId,
				linkedEntityType,
			}),
			updatedAt: Date.now(),
		});
		if (shouldUpdateLink) {
			await syncVaultLinkedEntityReferences(ctx, item, {
				linkedEntityId,
				linkedEntityType,
				vaultItemId,
			});
		}

		if (item.tripId) {
			await touchTrip(ctx, item.tripId);
		}

		return ctx.db.get(vaultItemId);
	},
});

export const linkVaultItem = mutation({
	args: {
		vaultItemId: v.id("vaultItems"),
		linkedEntityId: v.string(),
		linkedEntityType: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const item = await getRequiredVaultItem(
			ctx,
			args.vaultItemId,
			identity.subject
		);
		await ensureVaultLinkBelongsToTrip({
			ctx,
			linkedEntityId: args.linkedEntityId,
			linkedEntityType: args.linkedEntityType,
			tripId: item.tripId,
		});
		await ctx.db.patch(args.vaultItemId, {
			linkedEntityId: args.linkedEntityId,
			linkedEntityType: args.linkedEntityType,
			updatedAt: Date.now(),
		});
		await syncVaultLinkedEntityReferences(ctx, item, {
			linkedEntityId: args.linkedEntityId,
			linkedEntityType: args.linkedEntityType,
			vaultItemId: args.vaultItemId,
		});

		if (item.tripId) {
			await touchTrip(ctx, item.tripId);
		}

		return ctx.db.get(args.vaultItemId);
	},
});
