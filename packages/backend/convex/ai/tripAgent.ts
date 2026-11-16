// biome-ignore-all lint/style/useFilenamingConvention: Convex module names are public API paths.

import { ConvexError, v } from "convex/values";
import {
	buildSimpleDraftRecords,
	cleanString,
	describeBudgetChange,
	isDraftStale,
	planItineraryMerge,
	summarizeApply,
	type TripAgentDraftPayload,
	type TripAgentDraftSource,
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
		type: "review" as const,
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
							priority: "required",
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
		"Keep output concise. Return no more than six items per list and no more than eight timed stops per day.",
		"Use ISO dates (YYYY-MM-DD) inside the trip dates and 24-hour HH:MM times. Reuse existing titles when refining so matching items are updated instead of duplicated.",
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
		const shouldUseFallback = args.useFallback === true;

		if (!(shouldUseFallback || hasConfiguredAiProvider())) {
			throw new ConvexError("AI_NOT_CONFIGURED");
		}

		const source: TripAgentDraftSource = shouldUseFallback ? "fallback" : "ai";
		const generated: TripAgentDraftPayload = shouldUseFallback
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
					strict: true,
				});
		const budgetChange = describeBudgetChange({
			currency: context.trip.budgetCurrency,
			current: context.trip.budgetAmount,
			next: generated.budgetAmount,
		});
		const payload: TripAgentDraftPayload = budgetChange
			? {
					...generated,
					changes: [
						...generated.changes,
						{
							detail: `This replaces the current trip budget: ${budgetChange}.`,
							title: "Budget will change",
							type: "budget",
						},
					],
				}
			: generated;

		return await ctx.runMutation(
			internal.ai.tripAgentInternals.saveGeneratedTripAgentDraft,
			{
				action: args.action,
				module: args.module,
				ownerId: identity.subject,
				payloadJson: JSON.stringify(payload),
				rationale: cleanString(payload.rationale, fallback.rationale),
				source,
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

interface ApplyCounts {
	added: number;
	skippedDuplicates: number;
	skippedOutOfRange: number;
	updated: number;
}

const applyItineraryDraft = async (
	ctx: MutationCtx,
	trip: Doc<"trips">,
	action: Doc<"tripAgentDrafts">["action"],
	payload: TripAgentDraftPayload
): Promise<ApplyCounts> => {
	const tripId = trip._id;
	const [existingDays, existingItems] = await Promise.all([
		ctx.db
			.query("itineraryDays")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("itineraryItems")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
	]);
	const plan = planItineraryMerge({
		action,
		existingDays: existingDays.map((day) => ({
			date: day.date,
			dayNumber: day.dayNumber,
			id: day._id,
		})),
		existingItems: existingItems.map((item) => ({
			dayId: item.dayId,
			id: item._id,
			startTime: item.startTime,
			title: item.title,
		})),
		payload,
		trip,
	});
	const newDayIds = new Map<string, Id<"itineraryDays">>();

	for (const newDay of plan.newDays) {
		newDayIds.set(
			newDay.date,
			await ctx.db.insert("itineraryDays", { ...newDay, tripId })
		);
	}

	for (const insert of plan.itemInserts) {
		const dayId =
			"existingId" in insert.day
				? insert.day.existingId
				: newDayIds.get(insert.day.createDate);

		if (!dayId) {
			continue;
		}

		await ctx.db.insert("itineraryItems", {
			...insert.fields,
			address: "",
			dayId,
			status: "planned",
			tripId,
		});
	}

	for (const update of plan.itemUpdates) {
		await ctx.db.patch(update.id, update.fields);
	}

	return {
		added: plan.itemInserts.length,
		skippedDuplicates: plan.skippedDuplicates,
		skippedOutOfRange: plan.skippedOutOfRange,
		updated: plan.itemUpdates.length,
	};
};

const applySimpleModuleDraft = async (
	ctx: MutationCtx,
	trip: Doc<"trips">,
	payload: TripAgentDraftPayload
): Promise<{ added: number; budgetChange: string | null; skipped: number }> => {
	const tripId = trip._id;
	const [bookings, places, readinessItems, risks, moments] = await Promise.all([
		ctx.db
			.query("bookings")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("savedPlaces")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("readinessItems")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("risks")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
		ctx.db
			.query("moments")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect(),
	]);
	const records = buildSimpleDraftRecords({
		existing: { bookings, moments, places, readinessItems, risks },
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

	const budgetChange = describeBudgetChange({
		currency: trip.budgetCurrency,
		current: trip.budgetAmount,
		next: records.budgetAmount,
	});

	if (records.budgetAmount && budgetChange) {
		await ctx.db.patch(tripId, {
			budgetAmount: records.budgetAmount,
			updatedAt: Date.now(),
		});
	}

	const requested =
		Math.min(payload.bookingTargets.length, 6) +
		Math.min(payload.places.length, 6) +
		Math.min(payload.readinessItems.length, 6) +
		Math.min(payload.risks.length, 6) +
		Math.min(payload.moments.length, 6);
	const added =
		records.bookings.length +
		records.places.length +
		records.readinessItems.length +
		records.risks.length +
		records.moments.length;

	return { added, budgetChange, skipped: Math.max(0, requested - added) };
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

		const trip = await ctx.db.get(draft.tripId);

		if (!trip || trip.ownerId !== identity.subject) {
			throw new ConvexError("TRIP_NOT_FOUND");
		}

		const payload = parseDraftPayload(draft.payloadJson);
		const siblingDrafts = await ctx.db
			.query("tripAgentDrafts")
			.withIndex("by_trip_status", (q) =>
				q.eq("tripId", draft.tripId).eq("status", "applied")
			)
			.collect();
		const lastDraftAppliedAt = siblingDrafts.reduce<number | undefined>(
			(latest, sibling) =>
				latest === undefined || sibling.updatedAt > latest
					? sibling.updatedAt
					: latest,
			undefined
		);
		const itineraryCounts: ApplyCounts =
			draft.module === "itinerary"
				? await applyItineraryDraft(ctx, trip, draft.action, payload)
				: { added: 0, skippedDuplicates: 0, skippedOutOfRange: 0, updated: 0 };
		// An itinerary draft only changes the itinerary; other records it might
		// carry are ignored so one module's draft can't write into another's.
		const simple =
			draft.module === "itinerary"
				? { added: 0, budgetChange: null, skipped: 0 }
				: await applySimpleModuleDraft(ctx, trip, payload);

		await ctx.db.patch(args.draftId, {
			applySummary: summarizeApply({
				added: itineraryCounts.added + simple.added,
				budgetChange: simple.budgetChange,
				isStale: isDraftStale({
					draftCreatedAt: draft.createdAt,
					lastDraftAppliedAt,
					tripUpdatedAt: trip.updatedAt,
				}),
				skippedDuplicates: itineraryCounts.skippedDuplicates + simple.skipped,
				skippedOutOfRange: itineraryCounts.skippedOutOfRange,
				updated: itineraryCounts.updated,
			}),
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

		await getRequiredDraft(ctx, args.draftId, identity.subject);

		await ctx.db.patch(args.draftId, {
			status: "dismissed",
			updatedAt: Date.now(),
		});

		return ctx.db.get(args.draftId);
	},
});
