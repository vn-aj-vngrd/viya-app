import {
	createThread,
	listUIMessages,
	saveMessage,
	syncStreams,
	vStreamArgs,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	internalAction,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { chatAgent } from "./agent";
import { buildChatModeSystemPrompt, type ChatMode } from "./ai/prompts";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";

const chatModeValidator = v.union(
	v.literal("chat"),
	v.literal("plan"),
	v.literal("trip")
);

const compactTripContext = ({
	bookings,
	documents,
	itineraryDays,
	itineraryItems,
	readinessItems,
	risks,
	trip,
	vaultItems,
}: {
	bookings: unknown[];
	documents: unknown[];
	itineraryDays: unknown[];
	itineraryItems: unknown[];
	readinessItems: unknown[];
	risks: unknown[];
	trip: unknown;
	vaultItems: unknown[];
}) =>
	JSON.stringify({
		bookings,
		documents,
		itineraryDays,
		itineraryItems,
		readinessItems,
		risks,
		trip,
		vaultItems,
	});

export const createNewThread = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await getRequiredIdentity(ctx);
		const threadId = await createThread(ctx, components.agent, {
			userId: identity.subject,
		});
		return threadId;
	},
});

export const listMessages = query({
	args: {
		threadId: v.string(),
		paginationOpts: paginationOptsValidator,
		streamArgs: vStreamArgs,
	},
	handler: async (ctx, args) => {
		await getRequiredIdentity(ctx);
		const paginated = await listUIMessages(ctx, components.agent, args);
		const streams = await syncStreams(ctx, components.agent, args);
		return { ...paginated, streams };
	},
});

export const sendMessage = mutation({
	args: {
		threadId: v.string(),
		prompt: v.string(),
		mode: chatModeValidator,
		tripId: v.optional(v.id("trips")),
	},
	handler: async (ctx, { mode, prompt, threadId, tripId }) => {
		const identity = await getRequiredIdentity(ctx);

		if (mode === "trip") {
			if (!tripId) {
				throw new ConvexError("TRIP_CONTEXT_REQUIRED");
			}

			await ensureTripAccess(ctx, tripId, identity.subject);
		}

		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId,
			prompt,
		});
		await ctx.scheduler.runAfter(0, internal.chat.generateResponseAsync, {
			mode,
			ownerId: identity.subject,
			threadId,
			tripId,
			promptMessageId: messageId,
		});
		return messageId;
	},
});

export const getTripChatContext = internalQuery({
	args: {
		ownerId: v.string(),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const trip = await ctx.db.get(args.tripId);

		if (!trip || trip.ownerId !== args.ownerId) {
			throw new ConvexError("TRIP_NOT_FOUND");
		}

		const [
			itineraryDays,
			itineraryItems,
			readinessItems,
			risks,
			vaultItems,
			documents,
			bookings,
		] = await Promise.all([
			ctx.db
				.query("itineraryDays")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("itineraryItems")
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
				.query("vaultItems")
				.withIndex("by_owner_trip", (q) =>
					q.eq("ownerId", args.ownerId).eq("tripId", args.tripId)
				)
				.collect(),
			ctx.db
				.query("travelDocuments")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("bookings")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
		]);

		return compactTripContext({
			bookings: bookings.map((booking) => ({
				cost: booking.cost,
				currency: booking.currency,
				endDateTime: booking.endDateTime,
				locationName: booking.locationName,
				provider: booking.provider,
				startDateTime: booking.startDateTime,
				status: booking.status,
				title: booking.title,
				type: booking.type,
			})),
			documents: documents.map((document) => ({
				expiryDate: document.expiryDate,
				notes: document.notes,
				status: document.status,
				title: document.title,
				type: document.type,
			})),
			itineraryDays: itineraryDays.map((day) => ({
				date: day.date,
				dayNumber: day.dayNumber,
				pace: day.pace,
				summary: day.summary,
				title: day.title,
				weatherNote: day.weatherNote,
			})),
			itineraryItems: itineraryItems.map((item) => ({
				category: item.category,
				dayId: item.dayId,
				durationMinutes: item.durationMinutes,
				endTime: item.endTime,
				locationName: item.locationName,
				priority: item.priority,
				startTime: item.startTime,
				status: item.status,
				title: item.title,
			})),
			readinessItems: readinessItems.map((item) => ({
				category: item.category,
				description: item.description,
				dueDate: item.dueDate,
				priority: item.priority,
				status: item.status,
				title: item.title,
			})),
			risks: risks.map((risk) => ({
				message: risk.message,
				severity: risk.severity,
				status: risk.status,
				suggestedAction: risk.suggestedAction,
				title: risk.title,
				type: risk.type,
			})),
			trip: {
				arrivalTime: trip.arrivalTime,
				budgetAmount: trip.budgetAmount,
				budgetCurrency: trip.budgetCurrency,
				departureTime: trip.departureTime,
				destination: trip.destination,
				endDate: trip.endDate,
				groupType: trip.groupType,
				pace: trip.pace,
				readinessScore: trip.readinessScore,
				startDate: trip.startDate,
				status: trip.status,
				summary: trip.summary,
				title: trip.title,
				travelStyle: trip.travelStyle,
			},
			vaultItems: vaultItems.map((item) => ({
				extractedSummary: item.extractedSummary,
				kind: item.kind,
				note: item.note,
				status: item.status,
				title: item.title,
			})),
		});
	},
});

export const generateResponseAsync = internalAction({
	args: {
		threadId: v.string(),
		promptMessageId: v.string(),
		mode: chatModeValidator,
		ownerId: v.string(),
		tripId: v.optional(v.id("trips")),
	},
	handler: async (
		ctx,
		{ mode, ownerId, promptMessageId, threadId, tripId }
	) => {
		const tripContext =
			mode === "trip" && tripId
				? await ctx.runQuery(internal.chat.getTripChatContext, {
						ownerId,
						tripId: tripId as Id<"trips">,
					})
				: undefined;

		await chatAgent.streamText(
			ctx,
			{ threadId },
			{
				promptMessageId,
				system: buildChatModeSystemPrompt(mode as ChatMode, tripContext),
			},
			{ saveStreamDeltas: true }
		);
	},
});
