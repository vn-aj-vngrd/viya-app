// biome-ignore-all lint/style/useFilenamingConvention: Convex module names are public API paths.

import { createTool, type ToolCtx } from "@convex-dev/agent";
import { z } from "zod";

import {
	cleanString,
	tripAgentDraftPayloadSchema,
} from "../../src/ai/trip-agent-draft-apply";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/** Cap on model tool-call rounds per chat reply. */
export const CHAT_MAX_STEPS = 5;

const draftSchema = tripAgentDraftPayloadSchema;
const draftTitleArgs = {
	rationale: z.string().describe("One or two sentences on why."),
	title: z.string().describe("Short draft title, e.g. 'Add a rain backup'."),
};
const draftSavedMessage =
	"Saved as a draft for the traveler to review in the trip's drafts. Nothing was applied. Tell the user a draft is ready to review.";

interface ChatToolScope {
	ownerId: string;
	tripId: Id<"trips">;
}

/**
 * Tools for the trip chat agent. Every tool is bound to one owner and trip by
 * closure (never by model input). Read tools return trip data; write tools only
 * insert reviewable tripAgentDrafts rows. Nothing is applied from chat.
 */
export const buildTripChatTools = ({ ownerId, tripId }: ChatToolScope) => {
	const scope = { ownerId, tripId };
	const saveDraft = async (
		ctx: ToolCtx,
		{
			action = "generate",
			module,
			payload,
		}: {
			action?: "generate" | "refine";
			module:
				| "itinerary"
				| "places"
				| "bookings"
				| "readiness"
				| "risks"
				| "budget";
			payload: unknown;
		}
	) => {
		const parsed = draftSchema.parse(payload);
		const draft = await ctx.runMutation(
			internal.ai.tripAgentInternals.saveGeneratedTripAgentDraft,
			{
				action,
				module,
				ownerId: scope.ownerId,
				payloadJson: JSON.stringify(parsed),
				rationale: cleanString(parsed.rationale, "Suggested by Viya."),
				source: "ai",
				title: cleanString(parsed.title, "Viya draft"),
				tripId: scope.tripId,
			}
		);

		return { draftId: draft?._id, message: draftSavedMessage };
	};

	return {
		getBookings: createTool({
			args: z.object({}),
			description:
				"Read this trip's bookings (flights, stays, activities) with status and cost.",
			handler: (ctx) =>
				ctx.runQuery(internal.ai.chatToolsInternals.getBookings, scope),
		}),
		getBudgetSummary: createTool({
			args: z.object({}),
			description:
				"Read this trip's budget: amount, spent, planned, remaining and daily safe spend.",
			handler: (ctx) =>
				ctx.runQuery(internal.ai.chatToolsInternals.getBudgetSummary, scope),
		}),
		getItinerary: createTool({
			args: z.object({
				date: z
					.string()
					.optional()
					.describe("Optional YYYY-MM-DD to read a single day."),
			}),
			description: "Read this trip's itinerary days and timed stops.",
			handler: (ctx, input) =>
				ctx.runQuery(internal.ai.chatToolsInternals.getItinerary, {
					...scope,
					date: input.date,
				}),
		}),
		getReadiness: createTool({
			args: z.object({}),
			description:
				"Read this trip's readiness checklist, score and open risks.",
			handler: (ctx) =>
				ctx.runQuery(internal.ai.chatToolsInternals.getReadiness, scope),
		}),
		proposeBookingTargets: createTool({
			args: z.object({
				...draftTitleArgs,
				bookingTargets: draftSchema.shape.bookingTargets,
			}),
			description:
				"Draft booking targets (things to book) for review. Never claims a booking is confirmed.",
			handler: (ctx, input) =>
				saveDraft(ctx, { module: "bookings", payload: input }),
		}),
		proposeBudget: createTool({
			args: z.object({
				...draftTitleArgs,
				budgetAmount: z.number().positive(),
			}),
			description:
				"Draft a new total trip budget amount. It replaces the current budget only if the traveler applies it.",
			handler: (ctx, input) =>
				saveDraft(ctx, { module: "budget", payload: input }),
		}),
		proposeItineraryChanges: createTool({
			args: z.object({
				...draftTitleArgs,
				action: z.enum(["generate", "refine"]),
				days: draftSchema.shape.days,
			}),
			description:
				"Draft itinerary days and timed stops (ISO dates inside the trip, HH:MM times). Reuse an existing stop's title to change it. Saved for review only.",
			handler: (ctx, input) =>
				saveDraft(ctx, {
					action: input.action,
					module: "itinerary",
					payload: input,
				}),
		}),
		proposePlaces: createTool({
			args: z.object({
				...draftTitleArgs,
				places: draftSchema.shape.places,
			}),
			description: "Draft places to save to the trip map, for review.",
			handler: (ctx, input) =>
				saveDraft(ctx, { module: "places", payload: input }),
		}),
		proposeReadinessItems: createTool({
			args: z.object({
				...draftTitleArgs,
				readinessItems: draftSchema.shape.readinessItems,
			}),
			description: "Draft readiness checklist tasks, for review.",
			handler: (ctx, input) =>
				saveDraft(ctx, { module: "readiness", payload: input }),
		}),
		proposeRisks: createTool({
			args: z.object({
				...draftTitleArgs,
				risks: draftSchema.shape.risks,
			}),
			description: "Draft risks to track with a suggested action, for review.",
			handler: (ctx, input) =>
				saveDraft(ctx, { module: "risks", payload: input }),
		}),
	};
};
