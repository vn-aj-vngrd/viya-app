import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const rootPath = resolve(import.meta.dirname, "../../..");
const historyModeArgPattern = /mode:\s*v\.optional\(chatModeValidator\)/;
const historyTripIdArgPattern = /tripId:\s*v\.optional\(v\.id\("trips"\)\)/;
const normalizedModeFilterPattern = /normalizedMode !== args\.mode/;
const tripIdFilterPattern = /thread\.tripId !== args\.tripId/;
const tripModeHistoryArgsPattern = /chatMode === "trip" && currentTripId/;
const tripModeArgPattern = /mode: "trip"/;
const currentModeHistoryArgsPattern = /mode: chatMode/;
const currentTripIdArgPattern = /tripId: currentTripId/;
const questionMarkerEmDashPattern = /\\s\\-–—/;
const markerLineQuestionPattern = /markerLineQuestion\?\.includes\("\?"\)/;
const spendIntentPattern = /spendIntentPattern|insert\("expenses"/;
const loadTripContextPattern = /loadTripContext/;
const expensesQueryPattern = /query\("expenses"\)/;
const maybeLogTripChatExpensePattern = /maybeLogTripChatExpense/;

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("chat history trip scoping", () => {
	it("lets the chat history query filter by mode and selected trip", () => {
		const source = readWorkspaceFile("packages/backend/convex/chat.ts");

		assert.match(source, historyModeArgPattern);
		assert.match(source, historyTripIdArgPattern);
		assert.match(source, normalizedModeFilterPattern);
		assert.match(source, tripIdFilterPattern);
	});

	it("passes trip-scoped history args from trip mode", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/viya/viya-chat-screen.tsx"
		);

		assert.match(source, tripModeHistoryArgsPattern);
		assert.match(source, tripModeArgPattern);
		assert.match(source, currentTripIdArgPattern);
	});

	it("passes mode-scoped history args from chat and plan modes", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/viya/viya-chat-screen.tsx"
		);

		assert.match(source, currentModeHistoryArgsPattern);
	});

	it("never writes expenses from chat text and shares the trip context loader", () => {
		const source = readWorkspaceFile("packages/backend/convex/chat.ts");
		const contextSource = readWorkspaceFile(
			"packages/backend/convex/lib/tripContext.ts"
		);

		assert.doesNotMatch(source, spendIntentPattern);
		assert.doesNotMatch(source, maybeLogTripChatExpensePattern);
		assert.match(source, loadTripContextPattern);
		assert.match(contextSource, expensesQueryPattern);
	});

	it("recognizes inline question labels from assistant output", () => {
		const source = readWorkspaceFile("packages/backend/convex/chat.ts");

		assert.match(source, questionMarkerEmDashPattern);
		assert.match(source, markerLineQuestionPattern);
	});
});
