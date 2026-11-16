// biome-ignore-all lint/style/useFilenamingConvention: Convex module names are public API paths.

import {
	getBudgetWalletSummary,
	getDayOffset,
	getReadinessProgress,
	getSeasonRiskNote,
	getTripDayCount,
	REQUIRED_READINESS_CATEGORIES,
	sortReadinessItemsForReview,
	sortTripRisksForReview,
} from "@viya-app/domain";
import { ConvexError, v } from "convex/values";

import {
	cleanString,
	type TripAgentDraftPayload,
	tripAgentDraftPayloadSchema,
} from "../../src/ai/trip-agent-draft-apply";
import { describeDraftPayload } from "../../src/ai/trip-agent-draft-preview";
import {
	type ProposalContext,
	type ProposalModule,
	validateDraftProposal,
} from "../../src/ai/trip-agent-draft-validation";
import {
	buildSeasonInfo,
	formatItineraryRead,
	readListLimit,
} from "../../src/ai/trip-chat-reads";
import { getChatTodayKey } from "../../src/ai/trip-context";
import type { Doc, Id } from "../_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	type QueryCtx,
} from "../_generated/server";

const maxStopsRead = 400;
const maxTextChars = 200;
const maxPendingDraftsListed = 5;

/** Every tool re-checks that the trip belongs to the chat's owner. */
const getOwnedTrip = async (
	ctx: QueryCtx | MutationCtx,
	ownerId: string,
	tripId: Id<"trips">
) => {
	const trip = await ctx.db.get(tripId);

	if (!trip || trip.ownerId !== ownerId) {
		throw new ConvexError("TRIP_NOT_FOUND");
	}

	return trip;
};

const scopeArgs = { ownerId: v.string(), tripId: v.id("trips") };

const clip = (value: string | undefined, max = maxTextChars) => {
	if (!value) {
		return;
	}

	return value.length > max ? `${value.slice(0, max - 1)}...` : value;
};

const loadDays = (ctx: QueryCtx | MutationCtx, tripId: Id<"trips">) =>
	ctx.db
		.query("itineraryDays")
		.withIndex("by_trip", (q) => q.eq("tripId", tripId))
		.take(readListLimit * 3);

const loadStops = (ctx: QueryCtx | MutationCtx, tripId: Id<"trips">) =>
	ctx.db
		.query("itineraryItems")
		.withIndex("by_trip", (q) => q.eq("tripId", tripId))
		.take(maxStopsRead);

const getPhase = (trip: Doc<"trips">, today: string) => {
	if (today < trip.startDate) {
		return "before";
	}

	return today > trip.endDate ? "after" : "during";
};

export const getTripOverview = internalQuery({
	args: scopeArgs,
	handler: async (ctx, args): Promise<string> => {
		const trip = await getOwnedTrip(ctx, args.ownerId, args.tripId);
		const today = getChatTodayKey();
		const [stops, bookings, readinessItems, risks, drafts] = await Promise.all([
			loadStops(ctx, args.tripId),
			ctx.db
				.query("bookings")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.take(readListLimit * 2),
			ctx.db
				.query("readinessItems")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.take(readListLimit * 3),
			ctx.db
				.query("risks")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.take(readListLimit * 2),
			ctx.db
				.query("tripAgentDrafts")
				.withIndex("by_trip_status", (q) =>
					q.eq("tripId", args.tripId).eq("status", "draft")
				)
				.order("desc")
				.take(maxPendingDraftsListed),
		]);
		const season = getSeasonRiskNote({
			destination: trip.destination,
			endDate: trip.endDate,
			startDate: trip.startDate,
			today,
		});

		return JSON.stringify({
			counts: {
				bookings: bookings.length,
				openRisks: risks.filter((risk) => risk.status === "open").length,
				openTasks: readinessItems.filter(
					(item) => item.status !== "done" && item.status !== "ignored"
				).length,
				stops: stops.length,
			},
			daysUntilStart: Math.max(0, getDayOffset(today, trip.startDate) ?? 0),
			pendingDrafts: drafts.map((draft) => ({
				module: draft.module,
				title: draft.title,
			})),
			phase: getPhase(trip, today),
			readinessPercent:
				getReadinessProgress(readinessItems, today).percent ?? 0,
			season: { headline: season.headline, label: season.badge.label },
			today,
			trip: {
				arrivalTime: trip.arrivalTime,
				budgetAmount: trip.budgetAmount ?? null,
				budgetCurrency: trip.budgetCurrency ?? "PHP",
				dayCount: getTripDayCount(trip.startDate, trip.endDate),
				departureTime: trip.departureTime,
				destination: trip.destination,
				endDate: trip.endDate,
				groupType: trip.groupType,
				pace: trip.pace,
				startDate: trip.startDate,
				status: trip.status,
				summary: clip(trip.summary),
				title: trip.title,
				travelerCount: trip.travelerCount ?? null,
				travelStyle: trip.travelStyle,
			},
		});
	},
});

