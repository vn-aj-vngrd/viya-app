import {
	addDaysToKey,
	cleanText,
	type EffectiveTripStatus,
	getBlueprintBookingType,
	getBlueprintGroupType,
	getBlueprintPace,
	getBlueprintReadinessCategory,
	getBlueprintRiskSeverity,
	getBlueprintRiskType,
	getBlueprintTravelStyle,
	getEffectiveTripStatus,
	getReadinessProgress,
	getTripDayCount,
	getTripTodayKey,
	resolveBlueprintDateRange,
	type TripStatus,
} from "@viya-app/domain";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
	ensureTripAccess,
	ensureUserRecord,
	getRequiredIdentity,
} from "./lib/auth";
import { syncItineraryDaysToTripRange } from "./lib/trip-days";
import { clearDeletedTripEntityReferences } from "./lib/tripLinks";
import {
	seedBaselineReadinessItems,
	updateTripReadinessScore,
} from "./readiness";

const maxBlueprintItems = 8;
const maxTripsPageSize = 24;
const NEEDS_READINESS_BELOW = 90;
const PLACEHOLDER_TRIP_NOTE = "Dates are placeholders until you set them.";
const pesoAmountPattern = /(?:₱|PHP\s*)\s?([0-9][0-9,]*)/i;
const whitespacePattern = /\s+/g;
const expenseCategoryValidator = v.union(
	v.literal("activity"),
	v.literal("food"),
	v.literal("hotel"),
	v.literal("shopping"),
	v.literal("transport"),
	v.literal("documents"),
	v.literal("other")
);
const tripLifecycleValidator = v.union(
	v.literal("planning"),
	v.literal("traveling"),
	v.literal("completed"),
	v.literal("archived")
);

const blueprintItemsValidator = v.array(v.string());

const getLimitedItems = (items: string[]) =>
	items
		.map((item) => item.replace(whitespacePattern, " ").trim())
		.filter(Boolean)
		.slice(0, maxBlueprintItems);

const joinItems = (items: string[], fallback: string) => {
	const limitedItems = getLimitedItems(items);

	return limitedItems.length > 0 ? limitedItems.join("; ") : fallback;
};

const normalizeSearchText = (value: string) =>
	value.replace(whitespacePattern, " ").trim().toLowerCase();

const assertValidDateRange = (startDate: string, endDate: string) => {
	if (startDate && endDate && startDate > endDate) {
		throw new ConvexError("INVALID_TRIP_DATE_RANGE");
	}
};

const assertRealDateRange = (startDate: string, endDate: string) => {
	if (getTripDayCount(startDate, endDate) === null || startDate > endDate) {
		throw new ConvexError("INVALID_TRIP_DATE_RANGE");
	}
};

const assertValidTravelerCount = (count: number | undefined) => {
	if (count !== undefined && !(Number.isInteger(count) && count >= 1)) {
		throw new ConvexError("INVALID_TRAVELER_COUNT");
	}
};

const assertValidBudget = (amount: number | undefined) => {
	if (amount !== undefined && !(Number.isFinite(amount) && amount >= 0)) {
		throw new ConvexError("INVALID_TRIP_BUDGET");
	}
};

type TripSearchStatusFilter = `status:${TripStatus}`;

const getTripStatusFilter = (status: TripStatus): TripSearchStatusFilter =>
	`status:${status}`;

const withReadinessSnapshot = async (
	ctx: QueryCtx,
	trip: Doc<"trips">,
	todayKey: string
) => {
	const readinessItems = await ctx.db
		.query("readinessItems")
		.withIndex("by_trip", (q) => q.eq("tripId", trip._id))
		.collect();
	const progress = getReadinessProgress(readinessItems, todayKey);

	return {
		...trip,
		effectiveStatus: getEffectiveTripStatus(trip, todayKey),
		readinessActive: progress.active,
		readinessDone: progress.done,
		readinessItemCount: readinessItems.length,
		readinessPercent: progress.percent,
		// Same formula as readinessPercent; 0 until there is something to score.
		readinessScore: progress.percent ?? 0,
	};
};

