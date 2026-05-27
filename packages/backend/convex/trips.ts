import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { ensureUserRecord, getRequiredIdentity } from "./lib/auth";

const maxBlueprintItems = 8;
const isoDatePattern = /\b(20\d{2}-\d{2}-\d{2})\b/g;
const pesoAmountPattern = /(?:₱|PHP\s*)\s?([0-9][0-9,]*)/i;
const whitespacePattern = /\s+/g;

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
			summary: "Trip draft created from Viya onboarding.",
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
