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
const currentTripIdArgPattern = /tripId: currentTripId/;
const spendIntentPattern = /spendIntentPattern/;
const maybeLogTripChatExpensePattern = /maybeLogTripChatExpense/;
const expensesContextPattern = /expenses: expenses\.map/;

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

	it("logs clear spend messages and includes expenses in trip chat context", () => {
		const source = readWorkspaceFile("packages/backend/convex/chat.ts");

		assert.match(source, spendIntentPattern);
		assert.match(source, maybeLogTripChatExpensePattern);
		assert.match(source, expensesContextPattern);
	});
});