const ensureBookingBelongsToTrip = async (
	ctx: MutationCtx,
	bookingId: Id<"bookings"> | undefined,
	tripId: Id<"trips">
) => {
	if (!bookingId) {
		return;
	}

	const booking = await ctx.db.get(bookingId);

	if (!booking || booking.tripId !== tripId) {
		throw new ConvexError("BOOKING_TRIP_MISMATCH");
	}
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

type ExpenseUpdatePatch = Partial<
	Pick<
		Doc<"expenses">,
		| "amount"
		| "bookingId"
		| "category"
		| "currency"
		| "notes"
		| "spentAt"
		| "title"
		| "updatedAt"
		| "vaultItemId"
	>
>;

const syncExpenseVaultLink = async (
	ctx: MutationCtx,
	previousVaultItemId: Id<"vaultItems"> | undefined,
	nextVaultItemId: Id<"vaultItems"> | undefined,
	expenseId: Id<"expenses">
) => {
	const now = Date.now();

	if (previousVaultItemId && previousVaultItemId !== nextVaultItemId) {
		const previousVaultItem = await ctx.db.get(previousVaultItemId);

		if (
			previousVaultItem?.linkedEntityId === expenseId &&
			previousVaultItem.linkedEntityType === "expense"
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
			linkedEntityId: expenseId,
			linkedEntityType: "expense",
			updatedAt: now,
		});
	}
};

const getTripSearchText = ({
	budgetAmount,
	budgetCurrency,
	destination,
	endDate,
	groupType,
	startDate,
	status,
	summary,
	title,
	travelStyle,
}: {
	budgetAmount?: number;
	budgetCurrency?: string;
	destination: string;
	endDate: string;
	groupType: string;
	startDate: string;
	status: string;
	summary: string;
	title: string;
	travelStyle: string;
}) =>
	normalizeSearchText(
		[
			title,
			destination,
			summary,
			status,
			travelStyle,
			groupType,
			startDate,
			endDate,
			budgetCurrency,
			budgetAmount?.toString(),
		]
			.filter(Boolean)
			.join(" ")
	);

const getBudgetAmountFromItems = (items: string[]) => {
	const match = pesoAmountPattern.exec(items.join(" "));

	if (!match) {
		return;
	}

	const amount = Number(match[1].replaceAll(",", ""));

	return Number.isFinite(amount) ? amount : undefined;
};

const getItineraryPaceFromTripPace = (pace: string) => {
	if (pace === "fast") {
		return "packed";
	}

	if (pace === "slow") {
		return "light";
	}

	return "balanced";
};

const matchesTripFilters = ({
	effectiveStatus,
	filters,
	isFavorite,
}: {
	effectiveStatus: EffectiveTripStatus;
	filters: Set<string>;
	isFavorite: boolean;
}) =>
	[
		filters.has("planning") && effectiveStatus === "planning",
		filters.has("traveling") && effectiveStatus === "traveling",
		filters.has("favorites") && isFavorite,
		filters.has("upcoming") &&
			(effectiveStatus === "planning" || effectiveStatus === "traveling"),
		filters.has("completed") &&
			(effectiveStatus === "completed" || effectiveStatus === "archived"),
		filters.has(getTripStatusFilter(effectiveStatus)),
	].some(Boolean);

export const listTrips = query({
	args: {},
	handler: async (ctx) => {
		const identity = await getRequiredIdentity(ctx);

		return ctx.db
			.query("trips")
			.withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
			.collect();
	},
});