export const getItinerary = internalQuery({
	args: { ...scopeArgs, date: v.optional(v.string()) },
	handler: async (ctx, args): Promise<string> => {
		await getOwnedTrip(ctx, args.ownerId, args.tripId);
		const [days, stops] = await Promise.all([
			loadDays(ctx, args.tripId),
			loadStops(ctx, args.tripId),
		]);

		return JSON.stringify(
			formatItineraryRead({ date: args.date, days, stops })
		);
	},
});

// Totals must cover every record, so these reads are not capped.
export const getBudgetSummary = internalQuery({
	args: scopeArgs,
	handler: async (ctx, args): Promise<string> => {
		const trip = await getOwnedTrip(ctx, args.ownerId, args.tripId);
		const [bookings, expenses, days, items] = await Promise.all([
			ctx.db
				.query("bookings")
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
		]);
		const today = getChatTodayKey();
		const firstDay = today > trip.startDate ? today : trip.startDate;
		const remainingTripDays =
			today > trip.endDate ? 1 : (getTripDayCount(firstDay, trip.endDate) ?? 1);
		const summary = getBudgetWalletSummary({
			bookings,
			budgetAmount: trip.budgetAmount,
			budgetCurrency: trip.budgetCurrency,
			expenses,
			itineraryDays: days,
			itineraryItems: items,
			remainingTripDays,
		});

		return JSON.stringify({
			alert: summary.alert.level,
			budgetAmount: trip.budgetAmount ?? null,
			budgetCurrency: trip.budgetCurrency ?? "PHP",
			byCategory: summary.categorySummaries.slice(0, 8),
			committedSpend: summary.committedSpend,
			confirmedBookingCosts: summary.confirmedBookingCosts,
			dailySafeSpend: summary.dailySafeSpend,
			foreignCurrencyExcluded: summary.hasForeignCurrency
				? summary.foreignCurrencyTotals
				: undefined,
			leftAmount: summary.leftAmount,
			manualExpenses: summary.manualExpenses,
			overAmount: summary.overAmount,
			plannedItineraryCosts: summary.plannedCosts,
			remainingTripDays,
			today,
		});
	},
});

export const getBookings = internalQuery({
	args: scopeArgs,
	handler: async (ctx, args): Promise<string> => {
		await getOwnedTrip(ctx, args.ownerId, args.tripId);
		const bookings = await ctx.db
			.query("bookings")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.take(readListLimit);

		return JSON.stringify(
			bookings
				.sort((first, second) =>
					(first.startDateTime ?? "~").localeCompare(
						second.startDateTime ?? "~"
					)
				)
				.map((booking) => ({
					bookingId: booking._id,
					cost: booking.cost,
					currency: booking.currency,
					end: booking.endDateTime,
					hasConfirmationCode: Boolean(booking.confirmationCode),
					location: booking.locationName,
					provider: booking.provider,
					start: booking.startDateTime,
					status: booking.status,
					title: booking.title,
					type: booking.type,
				}))
		);
	},
});

export const getReadiness = internalQuery({
	args: scopeArgs,
	handler: async (ctx, args): Promise<string> => {
		await getOwnedTrip(ctx, args.ownerId, args.tripId);
		const items = await ctx.db
			.query("readinessItems")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.take(readListLimit * 3);
		const today = getChatTodayKey();

		return JSON.stringify({
			items: sortReadinessItemsForReview(items)
				.slice(0, readListLimit)
				.map((item) => ({
					category: item.category,
					dueDate: item.dueDate,
					priority: item.priority,
					status: item.status,
					taskId: item._id,
					title: item.title,
				})),
			missingRequiredCategories: REQUIRED_READINESS_CATEGORIES.filter(
				(category) =>
					!items.some(
						(item) => item.category === category && item.status !== "ignored"
					)
			),
			readinessPercent: getReadinessProgress(items, today).percent ?? 0,
			today,
		});
	},
});

export const getRisks = internalQuery({
	args: scopeArgs,
	handler: async (ctx, args): Promise<string> => {
		await getOwnedTrip(ctx, args.ownerId, args.tripId);
		const risks = await ctx.db
			.query("risks")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.take(readListLimit * 2);

		return JSON.stringify(
			sortTripRisksForReview(risks)
				.slice(0, readListLimit)
				.map((risk) => ({
					message: clip(risk.message),
					riskId: risk._id,
					severity: risk.severity,
					status: risk.status,
					suggestedAction: clip(risk.suggestedAction),
					title: risk.title,
					type: risk.type,
				}))
		);
	},
});

