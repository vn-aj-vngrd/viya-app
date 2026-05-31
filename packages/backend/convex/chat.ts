import {
	createThread,
	listUIMessages,
	saveMessage,
	syncStreams,
	vStreamArgs,
} from "@convex-dev/agent";
import { formatPreferenceContext } from "@viya-app/domain";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	internalAction,
	internalMutation,
	internalQuery,
	type MutationCtx,
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
const normalizeChatMode = (mode: ChatMode): ChatMode => mode;

const maxHistoryItems = 50;
const maxPromptLength = 1200;
const maxPromptLines = 12;
const maxQuestionOptions = 4;
const recentMessageLookupCount = 10;
const titleMaxLength = 72;
const previewMaxLength = 140;
const questionMarkerPattern = /\**question\s+(\d+)\s*\/\s*(\d+)\**[:\s\-–—]*/i;
const numberedOptionPattern = /^\s*(?:[-*]\s*)?\**(\d+)[.)]\**\s+(.+?)\s*$/;
const markdownEmphasisPattern = /[*_`]/g;
const leadingQuestionPrefixPattern = /^[-:>\s]+/;
const terminalPunctuationPattern = /[.!?]+$/;
const typeSomethingElsePattern =
	/^(?:type\s+)?(?:something\s+else|other|custom answer)$/i;
const lineBreakPattern = /\r\n|\r|\n/g;
const spendIntentPattern = /\b(?:i\s+)?(?:spent|paid|bought|purchased)\b/i;
const spendAmountPattern =
	/(?:₱|PHP\s*)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:php|pesos?)?/i;
const spendTitleAfterConnectorPattern =
	/\b(?:on|for)\s+(.+?)(?:\s+(?:for|at)\s+(?:₱|PHP\s*)?[0-9]|$)/i;
const spendTitleBeforeAmountPattern =
	/\b(?:spent|paid|bought|purchased)\s+(.+?)\s+(?:for|at)?\s*(?:₱|PHP\s*)?[0-9]/i;
const foodExpensePattern =
	/\b(?:breakfast|brunch|lunch|dinner|meal|coffee|food|restaurant|snack|drink)\b/i;
const hotelExpensePattern =
	/\b(?:hotel|hostel|stay|accommodation|airbnb|lodging)\b/i;
const shoppingExpensePattern = /\b(?:shopping|souvenir|gift|mall)\b/i;
const transportExpensePattern =
	/\b(?:taxi|grab|uber|train|bus|ferry|flight|transport|transfer|fare|gas|fuel)\b/i;
const documentExpensePattern =
	/\b(?:passport|visa|permit|document|insurance)\b/i;

const getPromptSnippet = (prompt: string, maxLength: number) => {
	const normalizedPrompt = prompt.replace(/\s+/g, " ").trim();

	if (normalizedPrompt.length <= maxLength) {
		return normalizedPrompt;
	}

	return `${normalizedPrompt.slice(0, maxLength - 1)}...`;
};

const cleanQuestionText = (value: string) =>
	value
		.replace(questionMarkerPattern, "")
		.replace(markdownEmphasisPattern, "")
		.replace(leadingQuestionPrefixPattern, "")
		.trim();

const cleanOptionText = (value: string) =>
	value
		.replace(markdownEmphasisPattern, "")
		.replace(terminalPunctuationPattern, "")
		.trim();

const extractQuestionPrompt = (text: string) => {
	const lines = text
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	const markerIndex = lines.findIndex((line) =>
		questionMarkerPattern.test(line)
	);
	const markerMatch =
		markerIndex >= 0 ? questionMarkerPattern.exec(lines[markerIndex]) : null;
	const optionRows = lines
		.map((line, index) => {
			const match = numberedOptionPattern.exec(line);

			if (!match) {
				return null;
			}

			const label = cleanOptionText(match[2]);

			if (!label || typeSomethingElsePattern.test(label.toLowerCase())) {
				return null;
			}

			return { index, label };
		})
		.filter((row) => row !== null);

	if (optionRows.length < 2) {
		return null;
	}

	const firstOptionIndex = optionRows[0].index;
	const markerLineQuestion =
		markerIndex >= 0 ? cleanQuestionText(lines[markerIndex]) : null;
	const questionCandidates = lines
		.slice(Math.max(markerIndex + 1, 0), firstOptionIndex)
		.map(cleanQuestionText)
		.filter((line) => line.includes("?"));
	const fallbackCandidates = lines
		.slice(0, firstOptionIndex)
		.map(cleanQuestionText)
		.filter((line) => line.includes("?"));
	const [questionCandidate] = [...questionCandidates].reverse();
	const [fallbackCandidate] = [...fallbackCandidates].reverse();
	const question =
		questionCandidate ??
		(markerLineQuestion?.includes("?") ? markerLineQuestion : null) ??
		fallbackCandidate ??
		null;

	if (!question) {
		return null;
	}

	return {
		options: optionRows.slice(0, maxQuestionOptions).map((option, index) => ({
			id: `option-${index + 1}`,
			label: option.label,
			value: option.label,
		})),
		question,
		stepLabel: markerMatch
			? `Question ${markerMatch[1]}/${markerMatch[2]}`
			: undefined,
	};
};

const clearPendingQuestionsForThread = async (
	ctx: MutationCtx,
	{
		answerText,
		ownerId,
		threadId,
	}: {
		answerText?: string;
		ownerId: string;
		threadId: string;
	}
) => {
	const pendingQuestions = await ctx.db
		.query("chatQuestionPrompts")
		.withIndex("by_owner_thread_status_updatedAt", (q) =>
			q.eq("ownerId", ownerId).eq("threadId", threadId).eq("status", "pending")
		)
		.take(10);
	const now = Date.now();

	for (const question of pendingQuestions) {
		await ctx.db.patch(question._id, {
			answeredAt: now,
			answerText,
			status: "answered",
			updatedAt: now,
		});
	}
};

const compactTripContext = ({
	bookings,
	documents,
	expenses,
	itineraryDays,
	itineraryItems,
	readinessItems,
	risks,
	trip,
	vaultItems,
}: {
	bookings: unknown[];
	documents: unknown[];
	expenses: unknown[];
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
		expenses,
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

const getExpenseCategory = (title: string) => {
	if (foodExpensePattern.test(title)) {
		return "food";
	}

	if (hotelExpensePattern.test(title)) {
		return "hotel";
	}

	if (shoppingExpensePattern.test(title)) {
		return "shopping";
	}

	if (transportExpensePattern.test(title)) {
		return "transport";
	}

	if (documentExpensePattern.test(title)) {
		return "documents";
	}

	return "other";
};

const cleanExpenseTitle = (value: string) => {
	const title = value
		.replace(/[.!?]+$/g, "")
		.replace(/\s+/g, " ")
		.trim();

	if (!title) {
		return "Trip expense";
	}

	return `${title.charAt(0).toUpperCase()}${title.slice(1)}`;
};

const getExpenseTitleFromPrompt = (prompt: string) => {
	const titleAfterConnector = spendTitleAfterConnectorPattern.exec(prompt)?.[1];

	if (titleAfterConnector) {
		return cleanExpenseTitle(titleAfterConnector);
	}

	const titleBeforeAmount = spendTitleBeforeAmountPattern.exec(prompt)?.[1];

	if (titleBeforeAmount && !spendAmountPattern.test(titleBeforeAmount)) {
		return cleanExpenseTitle(titleBeforeAmount);
	}

	return "Trip expense";
};

const getSpendExpenseDraft = (prompt: string) => {
	if (!spendIntentPattern.test(prompt)) {
		return null;
	}

	const amountMatch = spendAmountPattern.exec(prompt);
	const amount = amountMatch
		? Number.parseFloat(amountMatch[1].replaceAll(",", ""))
		: Number.NaN;

	if (!(Number.isFinite(amount) && amount > 0)) {
		return null;
	}

	const title = getExpenseTitleFromPrompt(prompt);

	return {
		amount,
		category: getExpenseCategory(title),
		currency: "PHP",
		notes: "Logged from Viya chat.",
		spentAt: new Date().toISOString().slice(0, 10),
		title,
	};
};

const maybeLogTripChatExpense = async (
	ctx: MutationCtx,
	{
		prompt,
		tripId,
	}: {
		prompt: string;
		tripId: Id<"trips">;
	}
) => {
	const expense = getSpendExpenseDraft(prompt);

	if (!expense) {
		return null;
	}

	const now = Date.now();
	const expenseId = await ctx.db.insert("expenses", {
		...expense,
		createdAt: now,
		source: "manual" as const,
		tripId,
		updatedAt: now,
	});
	await ctx.db.patch(tripId, { updatedAt: now });

	return expenseId;
};

export const listHistory = query({
	args: {
		limit: v.optional(v.number()),
		mode: v.optional(chatModeValidator),
		tripId: v.optional(v.id("trips")),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const limit = Math.max(
			1,
			Math.min(args.limit ?? maxHistoryItems, maxHistoryItems)
		);
		const threads = (
			await ctx.db
				.query("chatThreads")
				.withIndex("by_owner_updatedAt", (q) =>
					q.eq("ownerId", identity.subject)
				)
				.order("desc")
				.collect()
		)
			.filter((thread) => {
				const normalizedMode = normalizeChatMode(thread.mode);

				if (args.mode && normalizedMode !== args.mode) {
					return false;
				}

				if (args.tripId && thread.tripId !== args.tripId) {
					return false;
				}

				return true;
			})
			.slice(0, limit);

		return await Promise.all(
			threads.map(async (thread) => {
				const trip = thread.tripId ? await ctx.db.get(thread.tripId) : null;

				return {
					_id: thread._id,
					createdAt: thread.createdAt,
					messageCount: thread.messageCount,
					mode: normalizeChatMode(thread.mode),
					preview: thread.preview ?? null,
					threadId: thread.threadId,
					title: thread.title,
					tripDestination: trip?.destination ?? null,
					tripId: thread.tripId ?? null,
					tripTitle: trip?.title ?? null,
					updatedAt: thread.updatedAt,
				};
			})
		);
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

export const getPendingQuestion = query({
	args: {
		threadId: v.union(v.string(), v.null()),
	},
	handler: async (ctx, args) => {
		if (!args.threadId) {
			return null;
		}

		const identity = await getRequiredIdentity(ctx);
		const question = await ctx.db
			.query("chatQuestionPrompts")
			.withIndex("by_owner_thread_status_updatedAt", (q) =>
				q
					.eq("ownerId", identity.subject)
					.eq("threadId", args.threadId as string)
					.eq("status", "pending")
			)
			.order("desc")
			.first();

		if (!question) {
			return null;
		}

		return {
			_id: question._id,
			assistantMessageId: question.assistantMessageId,
			createdAt: question.createdAt,
			mode: normalizeChatMode(question.mode),
			options: question.options,
			question: question.question,
			stepLabel: question.stepLabel ?? null,
			threadId: question.threadId,
			updatedAt: question.updatedAt,
		};
	},
});

export const dismissPendingQuestion = mutation({
	args: {
		questionId: v.id("chatQuestionPrompts"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const question = await ctx.db.get(args.questionId);

		if (!question || question.ownerId !== identity.subject) {
			throw new ConvexError("QUESTION_NOT_FOUND");
		}

		await ctx.db.patch(args.questionId, {
			status: "dismissed",
			updatedAt: Date.now(),
		});

		return null;
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
		const now = Date.now();
		const trimmedPrompt = prompt.trim();

		if (!trimmedPrompt) {
			throw new ConvexError("PROMPT_REQUIRED");
		}

		if (trimmedPrompt.length > maxPromptLength) {
			throw new ConvexError("PROMPT_TOO_LONG");
		}

		if (prompt.split(lineBreakPattern).length > maxPromptLines) {
			throw new ConvexError("PROMPT_TOO_MANY_LINES");
		}

		if (mode === "trip") {
			if (!tripId) {
				throw new ConvexError("TRIP_CONTEXT_REQUIRED");
			}

			await ensureTripAccess(ctx, tripId, identity.subject);
			await maybeLogTripChatExpense(ctx, {
				prompt: trimmedPrompt,
				tripId,
			});
		}

		await clearPendingQuestionsForThread(ctx, {
			answerText: trimmedPrompt,
			ownerId: identity.subject,
			threadId,
		});

		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId,
			prompt: trimmedPrompt,
		});
		const existingThread = await ctx.db
			.query("chatThreads")
			.withIndex("by_owner_thread", (q) =>
				q.eq("ownerId", identity.subject).eq("threadId", threadId)
			)
			.unique();
		const threadPatch = {
			mode,
			preview: getPromptSnippet(trimmedPrompt, previewMaxLength),
			tripId,
			updatedAt: now,
		};

		if (existingThread) {
			await ctx.db.patch(existingThread._id, {
				...threadPatch,
				messageCount: existingThread.messageCount + 1,
			});
		} else {
			await ctx.db.insert("chatThreads", {
				...threadPatch,
				createdAt: now,
				messageCount: 1,
				ownerId: identity.subject,
				threadId,
				title: getPromptSnippet(trimmedPrompt, titleMaxLength),
			});
		}

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

export const linkThreadToTrip = mutation({
	args: {
		threadId: v.string(),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		const now = Date.now();

		const existingThread = await ctx.db
			.query("chatThreads")
			.withIndex("by_owner_thread", (q) =>
				q.eq("ownerId", identity.subject).eq("threadId", args.threadId)
			)
			.unique();

		if (!existingThread) {
			await ctx.db.insert("chatThreads", {
				createdAt: now,
				messageCount: 0,
				mode: "trip",
				ownerId: identity.subject,
				threadId: args.threadId,
				title: "Trip chat",
				tripId: args.tripId,
				updatedAt: now,
			});

			return null;
		}

		await ctx.db.patch(existingThread._id, {
			mode: "trip",
			tripId: args.tripId,
			updatedAt: now,
		});

		return null;
	},
});

export const clearPendingQuestions = internalMutation({
	args: {
		answerText: v.optional(v.string()),
		ownerId: v.string(),
		threadId: v.string(),
	},
	handler: async (ctx, args) => {
		await clearPendingQuestionsForThread(ctx, args);
		return null;
	},
});

export const recordPendingQuestionFromAssistant = internalMutation({
	args: {
		assistantMessageId: v.string(),
		mode: chatModeValidator,
		ownerId: v.string(),
		promptMessageId: v.string(),
		text: v.string(),
		threadId: v.string(),
	},
	handler: async (ctx, args) => {
		const parsedQuestion = extractQuestionPrompt(args.text);

		if (!parsedQuestion) {
			return null;
		}

		const now = Date.now();
		const pendingQuestions = await ctx.db
			.query("chatQuestionPrompts")
			.withIndex("by_owner_thread_status_updatedAt", (q) =>
				q
					.eq("ownerId", args.ownerId)
					.eq("threadId", args.threadId)
					.eq("status", "pending")
			)
			.take(10);

		for (const question of pendingQuestions) {
			await ctx.db.patch(question._id, {
				status: "dismissed",
				updatedAt: now,
			});
		}

		await ctx.db.insert("chatQuestionPrompts", {
			assistantMessageId: args.assistantMessageId,
			createdAt: now,
			mode: args.mode,
			options: parsedQuestion.options,
			ownerId: args.ownerId,
			promptMessageId: args.promptMessageId,
			question: parsedQuestion.question,
			stepLabel: parsedQuestion.stepLabel,
			status: "pending",
			threadId: args.threadId,
			updatedAt: now,
		});

		return null;
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
			expenses,
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
			ctx.db
				.query("expenses")
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
			expenses: expenses.map((expense) => ({
				amount: expense.amount,
				category: expense.category,
				currency: expense.currency,
				notes: expense.notes,
				spentAt: expense.spentAt,
				title: expense.title,
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
		const preferences = await ctx.runQuery(internal.preferences.getForOwner, {
			ownerId,
		});
		const preferenceContext = preferences
			? formatPreferenceContext(preferences)
			: undefined;

		await chatAgent.streamText(
			ctx,
			{ threadId },
			{
				promptMessageId,
				system: buildChatModeSystemPrompt(
					mode as ChatMode,
					tripContext,
					undefined,
					{
						preferenceContext,
					}
				),
			},
			{ saveStreamDeltas: true }
		);

		const messages = await listUIMessages(ctx, components.agent, {
			paginationOpts: { cursor: null, numItems: recentMessageLookupCount },
			threadId,
		});
		const latestAssistantMessage = messages.page
			.filter((message) => message.role === "assistant" && message.text.trim())
			.sort((first, second) => second._creationTime - first._creationTime)[0];

		if (!latestAssistantMessage) {
			return;
		}

		await ctx.runMutation(internal.chat.recordPendingQuestionFromAssistant, {
			assistantMessageId: latestAssistantMessage.id,
			mode,
			ownerId,
			promptMessageId,
			text: latestAssistantMessage.text,
			threadId,
		});
	},
});
