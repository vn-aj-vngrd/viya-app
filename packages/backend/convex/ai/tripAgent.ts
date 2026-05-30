// biome-ignore-all lint/style/useFilenamingConvention: Convex module names are public API paths.

import { ConvexError, v } from "convex/values";
import {
	buildItineraryDayRecords,
	buildItineraryItemRecords,
	buildSimpleDraftRecords,
	cleanString,
	type TripAgentDraftPayload,
	tripAgentDraftPayloadSchema,
} from "../../src/ai/trip-agent-draft-apply";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
	action,
	type MutationCtx,
	mutation,
	query,
} from "../_generated/server";
import {
	type AiModelPurpose,
	getLanguageModel,
	hasConfiguredAiProvider,
} from "./provider";
import { generateStructuredObject } from "./structured";

const tripAgentModuleValidator = v.union(
	v.literal("itinerary"),
	v.literal("places"),
	v.literal("bookings"),
	v.literal("documents"),
	v.literal("budget"),
	v.literal("readiness"),
	v.literal("risks"),
	v.literal("travel"),
	v.literal("recap")
);

const tripAgentActionValidator = v.union(
	v.literal("generate"),
	v.literal("refine"),
	v.literal("audit"),
	v.literal("explain")
);

interface TripAgentContext {
	contextJson: string;
	trip: {
		budgetAmount?: number;
		budgetCurrency?: string;
		destination: string;
		endDate: string;
		startDate: string;
		title: string;
	};
}

const modulePurpose = {
	bookings: "readiness",
	budget: "itinerary",
	documents: "vault",
	itinerary: "itinerary",
	places: "itinerary",
	readiness: "readiness",
	recap: "wrapped",
	risks: "risk",
	travel: "travelMode",
} as const satisfies Record<string, AiModelPurpose>;

const createFallbackDraft = ({
	module,
	trip,
}: {
	module: keyof typeof modulePurpose;
	trip: {
		budgetAmount?: number;
		budgetCurrency?: string;
		destination: string;
		endDate: string;
		startDate: string;
		title: string;
	};
}): TripAgentDraftPayload => {
	const commonChange = {
		detail: `Generated from ${trip.title} details for ${trip.destination}.`,
		title: "Review before applying",
		type: "review",
	};

	if (module === "itinerary") {
		return {
			bookingTargets: [],
			changes: [commonChange],
			days: [
				{
					date: trip.startDate,
					estimatedCost: 2500,
					items: [
						{
							aiReason:
								"Start with a light anchor activity so the day stays flexible.",
							category: "activity",
							description: "Add a first activity near the main destination.",
							durationMinutes: 120,
							endTime: "12:00",
							estimatedCost: 1500,
							locationName: trip.destination,
							priority: "high",
							startTime: "10:00",
							title: `Explore ${trip.destination}`,
						},
					],
					pace: "balanced",
					summary: "A simple first day that can be refined later.",
					theme: "Arrival and orientation",
					title: "Day 1",
					weatherNote: "Check local weather before locking outdoor plans.",
				},
			],
			moments: [],
			places: [],
			rationale: "Viya created a conservative starter itinerary.",
			readinessItems: [],
			risks: [],
			title: "Starter itinerary draft",
		};
	}

	if (module === "bookings") {
		return {
			bookingTargets: [
				{
					currency: trip.budgetCurrency ?? "PHP",
					locationName: trip.destination,
					notes:
						"Confirm dates, cancellation terms, and location before paying.",
					title: "Confirm accommodation",
					type: "hotel",
				},
			],
			changes: [commonChange],
			days: [],
			moments: [],
			places: [],
			rationale: "Viya suggested the most common booking gap first.",
			readinessItems: [],
			risks: [],
			title: "Booking targets draft",
		};
	}

	if (module === "risks") {
		return {
			bookingTargets: [],
			changes: [commonChange],
			days: [],
			moments: [],
			places: [],
			rationale: "Viya checked for planning gaps that can become travel risks.",
			readinessItems: [],
			risks: [
				{
					message:
						"The trip needs a backup plan for schedule or weather changes.",
					severity: "medium",
					suggestedAction: "Add one flexible indoor or low-transfer option.",
					title: "No backup plan saved",
					type: "schedule",
				},
			],
			title: "Risk audit draft",
		};
	}

	if (module === "budget") {
		return {
			bookingTargets: [],
			budgetAmount: trip.budgetAmount ?? 10_000,
			changes: [commonChange],
			days: [],
			moments: [],
			places: [],
			rationale: "Viya estimated a starting budget from the trip profile.",
			readinessItems: [],
			risks: [],
			title: "Budget estimate draft",
		};
	}

	if (module === "places") {
		return {
			bookingTargets: [],
			changes: [commonChange],
			days: [],
			moments: [],
			places: [
				{
					category: "area",
					description: "Main destination anchor for map planning.",
					locationName: trip.destination,
					title: trip.destination,
				},
			],
			rationale: "Viya created a map anchor from the trip destination.",
			readinessItems: [],
			risks: [],
			title: "Places draft",
		};
	}

	if (module === "recap") {
		return {
			bookingTargets: [],
			changes: [commonChange],
			days: [],
			moments: [
				{
					caption: `A memorable ${trip.destination} trip.`,
					locationName: trip.destination,
					note: "Replace this with a real highlight from the trip.",
					title: `${trip.destination} highlight`,
				},
			],
			places: [],
			rationale: "Viya started a recap moment that the traveler can refine.",
			readinessItems: [],
			risks: [],
			title: "Recap draft",
		};
	}

	return {
		bookingTargets: [],
		changes: [commonChange],
		days: [],
		moments: [],
		places: [],
		rationale:
			"Viya turned this module into concrete checklist work for review.",
		readinessItems: [
			{
				category: module === "documents" ? "documents" : "schedule",
				description:
					module === "documents"
						? "Upload or link important IDs, confirmations, tickets, and insurance."
						: "Save a backup decision before travel day.",
				dueDate: trip.startDate,
				priority: "high",
				title:
					module === "documents"
						? "Add important travel documents"
						: "Create travel-day backup plan",
			},
		],
		risks: [],
		title: module === "documents" ? "Document checklist draft" : "Travel draft",
	};
};