export const searchTrips = query({
	args: {
		filters: v.optional(
			v.array(
				v.union(
					v.literal("planning"),
					v.literal("traveling"),
					v.literal("needsReadiness"),
					v.literal("favorites"),
					v.literal("upcoming"),
					v.literal("completed"),
					v.literal("status:planning"),
					v.literal("status:traveling"),
					v.literal("status:completed"),
					v.literal("status:archived")
				)
			)
		),
		paginationOpts: paginationOptsValidator,
		search: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const filters = new Set(args.filters ?? []);
		const search = normalizeSearchText(args.search ?? "");
		const today = getTripTodayKey();
		const cursorOffset = Number(args.paginationOpts.cursor ?? 0);
		const startIndex = Number.isFinite(cursorOffset)
			? Math.max(0, cursorOffset)
			: 0;
		const pageSize = Math.min(args.paginationOpts.numItems, maxTripsPageSize);
		const trips = await ctx.db
			.query("trips")
			.withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
			.order("desc")
			.collect();
		const wantsNeedsReadiness = filters.has("needsReadiness");
		const matchesState = (trip: Doc<"trips">) =>
			matchesTripFilters({
				effectiveStatus: getEffectiveTripStatus(trip, today),
				filters,
				isFavorite: trip.isFavorite ?? false,
			});
		const candidates = trips.filter((trip) => {
			if (trip.isDemo) {
				return false;
			}

			if (filters.size > 0 && !wantsNeedsReadiness && !matchesState(trip)) {
				return false;
			}

			return !search || getTripSearchText(trip).includes(search);
		});
		if (!wantsNeedsReadiness) {
			// Snapshots read every readiness row of a trip, so build them for the
			// requested page only.
			const pageTrips = candidates.slice(startIndex, startIndex + pageSize);
			const page = await Promise.all(
				pageTrips.map((trip) => withReadinessSnapshot(ctx, trip, today))
			);
			const nextIndex = startIndex + page.length;

			return {
				continueCursor: nextIndex.toString(),
				isDone: nextIndex >= candidates.length,
				page,
			};
		}

		// The readiness filter needs the live snapshot of every candidate, the
		// same numbers the trip list and dashboard show, not the stored score.
		const snapshots = (
			await Promise.all(
				candidates.map((trip) => withReadinessSnapshot(ctx, trip, today))
			)
		).filter(
			(snapshot) =>
				matchesState(snapshot) ||
				(snapshot.readinessScore < NEEDS_READINESS_BELOW &&
					snapshot.effectiveStatus !== "completed" &&
					snapshot.effectiveStatus !== "archived")
		);
		const pageWithReadiness = snapshots.slice(
			startIndex,
			startIndex + pageSize
		);
		const nextIndex = startIndex + pageWithReadiness.length;

		return {
			continueCursor: nextIndex.toString(),
			isDone: nextIndex >= snapshots.length,
			page: pageWithReadiness,
		};
	},
});

export const getTripById = query({
	args: {
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const trip = await ctx.db.get(args.tripId);

		if (!trip || trip.ownerId !== identity.subject) {
			throw new ConvexError("TRIP_NOT_FOUND");
		}

		return trip;
	},
});

export const getTripBudget = query({
	args: {
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const trip = await ensureTripAccess(ctx, args.tripId, identity.subject);
		const [bookings, expenses, itineraryItems, itineraryDays] =
			await Promise.all([
				ctx.db
					.query("bookings")
					.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
					.collect(),
				ctx.db
					.query("expenses")
					.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
					.collect(),
				ctx.db
					.query("itineraryItems")
					.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
					.collect(),
				ctx.db
					.query("itineraryDays")
					.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
					.collect(),
			]);

		return {
			bookings,
			expenses,
			itineraryDays,
			itineraryItems,
			trip,
		};
	},
});

export const updateTripBudget = mutation({
	args: {
		budgetAmount: v.optional(v.number()),
		budgetCurrency: v.optional(v.string()),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		assertValidBudget(args.budgetAmount);
		await ctx.db.patch(args.tripId, {
			budgetAmount: args.budgetAmount,
			budgetCurrency:
				(args.budgetCurrency ?? "PHP").trim().toUpperCase() || "PHP",
			updatedAt: Date.now(),
		});

		return ctx.db.get(args.tripId);
	},
});

