import { describe, expect, test } from "bun:test";

import {
	getQuestionDockContainerClassName,
	getQuestionPromptOnlyDisplayText,
	shouldUseQuestionFocusMode,
} from "./viya-chat-question-utils";

describe("question focus mode", () => {
	test("uses focused question input when a pending question is visible", () => {
		expect(
			shouldUseQuestionFocusMode({
				hasPendingQuestion: true,
				shouldShowSlashCommandMenu: false,
			})
		).toBe(true);
	});

	test("keeps the composer available when slash commands are visible", () => {
		expect(
			shouldUseQuestionFocusMode({
				hasPendingQuestion: true,
				shouldShowSlashCommandMenu: true,
			})
		).toBe(false);
	});

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

	test("floats focused question cards above the conversation without a dock gap", () => {
		expect(getQuestionDockContainerClassName(true)).toContain("z-30");
		expect(getQuestionDockContainerClassName(true)).not.toContain(
			"bg-background"
		);
		expect(getQuestionDockContainerClassName(true)).not.toContain("pt-3");
		expect(getQuestionDockContainerClassName(false)).toBe("relative z-10");
	});
});