const buildTripAgentPrompt = ({
	action,
	contextJson,
	module,
	prompt,
}: {
	action: string;
	contextJson: string;
	module: string;
	prompt?: string;
}) =>
	[
		"You are Viya, a travel workspace agent.",
		"Generate reviewable structured draft changes for exactly one trip module.",
		"Keep the workspace model simple: Itinerary, centralized Budget, Vault for Bookings and Documents, and Readiness based on current status.",
		"For itinerary drafts, use a simple Wanderlog-style day plan with timed stops, places, meals, transfers, and concise notes.",
		"For budget drafts, centralize budget amount, booked costs, itinerary estimates, manual expenses, receipts, remaining spend, and daily safe spend.",
		"For vault or documents work, classify files as bookings or documents and create readiness gaps for missing passport, ID, ticket, confirmation, receipt, permit, or insurance coverage.",
		"For readiness work, prioritize by current trip status, dates, open checklist items, booking coverage, vault coverage, budget state, and risks.",
		"Never invent confirmed bookings, uploaded documents, live availability, weather, traffic, or paid reservations.",
		"Keep output concise. Return no more than six items per list.",
		"For documents, create readiness items only; the user must upload real files.",
		`Module: ${module}.`,
		`Action: ${action}.`,
		prompt ? `User instruction: ${prompt}` : null,
		"Current trip workspace JSON:",
		contextJson,
	]
		.filter(Boolean)
		.join("\n\n");

export const listTripAgentDrafts = query({
	args: {
		status: v.optional(
			v.union(v.literal("draft"), v.literal("applied"), v.literal("dismissed"))
		),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new ConvexError("AUTH_REQUIRED");
		}

		const trip = await ctx.db.get(args.tripId);

		if (!trip || trip.ownerId !== identity.subject) {
			throw new ConvexError("TRIP_NOT_FOUND");
		}

		const status = args.status;

		if (status) {
			return await ctx.db
				.query("tripAgentDrafts")
				.withIndex("by_trip_status", (q) =>
					q.eq("tripId", args.tripId).eq("status", status)
				)
				.collect();
		}

		const statuses = await Promise.all(
			(["draft", "applied", "dismissed"] as const).map((status) =>
				ctx.db
					.query("tripAgentDrafts")
					.withIndex("by_trip_status", (q) =>
						q.eq("tripId", args.tripId).eq("status", status)
					)
					.collect()
			)
		);

		return statuses
			.flat()
			.sort(
				(firstDraft, secondDraft) =>
					secondDraft.createdAt - firstDraft.createdAt
			);
	},
});

