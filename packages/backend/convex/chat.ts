import {
	createThread,
	listUIMessages,
	saveMessage,
	syncStreams,
	vStreamArgs,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import { internalAction, mutation, query } from "./_generated/server";
import { chatAgent } from "./agent";
import { getRequiredIdentity } from "./lib/auth";

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
	},
	handler: async (ctx, { threadId, prompt }) => {
		await getRequiredIdentity(ctx);
		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId,
			prompt,
		});
		await ctx.scheduler.runAfter(0, internal.chat.generateResponseAsync, {
			threadId,
			promptMessageId: messageId,
		});
		return messageId;
	},
});

export const generateResponseAsync = internalAction({
	args: {
		threadId: v.string(),
		promptMessageId: v.string(),
	},
	handler: async (ctx, { threadId, promptMessageId }) => {
		await chatAgent.streamText(
			ctx,
			{ threadId },
			{ promptMessageId },
			{ saveStreamDeltas: true }
		);
	},
});