export const getSavedPlaces = internalQuery({
	args: scopeArgs,
	handler: async (ctx, args): Promise<string> => {
		await getOwnedTrip(ctx, args.ownerId, args.tripId);
		const [places, days] = await Promise.all([
			ctx.db
				.query("savedPlaces")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.take(readListLimit),
			loadDays(ctx, args.tripId),
		]);
		const dateByDayId = new Map(days.map((day) => [day._id, day.date]));

		return JSON.stringify(
			places.map((place) => ({
				assignedDate: place.assignedDayId
					? dateByDayId.get(place.assignedDayId)
					: undefined,
				category: place.category,
				description: clip(place.description),
				location: place.locationName,
				placeId: place._id,
				title: place.title,
			}))
		);
	},
});

export const getNotesAndVault = internalQuery({
	args: scopeArgs,
	handler: async (ctx, args): Promise<string> => {
		const trip = await getOwnedTrip(ctx, args.ownerId, args.tripId);
		const [notes, vaultItems, documents] = await Promise.all([
			ctx.db
				.query("tripNotes")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.order("desc")
				.take(readListLimit / 2),
			ctx.db
				.query("vaultItems")
				.withIndex("by_owner_trip", (q) =>
					q.eq("ownerId", args.ownerId).eq("tripId", args.tripId)
				)
				.order("desc")
				.take(readListLimit),
			ctx.db
				.query("travelDocuments")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.take(readListLimit),
		]);

		return JSON.stringify({
			documents: documents.map((document) => ({
				expiresBeforeTripEnds: document.expiryDate
					? document.expiryDate < trip.endDate
					: undefined,
				expiryDate: document.expiryDate,
				status: document.status,
				title: document.title,
				type: document.type,
			})),
			notes: notes.map((note) => ({
				body: clip(note.body),
				category: note.category,
				title: note.title,
			})),
			vaultFiles: vaultItems.map((item) => ({
				kind: item.kind,
				linkedTo: item.linkedEntityType,
				status: item.status,
				summary: clip(item.extractedSummary),
				title: item.title,
			})),
		});
	},
});

export const getCompanions = internalQuery({
	args: scopeArgs,
	handler: async (ctx, args): Promise<string> => {
		const trip = await getOwnedTrip(ctx, args.ownerId, args.tripId);
		const companions = await ctx.db
			.query("tripCompanions")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.take(readListLimit);

		// Names and roles only: contact details never go to the model.
		return JSON.stringify({
			companions: companions.map((companion) => ({
				hasContactDetails: Boolean(companion.email || companion.phone),
				name: companion.name,
				notes: clip(companion.notes),
				role: companion.role,
			})),
			groupType: trip.groupType,
			travelerCount: trip.travelerCount ?? null,
		});
	},
});

export const getSeasonAndDestinationInfo = internalQuery({
	args: {
		...scopeArgs,
		destination: v.optional(v.string()),
		includeAlternatives: v.optional(v.boolean()),
	},
	handler: async (ctx, args): Promise<string> => {
		const trip = await getOwnedTrip(ctx, args.ownerId, args.tripId);

		return JSON.stringify(
			buildSeasonInfo({
				destination: args.destination?.trim() || trip.destination,
				endDate: trip.endDate,
				includeAlternatives: args.includeAlternatives,
				startDate: trip.startDate,
				today: getChatTodayKey(),
				travelerCount: trip.travelerCount,
			})
		);
	},
});

const proposalModuleValidator = v.union(
	v.literal("itinerary"),
	v.literal("bookings"),
	v.literal("budget"),
	v.literal("readiness"),
	v.literal("places"),
	v.literal("risks"),
	v.literal("profile")
);

const loadCommittedSpend = async (ctx: MutationCtx, trip: Doc<"trips">) => {
	const [bookings, expenses, days, items] = await Promise.all([
		ctx.db
			.query("bookings")
			.withIndex("by_trip", (q) => q.eq("tripId", trip._id))
			.collect(),
		ctx.db
			.query("expenses")
			.withIndex("by_trip", (q) => q.eq("tripId", trip._id))
			.collect(),
		ctx.db
			.query("itineraryDays")
			.withIndex("by_trip", (q) => q.eq("tripId", trip._id))
			.collect(),
		ctx.db
			.query("itineraryItems")
			.withIndex("by_trip", (q) => q.eq("tripId", trip._id))
			.collect(),
	]);

	return getBudgetWalletSummary({
		bookings,
		budgetAmount: trip.budgetAmount,
		budgetCurrency: trip.budgetCurrency,
		expenses,
		itineraryDays: days,
		itineraryItems: items,
		remainingTripDays: 1,
	}).committedSpend;
};