export const updateTripProfile = mutation({
	args: {
		tripId: v.id("trips"),
		arrivalTime: v.optional(v.string()),
		budgetAmount: v.optional(v.number()),
		budgetCurrency: v.optional(v.string()),
		departureTime: v.optional(v.string()),
		destination: v.optional(v.string()),
		endDate: v.optional(v.string()),
		groupType: v.optional(v.string()),
		pace: v.optional(v.string()),
		startDate: v.optional(v.string()),
		summary: v.optional(v.string()),
		title: v.optional(v.string()),
		travelStyle: v.optional(v.string()),
		travelerCount: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const trip = await ensureTripAccess(ctx, args.tripId, identity.subject);
		const title = args.title === undefined ? undefined : cleanText(args.title);
		const destination =
			args.destination === undefined ? undefined : cleanText(args.destination);

		if (args.title !== undefined && !title) {
			throw new ConvexError("INVALID_TRIP_TITLE");
		}

		if (args.destination !== undefined && !destination) {
			throw new ConvexError("INVALID_TRIP_DESTINATION");
		}

		assertValidDateRange(
			args.startDate ?? trip.startDate,
			args.endDate ?? trip.endDate
		);

		if (args.startDate !== undefined || args.endDate !== undefined) {
			assertRealDateRange(
				args.startDate ?? trip.startDate,
				args.endDate ?? trip.endDate
			);
		}

		assertValidTravelerCount(args.travelerCount);
		assertValidBudget(args.budgetAmount);

		// Convex removes a field patched with `undefined`, so only send provided keys.
		const patch: Record<string, unknown> = {
			arrivalTime: args.arrivalTime,
			budgetAmount: args.budgetAmount,
			budgetCurrency: args.budgetCurrency,
			departureTime: args.departureTime,
			destination,
			endDate: args.endDate,
			groupType: args.groupType,
			pace: args.pace,
			startDate: args.startDate,
			summary: args.summary,
			title,
			travelStyle: args.travelStyle,
			travelerCount: args.travelerCount,
		};
		for (const key of Object.keys(patch)) {
			if (patch[key] === undefined) {
				delete patch[key];
			}
		}

		await ctx.db.patch(args.tripId, { ...patch, updatedAt: Date.now() });

		if (args.startDate !== undefined || args.endDate !== undefined) {
			await syncItineraryDaysToTripRange(ctx, args.tripId, {
				endDate: args.endDate ?? trip.endDate,
				previousStartDate: trip.startDate,
				startDate: args.startDate ?? trip.startDate,
			});
		}

		return ctx.db.get(args.tripId);
	},
});

export const updateTripLifecycle = mutation({
	args: {
		status: tripLifecycleValidator,
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		await ctx.db.patch(args.tripId, {
			status: args.status,
			updatedAt: Date.now(),
		});

		return ctx.db.get(args.tripId);
	},
});

export const toggleTripFavorite = mutation({
	args: {
		isFavorite: v.optional(v.boolean()),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const trip = await ensureTripAccess(ctx, args.tripId, identity.subject);
		const isFavorite = args.isFavorite ?? !trip.isFavorite;

		await ctx.db.patch(args.tripId, {
			isFavorite,
			updatedAt: Date.now(),
		});

		return ctx.db.get(args.tripId);
	},
});

export const archiveTrip = mutation({
	args: {
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);

		await ctx.db.patch(args.tripId, {
			status: "archived",
			updatedAt: Date.now(),
		});

		return ctx.db.get(args.tripId);
	},
});

export const restoreTrip = mutation({
	args: {
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const trip = await ensureTripAccess(ctx, args.tripId, identity.subject);

		if (trip.status !== "archived") {
			return trip;
		}

		// Back to planning; the date rule derives traveling/completed from there.
		await ctx.db.patch(args.tripId, {
			status: "planning",
			updatedAt: Date.now(),
		});

		return ctx.db.get(args.tripId);
	},
});

