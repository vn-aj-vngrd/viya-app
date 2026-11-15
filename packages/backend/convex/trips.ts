import {
	calculateReadinessScore,
	getDateKeyInTimeZone,
	getReadinessProgress,
	TRIP_COMPLETED_STATUSES,
	TRIP_PLANNING_STATUSES,
	type TripStatus,
	toReadinessItem,
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
import { clearDeletedTripEntityReferences } from "./lib/tripLinks";

const maxBlueprintItems = 8;
const maxTripsPageSize = 24;
const isoDatePattern = /\b(20\d{2}-\d{2}-\d{2})\b/g;
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

const TRIP_TIME_ZONE = "Asia/Manila";

const normalizeSearchText = (value: string) =>
	value.replace(whitespacePattern, " ").trim().toLowerCase();

const assertValidDateRange = (startDate: string, endDate: string) => {
	if (startDate && endDate && startDate > endDate) {
		throw new ConvexError("INVALID_TRIP_DATE_RANGE");
	}
};

type TripSearchStatusFilter = `status:${TripStatus}`;

const getTripStatusFilter = (status: TripStatus): TripSearchStatusFilter =>
	`status:${status}`;

const withReadinessSnapshot = async (ctx: QueryCtx, trip: Doc<"trips">) => {
	const readinessItems = await ctx.db
		.query("readinessItems")
		.withIndex("by_trip", (q) => q.eq("tripId", trip._id))
		.collect();
	const readinessScore = calculateReadinessScore(
		readinessItems.map(toReadinessItem)
	);
	const progress = getReadinessProgress(
		readinessItems,
		getDateKeyInTimeZone(Date.now(), TRIP_TIME_ZONE)
	);

	return {
		...trip,
		readinessActive: progress.active,
		readinessDone: progress.done,
		readinessItemCount: readinessItems.length,
		readinessPercent: progress.percent,
		readinessScore: readinessScore.overallScore,
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

const getDateRangeFromItems = (items: string[]) => {
	const matches = Array.from(items.join(" ").matchAll(isoDatePattern)).map(
		(match) => match[1]
	);

	return {
		endDate: matches[1] ?? matches[0] ?? "",
		startDate: matches[0] ?? "",
	};
};

const getBudgetAmountFromItems = (items: string[]) => {
	const match = pesoAmountPattern.exec(items.join(" "));

	if (!match) {
		return;
	}

	const amount = Number(match[1].replaceAll(",", ""));

	return Number.isFinite(amount) ? amount : undefined;
};

const getTravelStyleFromItems = (items: string[]) => {
	const text = items.join(" ").toLowerCase();

	if (text.includes("luxury") || text.includes("premium")) {
		return "luxury";
	}

	if (text.includes("budget")) {
		return "budget";
	}

	if (text.includes("adventure")) {
		return "adventure";
	}

	if (
		text.includes("relaxed") ||
		text.includes("laid-back") ||
		text.includes("slow")
	) {
		return "relaxed";
	}

	if (text.includes("packed") || text.includes("fast")) {
		return "packed";
	}

	return "balanced";
};

const getPaceFromItems = (items: string[]) => {
	const text = items.join(" ").toLowerCase();

	if (
		text.includes("relaxed") ||
		text.includes("laid-back") ||
		text.includes("slow") ||
		text.includes("light")
	) {
		return "slow";
	}

	if (text.includes("packed") || text.includes("fast")) {
		return "fast";
	}

	return "moderate";
};

const getGroupTypeFromItems = (items: string[]) => {
	const text = items.join(" ").toLowerCase();

	if (text.includes("family")) {
		return "family";
	}

	if (text.includes("friend")) {
		return "friends";
	}

	if (text.includes("work") || text.includes("business")) {
		return "work";
	}

	if (
		text.includes("couple") ||
		text.includes("partner") ||
		text.includes("2")
	) {
		return "couple";
	}

	return "solo";
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

const getReadinessCategory = (item: string) => {
	const text = item.toLowerCase();

	if (
		text.includes("passport") ||
		text.includes("visa") ||
		text.includes("id")
	) {
		return "documents";
	}

	if (
		text.includes("booking") ||
		text.includes("book ") ||
		text.includes("reserve")
	) {
		return "bookings";
	}

	if (
		text.includes("flight") ||
		text.includes("ferry") ||
		text.includes("transfer") ||
		text.includes("transport")
	) {
		return "transport";
	}

	if (
		text.includes("budget") ||
		text.includes("cash") ||
		text.includes("cost")
	) {
		return "budget";
	}

	if (text.includes("weather") || text.includes("rain")) {
		return "weather";
	}

	if (text.includes("safety") || text.includes("emergency")) {
		return "safety";
	}

	if (text.includes("pack")) {
		return "packing";
	}

	return "schedule";
};

const getBookingType = (item: string) => {
	const text = item.toLowerCase();

	if (text.includes("flight")) {
		return "flight";
	}

	if (
		text.includes("hotel") ||
		text.includes("stay") ||
		text.includes("accommodation")
	) {
		return "hotel";
	}

	if (
		text.includes("tour") ||
		text.includes("activity") ||
		text.includes("ticket")
	) {
		return "activity";
	}

	if (
		text.includes("ferry") ||
		text.includes("transfer") ||
		text.includes("transport")
	) {
		return "transport";
	}

	return "other";
};

const getRiskType = (item: string) => {
	const text = item.toLowerCase();

	if (text.includes("weather") || text.includes("rain")) {
		return "weather";
	}

	if (text.includes("budget") || text.includes("cost")) {
		return "budget";
	}

	if (
		text.includes("booking") ||
		text.includes("hotel") ||
		text.includes("availability")
	) {
		return "booking";
	}

	if (
		text.includes("flight") ||
		text.includes("ferry") ||
		text.includes("transfer") ||
		text.includes("transport")
	) {
		return "transport";
	}

	if (text.includes("tired") || text.includes("fatigue")) {
		return "fatigue";
	}

	if (text.includes("safety")) {
		return "safety";
	}

	return "unknown";
};

const getRiskSeverity = (item: string) => {
	const text = item.toLowerCase();

	if (text.includes("critical") || text.includes("major")) {
		return "critical";
	}

	if (text.includes("high")) {
		return "high";
	}

	if (text.includes("low")) {
		return "low";
	}

	return "medium";
};

const matchesTripFilters = ({
	filters,
	isCompleted,
	isFavorite,
	isPlanning,
	isUpcoming,
	needsReadiness,
	tripStatus,
}: {
	filters: Set<string>;
	isCompleted: boolean;
	isFavorite: boolean;
	isPlanning: boolean;
	isUpcoming: boolean;
	needsReadiness: boolean;
	tripStatus: TripStatus;
}) =>
	[
		filters.has("planning") && isPlanning,
		filters.has("traveling") && tripStatus === "traveling",
		filters.has("needsReadiness") && needsReadiness,
		filters.has("favorites") && isFavorite,
		filters.has("upcoming") && isUpcoming,
		filters.has("completed") && isCompleted,
		filters.has(getTripStatusFilter(tripStatus)),
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
		const today = getDateKeyInTimeZone(Date.now(), TRIP_TIME_ZONE);
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
		const filteredTrips = trips.filter((trip) => {
			if (trip.isDemo) {
				return false;
			}

			if (filters.size > 0) {
				const isPlanning = TRIP_PLANNING_STATUSES.includes(
					trip.status as never
				);
				const needsReadiness = trip.readinessScore < 90;
				const isUpcoming =
					!TRIP_COMPLETED_STATUSES.includes(trip.status as never) &&
					(!trip.endDate || trip.endDate >= today);
				const isCompleted =
					TRIP_COMPLETED_STATUSES.includes(trip.status as never) ||
					(!!trip.endDate && trip.endDate < today);
				const isFavorite = trip.isFavorite ?? false;
				if (
					!matchesTripFilters({
						filters,
						isCompleted,
						isFavorite,
						isPlanning,
						isUpcoming,
						needsReadiness,
						tripStatus: trip.status as TripStatus,
					})
				) {
					return false;
				}
			}

			if (!search) {
				return true;
			}

			return getTripSearchText(trip).includes(search);
		});
		const page = filteredTrips.slice(startIndex, startIndex + pageSize);
		const pageWithReadiness = await Promise.all(
			page.map((trip) => withReadinessSnapshot(ctx, trip))
		);
		const nextIndex = startIndex + page.length;

		return {
			continueCursor: nextIndex.toString(),
			isDone: nextIndex >= filteredTrips.length,
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
		const [bookings, expenses, itineraryItems] = await Promise.all([
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
		]);

		return {
			bookings,
			expenses,
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
		await ctx.db.patch(args.tripId, {
			budgetAmount: args.budgetAmount,
			budgetCurrency: args.budgetCurrency ?? "PHP",
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
		const title = args.title?.trim();
		const destination = args.destination?.trim();

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

		await ctx.db.patch(args.tripId, {
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
			updatedAt: Date.now(),
		});

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
		assertValidDateRange(args.startDate, args.endDate);

		const now = Date.now();
		const tripId = await ctx.db.insert("trips", {
			ownerId: identity.subject,
			title:
				args.title ||
				(args.destination ? `${args.destination} Trip` : "New trip"),
			destination: args.destination,
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
			summary: args.summary ?? "Manual trip planning started in Viya.",
			isDemo: false,
			createdAt: now,
			updatedAt: now,
		});

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
		const { endDate, startDate } = getDateRangeFromItems(args.dates);
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
		const tripPace = getPaceFromItems([...paceItems, ...args.itineraryStyle]);
		const groupType = getGroupTypeFromItems(travelers);
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
			summary: `${routeSummary}. ${travelerSummary}. ${itinerarySummary}`,
			title: args.title,
			travelStyle: getTravelStyleFromItems([
				...args.itineraryStyle,
				...paceItems,
			]),
			updatedAt: now,
		});

		await ctx.db.insert("itineraryDays", {
			date: startDate,
			dayNumber: 1,
			estimatedCost: budgetAmount ?? 0,
			pace: getItineraryPaceFromTripPace(tripPace),
			summary: routeSummary,
			theme: "Planning blueprint",
			title: "Route and planning outline",
			tripId,
			weatherNote: "Confirm forecast closer to departure.",
		});

		for (const target of bookingTargets) {
			await ctx.db.insert("bookings", {
				createdAt: now,
				extractedFrom: "tripBlueprint",
				notes:
					"External booking target from Viya. Book through your preferred provider; Viya does not process payments in the MVP.",
				status: "target",
				title: target,
				tripId,
				type: getBookingType(target),
				updatedAt: now,
			});
		}

		for (const item of readinessItems) {
			await ctx.db.insert("readinessItems", {
				aiReason: "Created from the agreed Trip Blueprint.",
				category: getReadinessCategory(item),
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
				severity: getRiskSeverity(risk),
				status: "open",
				suggestedAction: "Review before booking externally.",
				title: risk,
				tripId,
				type: getRiskType(risk),
			});
		}

		return { tripId };
	},
});