export const generateTripAgentDraft = action({
	args: {
		action: tripAgentActionValidator,
		module: tripAgentModuleValidator,
		prompt: v.optional(v.string()),
		tripId: v.id("trips"),
		useFallback: v.optional(v.boolean()),
	},
	handler: async (ctx, args): Promise<Doc<"tripAgentDrafts"> | null> => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new ConvexError("AUTH_REQUIRED");
		}

		const context: TripAgentContext = await ctx.runQuery(
			internal.ai.tripAgentInternals.getTripAgentContext,
			{
				ownerId: identity.subject,
				tripId: args.tripId,
			}
		);
		const fallback = createFallbackDraft({
			module: args.module,
			trip: context.trip,
		});
		const shouldUseFallback = args.useFallback || !hasConfiguredAiProvider();
		const payload: TripAgentDraftPayload = shouldUseFallback
			? fallback
			: await generateStructuredObject({
					fallback,
					model: getLanguageModel(modulePurpose[args.module]),
					prompt: buildTripAgentPrompt({
						action: args.action,
						contextJson: context.contextJson,
						module: args.module,
						prompt: args.prompt,
					}),
					schema: tripAgentDraftPayloadSchema,
					schemaName: "TripAgentDraftPayload",
				});

		return await ctx.runMutation(
			internal.ai.tripAgentInternals.saveGeneratedTripAgentDraft,
			{
				action: args.action,
				module: args.module,
				ownerId: identity.subject,
				payloadJson: JSON.stringify(payload),
				rationale: cleanString(payload.rationale, fallback.rationale),
				title: cleanString(payload.title, fallback.title),
				tripId: args.tripId,
			}
		);
	},
});

const touchTrip = async (ctx: MutationCtx, tripId: Id<"trips">) => {
	await ctx.db.patch(tripId, { updatedAt: Date.now() });
};

const getRequiredDraft = async (
	ctx: MutationCtx,
	draftId: Id<"tripAgentDrafts">,
	ownerId: string
) => {
	const draft = await ctx.db.get(draftId);

	if (!draft || draft.ownerId !== ownerId) {
		throw new ConvexError("TRIP_AGENT_DRAFT_NOT_FOUND");
	}

	return draft;
};

const parseDraftPayload = (payloadJson: string): TripAgentDraftPayload => {
	try {
		return tripAgentDraftPayloadSchema.parse(JSON.parse(payloadJson));
	} catch {
		throw new ConvexError("INVALID_TRIP_AGENT_DRAFT_PAYLOAD");
	}
};

const applyItineraryDraft = async (
	ctx: MutationCtx,
	tripId: Id<"trips">,
	payload: TripAgentDraftPayload
) => {
	const existingDayCount = (
		await ctx.db
			.query("itineraryDays")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect()
	).length;
	const dayRecords = buildItineraryDayRecords({
		existingDayCount,
		payload,
		tripId,
	});

	for (const [index, dayRecord] of dayRecords.entries()) {
		const dayId = await ctx.db.insert("itineraryDays", dayRecord);
		const day = payload.days[index];

		if (!day) {
			continue;
		}

		for (const itemRecord of buildItineraryItemRecords({
			day,
			dayId,
			tripId,
		})) {
			await ctx.db.insert("itineraryItems", itemRecord);
		}
	}
};

const applySimpleModuleDraft = async (
	ctx: MutationCtx,
	tripId: Id<"trips">,
	payload: TripAgentDraftPayload
) => {
	const records = buildSimpleDraftRecords({
		now: Date.now(),
		payload,
		tripId,
	});

	for (const booking of records.bookings) {
		await ctx.db.insert("bookings", booking);
	}

	for (const place of records.places) {
		await ctx.db.insert("savedPlaces", place);
	}

	for (const readinessItem of records.readinessItems) {
		await ctx.db.insert("readinessItems", readinessItem);
	}

	for (const risk of records.risks) {
		await ctx.db.insert("risks", risk);
	}

	for (const moment of records.moments) {
		await ctx.db.insert("moments", moment);
	}

	if (records.budgetAmount) {
		await ctx.db.patch(tripId, {
			budgetAmount: records.budgetAmount,
			updatedAt: Date.now(),
		});
	}
};

export const applyTripAgentDraft = mutation({
	args: {
		draftId: v.id("tripAgentDrafts"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new ConvexError("AUTH_REQUIRED");
		}

		const draft = await getRequiredDraft(ctx, args.draftId, identity.subject);

		if (draft.status !== "draft") {
			throw new ConvexError("TRIP_AGENT_DRAFT_ALREADY_REVIEWED");
		}

		const payload = parseDraftPayload(draft.payloadJson);

		if (draft.module === "itinerary") {
			await applyItineraryDraft(ctx, draft.tripId, payload);
		}

		await applySimpleModuleDraft(ctx, draft.tripId, payload);
		await ctx.db.patch(args.draftId, {
			status: "applied",
			updatedAt: Date.now(),
		});
		await touchTrip(ctx, draft.tripId);

		return ctx.db.get(args.draftId);
	},
});

export const dismissTripAgentDraft = mutation({
	args: {
		draftId: v.id("tripAgentDrafts"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new ConvexError("AUTH_REQUIRED");
		}

		const draft = await getRequiredDraft(ctx, args.draftId, identity.subject);

		await ctx.db.patch(args.draftId, {
			status: "dismissed",
			updatedAt: Date.now(),
		});
		await touchTrip(ctx, draft.tripId);

		return ctx.db.get(args.draftId);
	},
});
