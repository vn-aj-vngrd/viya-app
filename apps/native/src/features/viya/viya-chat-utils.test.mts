import { describe, expect, test } from "bun:test";

import { getQuestionPromptOnlyDisplayText } from "./viya-chat-question-utils";
import {
	getPendingPromptInsertionIndex,
	getViyaBackRoute,
	isCurrentChatRequest,
} from "./viya-chat-utils";

describe("question prompt display", () => {
	test("collapses assistant question prompts to the question text", () => {
		const prompt = `Hi there! How can I help with your travel plans today?

1. Continue planning a Hong Kong trip
2. Ask about a different destination
3. Need assistance with documents, packing, or travel-safety tips
4. Type something else`;

		expect(getQuestionPromptOnlyDisplayText(prompt)).toBe(
			"Hi there! How can I help with your travel plans today?"
		);
	});
});

describe("pending prompt ordering", () => {
	test("inserts optimistic user prompts before new streamed assistant placeholders", () => {
		expect(
			getPendingPromptInsertionIndex({
				hasPersistedPendingPrompt: false,
				messageCount: 1,
				pendingPrompt: "Help me plan a trip",
				pendingPromptMessageIndex: 0,
			})
		).toBe(0);
	});

	test("does not insert optimistic prompts after they are persisted", () => {
		expect(
			getPendingPromptInsertionIndex({
				hasPersistedPendingPrompt: true,
				messageCount: 2,
				pendingPrompt: "Help me plan a trip",
				pendingPromptMessageIndex: 1,
				persistedPromptMessageIndex: 1,
			})
		).toBeNull();
	});

	test("keeps optimistic prompts before misordered persisted user messages", () => {
		expect(
			getPendingPromptInsertionIndex({
				hasPersistedPendingPrompt: true,
				messageCount: 2,
				pendingPrompt: "If we get delayed, what parts are sensitive?",
				pendingPromptMessageIndex: 0,
				persistedPromptMessageIndex: 1,
			})
		).toBe(0);
	});
});

describe("chat request freshness", () => {
	test("rejects stale async send continuations after a new chat starts", () => {
		expect(
			isCurrentChatRequest({
				activeSessionId: 2,
				requestSessionId: 1,
			})
		).toBe(false);
	});

	test("accepts async send continuations for the active chat session", () => {
		expect(
			isCurrentChatRequest({
				activeSessionId: 2,
				requestSessionId: 2,
			})
		).toBe(true);
	});
});

describe("Viya back route", () => {
	test("returns the explicit launch route before tab fallbacks", () => {
		expect(
			getViyaBackRoute({
				fromTab: "index",
				returnTo: "/(app)/trips/new",
			})
		).toBe("/(app)/trips/new");
	});

	test("falls back to the launching tab route", () => {
		expect(getViyaBackRoute({ fromTab: "trips" })).toBe("/(app)/(tabs)/trips");
	});

	test("uses home when no launch context is present", () => {
		expect(getViyaBackRoute({})).toBe("/(app)/(tabs)");
	});
});