export const duplicateTrip = mutation({
	args: {
		startDate: v.optional(v.string()),
		title: v.optional(v.string()),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const trip = await ensureTripAccess(ctx, args.tripId, identity.subject);
		const shift = args.startDate;
		let startDate = trip.startDate;
		let endDate = trip.endDate;

		if (shift !== undefined) {
			const length = getTripDayCount(trip.startDate, trip.endDate) ?? 1;
			assertRealDateRange(shift, addDaysToKey(shift, length - 1));
			startDate = shift;
			endDate = addDaysToKey(shift, length - 1);
		}

		const now = Date.now();
		const newTripId = await ctx.db.insert("trips", {
			arrivalTime: trip.arrivalTime,
			budgetAmount: trip.budgetAmount,
			budgetCurrency: trip.budgetCurrency,
			coverImageUrl: trip.coverImageUrl,
			createdAt: now,
			departureTime: trip.departureTime,
			destination: trip.destination,
			endDate,
			groupType: trip.groupType,
			isDemo: false,
			ownerId: identity.subject,
			pace: trip.pace,
			readinessScore: 0,
			startDate,
			status: "planning",
			summary: trip.summary,
			title: cleanText(args.title ?? "") || `${trip.title} (copy)`,
			travelStyle: trip.travelStyle,
			travelerCount: trip.travelerCount,
			updatedAt: now,
		});
		await syncItineraryDaysToTripRange(ctx, newTripId, { endDate, startDate });
		const newTrip = await ctx.db.get(newTripId);

		if (newTrip) {
			await seedBaselineReadinessItems(ctx, newTrip);
		}

		const [sourceDays, sourceItems, sourcePlaces, newDays] = await Promise.all([
			ctx.db
				.query("itineraryDays")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("itineraryItems")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("savedPlaces")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("itineraryDays")
				.withIndex("by_trip", (q) => q.eq("tripId", newTripId))
				.collect(),
		]);
		const newDayByNumber = new Map(newDays.map((day) => [day.dayNumber, day]));
		const dayIdMap = new Map<Id<"itineraryDays">, Id<"itineraryDays">>();

		for (const sourceDay of sourceDays) {
			const target = newDayByNumber.get(sourceDay.dayNumber);

			if (!target) {
				continue;
			}

			dayIdMap.set(sourceDay._id, target._id);
			await ctx.db.patch(target._id, {
				estimatedCost: sourceDay.estimatedCost,
				pace: sourceDay.pace,
				summary: sourceDay.summary,
				theme: sourceDay.theme,
				title: sourceDay.title,
				weatherNote: sourceDay.weatherNote,
			});
		}

		for (const item of sourceItems) {
			const dayId = dayIdMap.get(item.dayId);

			if (!dayId) {
				continue;
			}

			await ctx.db.insert("itineraryItems", {
				address: item.address,
				aiReason: item.aiReason,
				category: item.category,
				dayId,
				description: item.description,
				durationMinutes: item.durationMinutes,
				endTime: item.endTime,
				estimatedCost: item.estimatedCost,
				latitude: item.latitude,
				locationName: item.locationName,
				longitude: item.longitude,
				priority: item.priority,
				startTime: item.startTime,
				status: "planned",
				title: item.title,
				tripId: newTripId,
			});
		}

		for (const place of sourcePlaces) {
			const {
				_creationTime,
				_id,
				assignedDayId,
				tripId: _tripId,
				...rest
			} = place;

			await ctx.db.insert("savedPlaces", {
				...rest,
				assignedDayId: assignedDayId ? dayIdMap.get(assignedDayId) : undefined,
				createdAt: now,
				tripId: newTripId,
				updatedAt: now,
			});
		}

		const created = await ctx.db.get(newTripId);

		if (created) {
			await seedBaselineReadinessItems(ctx, created);
		}

		return { tripId: newTripId };
	},
});

export const deleteTrip = mutation({
	args: {
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		const [
			bookings,
			documents,
			expenses,
			itineraryDays,
			itineraryItems,
			moments,
			notes,
			companions,
			readinessItems,
			risks,
			savedPlaces,
			draftAgentDrafts,
			appliedAgentDrafts,
			dismissedAgentDrafts,
			vaultItems,
		] = await Promise.all([
			ctx.db
				.query("bookings")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("travelDocuments")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("expenses")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("itineraryDays")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("itineraryItems")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("moments")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("tripNotes")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("tripCompanions")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("readinessItems")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("risks")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("savedPlaces")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("tripAgentDrafts")
				.withIndex("by_trip_status", (q) =>
					q.eq("tripId", args.tripId).eq("status", "draft")
				)
				.collect(),
			ctx.db
				.query("tripAgentDrafts")
				.withIndex("by_trip_status", (q) =>
					q.eq("tripId", args.tripId).eq("status", "applied")
				)
				.collect(),
			ctx.db
				.query("tripAgentDrafts")
				.withIndex("by_trip_status", (q) =>
					q.eq("tripId", args.tripId).eq("status", "dismissed")
				)
				.collect(),
			ctx.db
				.query("vaultItems")
				.withIndex("by_owner_trip", (q) =>
					q.eq("ownerId", identity.subject).eq("tripId", args.tripId)
				)
				.collect(),
		]);
		const chatThreads = await ctx.db
			.query("chatThreads")
			.withIndex("by_owner_updatedAt", (q) => q.eq("ownerId", identity.subject))
			.collect();

		for (const item of [
			...bookings,
			...documents,
			...expenses,
			...itineraryDays,
			...itineraryItems,
			...moments,
			...notes,
			...companions,
			...readinessItems,
			...risks,
			...savedPlaces,
			...draftAgentDrafts,
			...appliedAgentDrafts,
			...dismissedAgentDrafts,
		]) {
			await ctx.db.delete(item._id);
		}

		for (const item of vaultItems) {
			await ctx.storage.delete(item.storageId);
			await ctx.db.delete(item._id);
		}

		const now = Date.now();
		for (const thread of chatThreads) {
			if (thread.tripId === args.tripId) {
				const pendingQuestions = await ctx.db
					.query("chatQuestionPrompts")
					.withIndex("by_owner_thread_status_updatedAt", (q) =>
						q
							.eq("ownerId", identity.subject)
							.eq("threadId", thread.threadId)
							.eq("status", "pending")
					)
					.collect();

				for (const question of pendingQuestions) {
					await ctx.db.patch(question._id, {
						status: "dismissed",
						updatedAt: now,
					});
				}

				await ctx.db.patch(thread._id, {
					mode: "chat",
					tripId: undefined,
					updatedAt: now,
				});
			}
		}

		await ctx.db.delete(args.tripId);

		return { tripId: args.tripId };
	},
});

