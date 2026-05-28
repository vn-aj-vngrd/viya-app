import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
	ensureTripAccess,
	ensureUserRecord,
	getRequiredIdentity,
} from "./lib/auth";

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
					v.literal("ready"),
					v.literal("needsReadiness"),
					v.literal("upcoming"),
					v.literal("completed")
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
		const today = new Date().toISOString().slice(0, 10);
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
				const isPlanning =
					trip.status === "draft" || trip.status === "planning";
				const isReady = trip.readinessScore >= 90;
				const needsReadiness = trip.readinessScore < 90;
				const isUpcoming = !!trip.startDate && trip.startDate >= today;
				const isCompleted =
					trip.status === "completed" ||
					(!!trip.endDate && trip.endDate < today);

				if (
					!(
						(filters.has("planning") && isPlanning) ||
						(filters.has("ready") && isReady) ||
						(filters.has("needsReadiness") && needsReadiness) ||
						(filters.has("upcoming") && isUpcoming) ||
						(filters.has("completed") && isCompleted)
					)
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
		const nextIndex = startIndex + page.length;

		return {
			continueCursor: nextIndex.toString(),
			isDone: nextIndex >= filteredTrips.length,
			page,
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

export const addTripExpense = mutation({
	args: {
		amount: v.number(),
		category: expenseCategoryValidator,
		currency: v.optional(v.string()),
		notes: v.optional(v.string()),
		spentAt: v.string(),
		title: v.string(),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);

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
			category: args.category,
			createdAt: now,
			currency: args.currency ?? "PHP",
			notes: args.notes?.trim() || undefined,
			source: "manual",
			spentAt: args.spentAt,
			title,
			tripId: args.tripId,
			updatedAt: now,
		});

		return ctx.db.get(expenseId);
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
		travelStyle: v.optional(v.string()),
		groupType: v.optional(v.string()),
		summary: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureUserRecord(ctx);

		const now = Date.now();
		const tripId = await ctx.db.insert("trips", {
			ownerId: identity.subject,
			title: args.title ?? `${args.destination} Trip`,
			destination: args.destination,
			startDate: args.startDate,
			endDate: args.endDate,
			arrivalTime: args.arrivalTime,
			departureTime: args.departureTime,
			budgetAmount: args.budgetAmount,
			budgetCurrency: args.budgetCurrency ?? "PHP",
			travelStyle: args.travelStyle ?? "balanced",
			pace: "moderate",
			groupType: args.groupType ?? "solo",
			status: "draft",
			readinessScore: 0,
			summary: args.summary ?? "Manual trip draft created in Viya.",
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
		budgetAllocation: blueprintItemsValidator,
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
		const itinerarySummary = joinItems(
			args.itineraryStyle,
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
		const tripPace = getPaceFromItems(args.itineraryStyle);
		const tripId = await ctx.db.insert("trips", {
			arrivalTime: undefined,
			budgetAmount,
			budgetCurrency: "PHP",
			coverImageUrl: undefined,
			createdAt: now,
			departureTime: undefined,
			destination: args.destination,
			endDate,
			groupType: "solo",
			isDemo: false,
			ownerId: identity.subject,
			pace: tripPace,
			readinessScore: 0,
			startDate,
			status: "planning",
			summary: `${routeSummary}. ${itinerarySummary}`,
			title: args.title,
			travelStyle: getTravelStyleFromItems(args.itineraryStyle),
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
