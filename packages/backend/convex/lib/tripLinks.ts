// biome-ignore-all lint/style/useFilenamingConvention: Convex module paths cannot contain hyphens.
import { ConvexError } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

interface LinkedTripEntityInput {
	ctx: MutationCtx;
	linkedEntityId?: string;
	linkedEntityType?: string;
	tripId: Id<"trips">;
}

interface LinkedTripEntityFieldsInput {
	linkedEntityId?: string;
	linkedEntityType?: string;
}

interface RelatedEntityFields {
	relatedEntityId?: string;
	relatedEntityType?: string;
}

interface RelatedEntityClearPatch {
	relatedEntityId: undefined;
	relatedEntityType: undefined;
}

interface LinkedEntityFields {
	linkedEntityId?: string;
	linkedEntityType?: string;
}

interface LinkedEntityClearPatch {
	linkedEntityId: undefined;
	linkedEntityType: undefined;
}

interface ClearDeletedTripEntityReferencesInput {
	ctx: MutationCtx;
	linkedEntityId: string;
	linkedEntityType: string;
	now?: number;
	tripId: Id<"trips">;
}

type LinkedTripResolver = (
	ctx: MutationCtx,
	linkedEntityId: string
) => Promise<Id<"trips"> | null>;

const getItineraryDayTripId: LinkedTripResolver = async (
	ctx,
	linkedEntityId
) => {
	const id = ctx.db.normalizeId("itineraryDays", linkedEntityId);
	const item = id ? await ctx.db.get(id) : null;

	return item?.tripId ?? null;
};

const getItineraryItemTripId: LinkedTripResolver = async (
	ctx,
	linkedEntityId
) => {
	const id = ctx.db.normalizeId("itineraryItems", linkedEntityId);
	const item = id ? await ctx.db.get(id) : null;

	return item?.tripId ?? null;
};

const getBookingTripId: LinkedTripResolver = async (ctx, linkedEntityId) => {
	const id = ctx.db.normalizeId("bookings", linkedEntityId);
	const item = id ? await ctx.db.get(id) : null;

	return item?.tripId ?? null;
};

const getTravelDocumentTripId: LinkedTripResolver = async (
	ctx,
	linkedEntityId
) => {
	const id = ctx.db.normalizeId("travelDocuments", linkedEntityId);
	const item = id ? await ctx.db.get(id) : null;

	return item?.tripId ?? null;
};

const getCompanionTripId: LinkedTripResolver = async (ctx, linkedEntityId) => {
	const id = ctx.db.normalizeId("tripCompanions", linkedEntityId);
	const item = id ? await ctx.db.get(id) : null;

	return item?.tripId ?? null;
};

const getReadinessItemTripId: LinkedTripResolver = async (
	ctx,
	linkedEntityId
) => {
	const id = ctx.db.normalizeId("readinessItems", linkedEntityId);
	const item = id ? await ctx.db.get(id) : null;

	return item?.tripId ?? null;
};

const getSavedPlaceTripId: LinkedTripResolver = async (ctx, linkedEntityId) => {
	const id = ctx.db.normalizeId("savedPlaces", linkedEntityId);
	const item = id ? await ctx.db.get(id) : null;

	return item?.tripId ?? null;
};

const getVaultItemTripId: LinkedTripResolver = async (ctx, linkedEntityId) => {
	const id = ctx.db.normalizeId("vaultItems", linkedEntityId);
	const item = id ? await ctx.db.get(id) : null;

	return item?.tripId ?? null;
};

const getExpenseTripId: LinkedTripResolver = async (ctx, linkedEntityId) => {
	const id = ctx.db.normalizeId("expenses", linkedEntityId);
	const item = id ? await ctx.db.get(id) : null;

	return item?.tripId ?? null;
};

const getMomentTripId: LinkedTripResolver = async (ctx, linkedEntityId) => {
	const id = ctx.db.normalizeId("moments", linkedEntityId);
	const item = id ? await ctx.db.get(id) : null;

	return item?.tripId ?? null;
};

const getTripNoteTripId: LinkedTripResolver = async (ctx, linkedEntityId) => {
	const id = ctx.db.normalizeId("tripNotes", linkedEntityId);
	const item = id ? await ctx.db.get(id) : null;

	return item?.tripId ?? null;
};

const getRiskTripId: LinkedTripResolver = async (ctx, linkedEntityId) => {
	const id = ctx.db.normalizeId("risks", linkedEntityId);
	const item = id ? await ctx.db.get(id) : null;

	return item?.tripId ?? null;
};