export const addTripExpense = mutation({
	args: {
		amount: v.number(),
		bookingId: v.optional(v.id("bookings")),
		category: expenseCategoryValidator,
		currency: v.optional(v.string()),
		notes: v.optional(v.string()),
		spentAt: v.string(),
		title: v.string(),
		tripId: v.id("trips"),
		vaultItemId: v.optional(v.id("vaultItems")),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		await ensureBookingBelongsToTrip(ctx, args.bookingId, args.tripId);
		await ensureVaultItemBelongsToTrip(ctx, args.vaultItemId, args.tripId);

		if (!(Number.isFinite(args.amount) && args.amount > 0)) {
			throw new ConvexError("INVALID_EXPENSE_AMOUNT");
		}

		const title = args.title.trim();
		if (!title) {
			throw new ConvexError("INVALID_EXPENSE_TITLE");
		}

		const now = Date.now();
		const expenseId = await ctx.db.insert("expenses", {
			amount: args.amount,
			bookingId: args.bookingId,
			category: args.category,
			createdAt: now,
			currency: args.currency ?? "PHP",
			notes: args.notes?.trim() || undefined,
			source: "manual",
			spentAt: args.spentAt,
			title,
			tripId: args.tripId,
			updatedAt: now,
			vaultItemId: args.vaultItemId,
		});
		await syncExpenseVaultLink(ctx, undefined, args.vaultItemId, expenseId);
		await ctx.db.patch(args.tripId, { updatedAt: now });

		return ctx.db.get(expenseId);
	},
});

export const updateTripExpense = mutation({
	args: {
		expenseId: v.id("expenses"),
		amount: v.optional(v.number()),
		bookingId: v.optional(v.id("bookings")),
		category: v.optional(expenseCategoryValidator),
		currency: v.optional(v.string()),
		notes: v.optional(v.string()),
		spentAt: v.optional(v.string()),
		title: v.optional(v.string()),
		vaultItemId: v.optional(v.id("vaultItems")),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const expense = await ctx.db.get(args.expenseId);

		if (!expense) {
			throw new ConvexError("EXPENSE_NOT_FOUND");
		}

		await ensureTripAccess(ctx, expense.tripId, identity.subject);
		const shouldUpdateBooking = hasOwnObjectProperty(args, "bookingId");
		const shouldUpdateVaultItem = hasOwnObjectProperty(args, "vaultItemId");
		if (shouldUpdateBooking) {
			await ensureBookingBelongsToTrip(ctx, args.bookingId, expense.tripId);
		}
		if (shouldUpdateVaultItem) {
			await ensureVaultItemBelongsToTrip(ctx, args.vaultItemId, expense.tripId);
		}

		if (
			args.amount !== undefined &&
			!(Number.isFinite(args.amount) && args.amount > 0)
		) {
			throw new ConvexError("INVALID_EXPENSE_AMOUNT");
		}

		const title = args.title?.trim();
		if (args.title !== undefined && !title) {
			throw new ConvexError("INVALID_EXPENSE_TITLE");
		}

		const now = Date.now();
		const patch: ExpenseUpdatePatch = { updatedAt: now };

		if (args.amount !== undefined) {
			patch.amount = args.amount;
		}
		if (shouldUpdateBooking) {
			patch.bookingId = args.bookingId;
		}
		if (args.category !== undefined) {
			patch.category = args.category;
		}
		if (args.currency !== undefined) {
			patch.currency = args.currency;
		}
		if (hasOwnObjectProperty(args, "notes")) {
			patch.notes = args.notes?.trim() || undefined;
		}
		if (args.spentAt !== undefined) {
			patch.spentAt = args.spentAt;
		}
		if (title !== undefined) {
			patch.title = title;
		}
		if (shouldUpdateVaultItem) {
			patch.vaultItemId = args.vaultItemId;
		}

		await ctx.db.patch(args.expenseId, patch);
		if (shouldUpdateVaultItem) {
			await syncExpenseVaultLink(
				ctx,
				expense.vaultItemId,
				args.vaultItemId,
				args.expenseId
			);
		}
		await ctx.db.patch(expense.tripId, { updatedAt: now });

		return ctx.db.get(args.expenseId);
	},
});