const emptyContextLists = {
	bookings: [],
	days: [],
	places: [],
	readinessItems: [],
	risks: [],
	stops: [],
} satisfies Partial<ProposalContext>;

/** Loads only what the module's validation needs. */
const loadProposalContext = async (
	ctx: MutationCtx,
	trip: Doc<"trips">,
	module: ProposalModule
): Promise<ProposalContext> => {
	const base: ProposalContext = {
		...emptyContextLists,
		today: getChatTodayKey(),
		trip,
	};
	if (module === "itinerary") {
		const [days, stops] = await Promise.all([
			loadDays(ctx, trip._id),
			loadStops(ctx, trip._id),
		]);

		return {
			...base,
			days: days.map((day) => ({ date: day.date, id: day._id })),
			stops: stops.map((stop) => ({
				dayId: stop.dayId,
				endTime: stop.endTime,
				id: stop._id,
				startTime: stop.startTime,
				status: stop.status,
				title: stop.title,
			})),
		};
	}

	if (module === "bookings") {
		const bookings = await ctx.db
			.query("bookings")
			.withIndex("by_trip", (q) => q.eq("tripId", trip._id))
			.collect();

		return { ...base, bookings };
	}

	if (module === "budget") {
		return { ...base, committedSpend: await loadCommittedSpend(ctx, trip) };
	}

	if (module === "readiness") {
		const readinessItems = await ctx.db
			.query("readinessItems")
			.withIndex("by_trip", (q) => q.eq("tripId", trip._id))
			.collect();

		return { ...base, readinessItems };
	}

	if (module === "places") {
		const places = await ctx.db
			.query("savedPlaces")
			.withIndex("by_trip", (q) => q.eq("tripId", trip._id))
			.collect();

		return { ...base, places };
	}

	if (module === "risks") {
		const risks = await ctx.db
			.query("risks")
			.withIndex("by_trip", (q) => q.eq("tripId", trip._id))
			.collect();

		return { ...base, risks };
	}

	return base;
};

/** A model retry with the same content returns the draft already saved. */
const findSameDraft = async (
	ctx: MutationCtx,
	tripId: Id<"trips">,
	module: ProposalModule,
	payloadJson: string
) => {
	const pending = await ctx.db
		.query("tripAgentDrafts")
		.withIndex("by_trip_status", (q) =>
			q.eq("tripId", tripId).eq("status", "draft")
		)
		.order("desc")
		.take(readListLimit);

	return pending.find(
		(draft) => draft.module === module && draft.payloadJson === payloadJson
	);
};

export type ProposeDraftResult =
	| { errors: string[]; ok: false; warnings: string[] }
	| {
			draftId: Id<"tripAgentDrafts">;
			ok: true;
			preview: string[];
			warnings: string[];
	  };

/**
 * Validates a chat draft against the trip as it is now and, only when it is
 * valid, saves it as a reviewable tripAgentDrafts row. Never touches the
 * workspace itself.
 */
export const proposeDraft = internalMutation({
	args: {
		...scopeArgs,
		module: proposalModuleValidator,
		payloadJson: v.string(),
	},
	handler: async (ctx, args): Promise<ProposeDraftResult> => {
		const trip = await getOwnedTrip(ctx, args.ownerId, args.tripId);
		let payload: TripAgentDraftPayload;

		try {
			payload = tripAgentDraftPayloadSchema.parse(JSON.parse(args.payloadJson));
		} catch {
			return {
				errors: [
					"The draft could not be read. Resend it with the tool's fields.",
				],
				ok: false,
				warnings: [],
			};
		}

		const validation = validateDraftProposal({
			context: await loadProposalContext(ctx, trip, args.module),
			module: args.module,
			payload,
		});

		if (validation.errors.length > 0) {
			return { ...validation, ok: false };
		}

		const payloadJson = JSON.stringify(payload);
		const preview = describeDraftPayload({
			module: args.module,
			payload,
			trip,
		});
		const existing = await findSameDraft(
			ctx,
			args.tripId,
			args.module,
			payloadJson
		);

		if (existing) {
			return {
				draftId: existing._id,
				ok: true,
				preview,
				warnings: validation.warnings,
			};
		}

		const now = Date.now();
		const draftId = await ctx.db.insert("tripAgentDrafts", {
			action: args.module === "itinerary" ? "refine" : "generate",
			createdAt: now,
			module: args.module,
			ownerId: args.ownerId,
			payloadJson,
			rationale: cleanString(payload.rationale, "Suggested by Viya."),
			source: "ai",
			status: "draft",
			title: cleanString(payload.title, "Viya draft"),
			tripId: args.tripId,
			updatedAt: now,
		});

		return { draftId, ok: true, preview, warnings: validation.warnings };
	},
});
