// biome-ignore-all lint/style/useFilenamingConvention: Convex module names are public API paths.

import { createTool, type ToolCtx } from "@convex-dev/agent";
import { ConvexError } from "convex/values";
import { z } from "zod";

import type { TripAgentDraftPayload } from "../../src/ai/trip-agent-draft-apply";
import type { ProposalModule } from "../../src/ai/trip-agent-draft-validation";
import {
	bookingProposalInput,
	budgetProposalInput,
	itineraryProposalInput,
	placesProposalInput,
	profileProposalInput,
	readinessProposalInput,
	risksProposalInput,
	toBookingPayload,
	toBudgetPayload,
	toItineraryPayload,
	toPlacesPayload,
	toProfilePayload,
	toReadinessPayload,
	toRisksPayload,
} from "../../src/ai/trip-chat-tool-inputs";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ProposeDraftResult } from "./chatToolsInternals";

/**
 * Cap on model steps per chat reply. A step can call several tools at once;
 * the last step is forced to answer in text (see chat.ts prepareStep).
 */
export const CHAT_MAX_STEPS = 8;

const draftSavedMessage =
	"Saved as a draft for the traveler to review in the trip's Drafts. Nothing is applied yet. Tell the user in one or two short lines what the draft contains (use preview), mention any warnings, and say it is ready to review.";
const draftRejectedMessage =
	"Not saved. Fix every error and call the same tool again. If a fix needs a decision only the user can make, ask one short question instead.";

interface ChatToolScope {
	ownerId: string;
	tripId: Id<"trips">;
}

const describeError = (error: unknown) => {
	if (error instanceof ConvexError) {
		return String(error.data);
	}

	return error instanceof Error ? error.message : "Unknown error";
};

/** A failing read returns an explanation the model can pass on, not silence. */
const safeRead = async (read: () => Promise<string>) => {
	try {
		return await read();
	} catch (error) {
		return JSON.stringify({
			error: `Could not read this part of the trip (${describeError(error)}). Answer from the trip context you already have and say this part could not be checked.`,
		});
	}
};

const noArgs = z.object({});

/**
 * Tools for the trip chat agent. Every tool is bound to one owner and trip by
 * closure (never by model input) and the internal functions re-check trip
 * ownership. Read tools return compact trip data with ids; propose tools only
 * validate and save reviewable tripAgentDrafts rows. Nothing is applied from
 * chat: the traveler applies drafts in the Drafts sheet.
 */