export const deleteTripExpense = mutation({
	args: { expenseId: v.id("expenses") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const expense = await ctx.db.get(args.expenseId);

		if (!expense) {
			throw new ConvexError("EXPENSE_NOT_FOUND");
		}

		await ensureTripAccess(ctx, expense.tripId, identity.subject);
		await clearDeletedTripEntityReferences({
			ctx,
			linkedEntityId: args.expenseId,
			linkedEntityType: "expense",
			tripId: expense.tripId,
		});
		await ctx.db.delete(args.expenseId);
		await ctx.db.patch(expense.tripId, { updatedAt: Date.now() });

		return { deletedExpenseId: args.expenseId };
	},
});

export const createTrip = mutation({
	args: {
		title: v.optional(v.string()),
		destination: v.string(),
		startDate: v.string(),
		endDate: v.string(),
		arrivalTime: v.optional(v.string()),
		departureTime: v.optional(v.string()),
		budgetAmount: v.optional(v.number()),
		budgetCurrency: v.optional(v.string()),
		coverImageUrl: v.optional(v.string()),
		travelStyle: v.optional(v.string()),
		groupType: v.optional(v.string()),
		pace: v.optional(v.string()),
		summary: v.optional(v.string()),
		travelerCount: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureUserRecord(ctx);
		assertRealDateRange(args.startDate, args.endDate);
		assertValidTravelerCount(args.travelerCount);
		assertValidBudget(args.budgetAmount);
		const destination = cleanText(args.destination);

		if (!destination) {
			throw new ConvexError("INVALID_TRIP_DESTINATION");
		}

		const now = Date.now();
		const tripId = await ctx.db.insert("trips", {
			ownerId: identity.subject,
			title: cleanText(args.title ?? "") || `${destination} Trip`,
			destination,
			startDate: args.startDate,
			endDate: args.endDate,
			arrivalTime: args.arrivalTime,
			departureTime: args.departureTime,
			budgetAmount: args.budgetAmount,
			budgetCurrency: args.budgetCurrency ?? "PHP",
			coverImageUrl: args.coverImageUrl,
			travelStyle: args.travelStyle ?? "balanced",
			pace: args.pace ?? "balanced",
			groupType: args.groupType ?? "solo",
			travelerCount: args.travelerCount,
			status: "planning",
			readinessScore: 0,
			summary: args.summary ?? "",
			isDemo: false,
			createdAt: now,
			updatedAt: now,
		});

		await syncItineraryDaysToTripRange(ctx, tripId, {
			endDate: args.endDate,
			startDate: args.startDate,
		});
		const created = await ctx.db.get(tripId);

		if (created) {
			await seedBaselineReadinessItems(ctx, created);
		}

		return { tripId };
	},
});