const linkedTripResolvers: Record<string, LinkedTripResolver> = {
	booking: getBookingTripId,
	companion: getCompanionTripId,
	expense: getExpenseTripId,
	itineraryDay: getItineraryDayTripId,
	itineraryItem: getItineraryItemTripId,
	moment: getMomentTripId,
	readinessItem: getReadinessItemTripId,
	risk: getRiskTripId,
	savedPlace: getSavedPlaceTripId,
	tripNote: getTripNoteTripId,
	travelDocument: getTravelDocumentTripId,
	vaultItem: getVaultItemTripId,
};

export const ensureLinkedTripEntityBelongsToTrip = async ({
	ctx,
	linkedEntityId,
	linkedEntityType,
	tripId,
}: LinkedTripEntityInput) => {
	if (!(linkedEntityId || linkedEntityType)) {
		return;
	}

	if (!(linkedEntityId && linkedEntityType)) {
		throw new ConvexError("LINKED_ENTITY_INCOMPLETE");
	}

	const resolveTripId = linkedTripResolvers[linkedEntityType];

	if (!resolveTripId) {
		throw new ConvexError("LINKED_ENTITY_UNSUPPORTED");
	}

	const linkedTripId = await resolveTripId(ctx, linkedEntityId);

	if (linkedTripId !== tripId) {
		throw new ConvexError("LINKED_ENTITY_TRIP_MISMATCH");
	}
};

export const getLinkedTripEntityFields = ({
	linkedEntityId,
	linkedEntityType,
}: LinkedTripEntityFieldsInput): RelatedEntityFields => {
	if (!(linkedEntityId && linkedEntityType)) {
		return {};
	}

	return {
		relatedEntityId: linkedEntityId,
		relatedEntityType: linkedEntityType,
	};
};

export const getLinkedTripEntityLinkFields = ({
	linkedEntityId,
	linkedEntityType,
}: LinkedTripEntityFieldsInput): LinkedEntityFields => {
	if (!(linkedEntityId && linkedEntityType)) {
		return {};
	}

	return { linkedEntityId, linkedEntityType };
};

export const getLinkedTripEntityUpdatePatch = ({
	linkedEntityId,
	linkedEntityType,
}: LinkedTripEntityFieldsInput):
	| RelatedEntityFields
	| RelatedEntityClearPatch => {
	if (linkedEntityId === undefined && linkedEntityType === undefined) {
		return {};
	}

	if (!(linkedEntityId || linkedEntityType)) {
		return {
			relatedEntityId: undefined,
			relatedEntityType: undefined,
		};
	}

	return getLinkedTripEntityFields({ linkedEntityId, linkedEntityType });
};

export const getLinkedTripEntityLinkUpdatePatch = ({
	linkedEntityId,
	linkedEntityType,
}: LinkedTripEntityFieldsInput):
	| LinkedEntityFields
	| LinkedEntityClearPatch => {
	if (linkedEntityId === undefined && linkedEntityType === undefined) {
		return {};
	}

	if (!(linkedEntityId || linkedEntityType)) {
		return {
			linkedEntityId: undefined,
			linkedEntityType: undefined,
		};
	}

	return { linkedEntityId, linkedEntityType };
};

export const clearDeletedTripEntityReferences = async ({
	ctx,
	linkedEntityId,
	linkedEntityType,
	now = Date.now(),
	tripId,
}: ClearDeletedTripEntityReferencesInput) => {
	const [notes, risks, vaultItems] = await Promise.all([
		ctx.db
			.query("tripNotes")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("risks")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("vaultItems")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
	]);

	for (const note of notes) {
		if (
			note.relatedEntityId === linkedEntityId &&
			note.relatedEntityType === linkedEntityType
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
			risk.relatedEntityId === linkedEntityId &&
			risk.relatedEntityType === linkedEntityType
		) {
			await ctx.db.patch(risk._id, {
				relatedEntityId: undefined,
				relatedEntityType: undefined,
			});
		}
	}

	for (const vaultItem of vaultItems) {
		if (
			vaultItem.linkedEntityId === linkedEntityId &&
			vaultItem.linkedEntityType === linkedEntityType
		) {
			await ctx.db.patch(vaultItem._id, {
				linkedEntityId: undefined,
				linkedEntityType: undefined,
				updatedAt: now,
			});
		}
	}
};