export const buildTripChatTools = ({ ownerId, tripId }: ChatToolScope) => {
	const scope = { ownerId, tripId };
	const propose = async (
		ctx: ToolCtx,
		module: ProposalModule,
		buildPayload: () => TripAgentDraftPayload
	) => {
		try {
			const result: ProposeDraftResult = await ctx.runMutation(
				internal.ai.chatToolsInternals.proposeDraft,
				{ ...scope, module, payloadJson: JSON.stringify(buildPayload()) }
			);

			return result.ok
				? { ...result, message: draftSavedMessage }
				: { ...result, message: draftRejectedMessage };
		} catch (error) {
			return {
				errors: [describeError(error)],
				message:
					"The draft could not be saved because of a server problem. Nothing changed. Tell the user and suggest trying again.",
				ok: false as const,
				warnings: [],
			};
		}
	};

	return {
		getBookings: createTool({
			args: noArgs,
			description:
				"Read the trip's bookings (flights, stays, activities, transport) with bookingId, status (target, missing, confirmed, bookedExternally, cancelled), dates and cost. Use before proposing booking targets.",
			handler: (ctx) =>
				safeRead(() =>
					ctx.runQuery(internal.ai.chatToolsInternals.getBookings, scope)
				),
		}),
		getBudgetSummary: createTool({
			args: noArgs,
			description:
				"Read the trip budget: total, confirmed booking costs, manual expenses, planned itinerary costs, amount left, amount over, daily safe spend and top categories.",
			handler: (ctx) =>
				safeRead(() =>
					ctx.runQuery(internal.ai.chatToolsInternals.getBudgetSummary, scope)
				),
		}),
		getCompanions: createTool({
			args: noArgs,
			description:
				"Read who is on the trip: companion names, roles and notes (no contact details), group type and traveler count.",
			handler: (ctx) =>
				safeRead(() =>
					ctx.runQuery(internal.ai.chatToolsInternals.getCompanions, scope)
				),
		}),
		getItinerary: createTool({
			args: z.object({
				date: z
					.string()
					.optional()
					.describe("Optional YYYY-MM-DD to read one day; omit for all days."),
			}),
			description:
				"Read the itinerary by day: dayId, date, dayNumber and timed stops with stopId, start/end (HH:MM), category, location and status, plus any overlaps already in a day. Call this before changing, moving or removing stops; use the stopIds it returns.",
			handler: (ctx, input) =>
				safeRead(() =>
					ctx.runQuery(internal.ai.chatToolsInternals.getItinerary, {
						...scope,
						date: input.date,
					})
				),
		}),
		getNotesAndVault: createTool({
			args: noArgs,
			description:
				"Read trip notes, Vault files (tickets, IDs, confirmations, receipts) with extracted summaries, and travel documents with expiry dates.",
			handler: (ctx) =>
				safeRead(() =>
					ctx.runQuery(internal.ai.chatToolsInternals.getNotesAndVault, scope)
				),
		}),
		getReadiness: createTool({
			args: noArgs,
			description:
				"Read the readiness checklist (taskId, title, category, status, priority, due date), the readiness percent and required categories with no task yet.",
			handler: (ctx) =>
				safeRead(() =>
					ctx.runQuery(internal.ai.chatToolsInternals.getReadiness, scope)
				),
		}),
		getRisks: createTool({
			args: noArgs,
			description:
				"Read tracked trip risks (riskId, title, type, severity, status, suggested action), most urgent first.",
			handler: (ctx) =>
				safeRead(() =>
					ctx.runQuery(internal.ai.chatToolsInternals.getRisks, scope)
				),
		}),
		getSavedPlaces: createTool({
			args: noArgs,
			description:
				"Read places saved to the trip map (placeId, title, category, location, assigned day).",
			handler: (ctx) =>
				safeRead(() =>
					ctx.runQuery(internal.ai.chatToolsInternals.getSavedPlaces, scope)
				),
		}),
		getSeasonAndDestinationInfo: createTool({
			args: z.object({
				destination: z
					.string()
					.optional()
					.describe(
						"Another Philippine destination to check for the same dates; omit for the trip's destination."
					),
				includeAlternatives: z
					.boolean()
					.optional()
					.describe(
						"True to also get up to 3 Philippine destinations that suit these dates better."
					),
			}),
			description:
				"Read typical season, rain and typhoon risk for the trip dates, best and avoid months, how to get there, typical daily costs per person and local events. These are typical patterns, not a live forecast.",
			handler: (ctx, input) =>
				safeRead(() =>
					ctx.runQuery(
						internal.ai.chatToolsInternals.getSeasonAndDestinationInfo,
						{
							...scope,
							destination: input.destination,
							includeAlternatives: input.includeAlternatives,
						}
					)
				),
		}),
		getTripOverview: createTool({
			args: noArgs,
			description:
				"Read the trip profile first: title, destination, dates, day count, arrival/departure times, travelers, pace, budget, today's date in Manila, trip phase, item counts, readiness percent, season headline and drafts already waiting for review.",
			handler: (ctx) =>
				safeRead(() =>
					ctx.runQuery(internal.ai.chatToolsInternals.getTripOverview, scope)
				),
		}),
		proposeBookingTargets: createTool({
			args: bookingProposalInput,
			description:
				"Draft things the traveler still needs to book, saved as targets for review. Never marks anything confirmed or paid. Costs are estimates.",
			handler: (ctx, input) =>
				propose(ctx, "bookings", () => toBookingPayload(input)),
		}),
		proposeBudget: createTool({
			args: budgetProposalInput,
			description:
				"Draft a new total trip budget. It replaces the current budget only if the traveler applies it. Read getBudgetSummary first.",
			handler: (ctx, input) =>
				propose(ctx, "budget", () => toBudgetPayload(input)),
		}),
		proposeItineraryChanges: createTool({
			args: itineraryProposalInput,
			description:
				"Draft itinerary changes for review: add stops to days, change or move existing stops (pass stopId), or remove stops (removeStopIds). Dates must be inside the trip, times HH:MM with end after start, and stops must not overlap. If the result has errors, fix them and call again.",
			handler: (ctx, input) =>
				propose(ctx, "itinerary", () => toItineraryPayload(input)),
		}),
		proposePlaces: createTool({
			args: placesProposalInput,
			description: "Draft places to save to the trip map, for review.",
			handler: (ctx, input) =>
				propose(ctx, "places", () => toPlacesPayload(input)),
		}),
		proposeReadinessItems: createTool({
			args: readinessProposalInput,
			description:
				"Draft readiness checklist tasks (documents, packing, bookings, weather, safety, backup plans), for review.",
			handler: (ctx, input) =>
				propose(ctx, "readiness", () => toReadinessPayload(input)),
		}),
		proposeRisks: createTool({
			args: risksProposalInput,
			description:
				"Draft risks to track (weather, typhoon, schedule, transport, budget, safety) with a suggested action, for review.",
			handler: (ctx, input) =>
				propose(ctx, "risks", () => toRisksPayload(input)),
		}),
		proposeTripProfileChanges: createTool({
			args: profileProposalInput,
			description:
				"Draft changes to the trip profile: dates, arrival/departure times, traveler count, group, pace, destination, summary or trip name. Send only fields that change. Itinerary days move with new dates when applied.",
			handler: (ctx, input) =>
				propose(ctx, "profile", () => toProfilePayload(input)),
		}),
	};
};