export const createTripFromBlueprint = mutation({
	args: {
		title: v.string(),
		destination: v.string(),
		route: blueprintItemsValidator,
		dates: blueprintItemsValidator,
		travelers: v.optional(blueprintItemsValidator),
		budgetAllocation: blueprintItemsValidator,
		pace: v.optional(blueprintItemsValidator),
		itineraryStyle: blueprintItemsValidator,
		bookingTargets: blueprintItemsValidator,
		requirements: blueprintItemsValidator,
		risks: blueprintItemsValidator,
		nextActions: blueprintItemsValidator,
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureUserRecord(ctx);

		const now = Date.now();
		const { endDate, isPlaceholder, startDate } = resolveBlueprintDateRange(
			args.dates,
			getTripTodayKey(now)
		);
		const budgetAmount = getBudgetAmountFromItems(args.budgetAllocation);
		const travelers = getLimitedItems(args.travelers ?? []);
		const paceItems = getLimitedItems(args.pace ?? []);
		const itinerarySummary = joinItems(
			[...args.itineraryStyle, ...paceItems],
			"Planning blueprint created with Viya."
		);
		const routeSummary = joinItems(args.route, args.destination);
		const bookingTargets = getLimitedItems(args.bookingTargets);
		const requirements = getLimitedItems(args.requirements);
		const nextActions = getLimitedItems(args.nextActions);
		const riskItems = getLimitedItems(args.risks);
		const readinessItems = [...requirements, ...nextActions].slice(
			0,
			maxBlueprintItems
		);
		const tripPace = getBlueprintPace([...paceItems, ...args.itineraryStyle]);
		const groupType = getBlueprintGroupType(travelers);
		const travelerSummary = joinItems(travelers, "Solo traveler.");
		const tripId = await ctx.db.insert("trips", {
			arrivalTime: undefined,
			budgetAmount,
			budgetCurrency: "PHP",
			coverImageUrl: undefined,
			createdAt: now,
			departureTime: undefined,
			destination: args.destination,
			endDate,
			groupType,
			isDemo: false,
			ownerId: identity.subject,
			pace: tripPace,
			readinessScore: 0,
			startDate,
			status: "planning",
			summary: `${routeSummary}. ${travelerSummary}. ${itinerarySummary}${isPlaceholder ? ` ${PLACEHOLDER_TRIP_NOTE}` : ""}`,
			title: cleanText(args.title) || `${cleanText(args.destination)} Trip`,
			travelStyle: getBlueprintTravelStyle([
				...args.itineraryStyle,
				...paceItems,
			]),
			updatedAt: now,
		});

		await syncItineraryDaysToTripRange(ctx, tripId, { endDate, startDate });
		const firstDay = await ctx.db
			.query("itineraryDays")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect()
			.then((days) => days.find((day) => day.dayNumber === 1));

		if (firstDay) {
			await ctx.db.patch(firstDay._id, {
				estimatedCost: 0,
				pace: getItineraryPaceFromTripPace(tripPace),
				summary: routeSummary,
				theme: "Planning blueprint",
				title: "Route and planning outline",
				weatherNote: "Confirm forecast closer to departure.",
			});
		}

		for (const target of bookingTargets) {
			await ctx.db.insert("bookings", {
				createdAt: now,
				extractedFrom: "tripBlueprint",
				notes:
					"External booking target from Viya. Book through your preferred provider; Viya does not process payments in the MVP.",
				status: "target",
				title: target,
				tripId,
				type: getBlueprintBookingType(target),
				updatedAt: now,
			});
		}

		for (const item of readinessItems) {
			await ctx.db.insert("readinessItems", {
				aiReason: "Created from the agreed Trip Blueprint.",
				category: getBlueprintReadinessCategory(item),
				description: item,
				dueDate: startDate,
				priority: "medium",
				source: "ai",
				status: "todo",
				title: item,
				tripId,
			});
		}

		for (const risk of riskItems) {
			await ctx.db.insert("risks", {
				aiReason: "Identified during planning agreement.",
				createdAt: now,
				message: risk,
				severity: getBlueprintRiskSeverity(risk),
				status: "open",
				suggestedAction: "Review before booking externally.",
				title: risk,
				tripId,
				type: getBlueprintRiskType(risk),
			});
		}

		const created = await ctx.db.get(tripId);

		if (created) {
			await seedBaselineReadinessItems(ctx, created);
			await updateTripReadinessScore(ctx, tripId);
		}

		return { tripId };
	},
});
