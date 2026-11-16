import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const readWorkspaceFile = (path: string) =>
	readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

const toolNamePattern = /^\t\t(\w+): createTool\(/gm;
const internalFunctionPattern =
	/export const \w+ = internal(?:Query|Mutation)\(/g;
const ownedTripCallPattern = /await getOwnedTrip\(/g;
const dbWritePattern = /ctx\.db\.(?:insert|patch|replace|delete)\(\s*"?\w*/g;
const directDbPattern = /ctx\.db\./;
const proposeDraftCallPattern =
	/runMutation\(\s*internal\.ai\.chatToolsInternals\.proposeDraft/;
const tripPatchPattern = /ctx\.db\.patch\(args\.tripId/;
const prepareStepPattern = /prepareStep/;
const finalStepPattern = /getFinalStepSettings\(stepNumber, CHAT_MAX_STEPS\)/;
const missingReplyPattern = /buildMissingReplyText\(await result\.steps\)/;

const tripChatTools = () =>
	Array.from(
		readWorkspaceFile("packages/backend/convex/ai/chatTools.ts").matchAll(
			toolNamePattern
		),
		(match) => match[1]
	);

describe("trip chat tools contract", () => {
	it("keeps every chat write path draft-first", () => {
		const toolsSource = readWorkspaceFile(
			"packages/backend/convex/ai/chatTools.ts"
		);
		const internalsSource = readWorkspaceFile(
			"packages/backend/convex/ai/chatToolsInternals.ts"
		);
		const writes = Array.from(
			internalsSource.matchAll(dbWritePattern),
			(match) => match[0]
		);

		assert.doesNotMatch(toolsSource, directDbPattern);
		assert.match(toolsSource, proposeDraftCallPattern);
		assert.deepEqual(writes, ['ctx.db.insert("tripAgentDrafts']);
	});

	it("re-checks trip ownership in every internal tool function", () => {
		const internalsSource = readWorkspaceFile(
			"packages/backend/convex/ai/chatToolsInternals.ts"
		);
		const functionCount = internalsSource.match(
			internalFunctionPattern
		)?.length;
		const ownershipChecks = internalsSource.match(ownedTripCallPattern)?.length;

		assert.ok(functionCount && functionCount >= 11);
		assert.equal(ownershipChecks, functionCount);
	});

	it("names every propose tool in the trip prompt and gives each read a UI label", () => {
		const promptSource = readWorkspaceFile(
			"packages/backend/convex/ai/prompts.ts"
		);
		const chatUtilsSource = readWorkspaceFile(
			"apps/native/src/features/viya/viya-chat-utils.ts"
		);
		const tools = tripChatTools();

		assert.ok(tools.length >= 17);

		for (const tool of tools) {
			if (tool.startsWith("propose")) {
				assert.match(promptSource, new RegExp(`\\b${tool}\\b`), tool);
			} else {
				assert.match(chatUtilsSource, new RegExp(`\\b${tool}:`), tool);
			}
		}
	});

	it("always ends a trip reply in text and does not mark drafts stale on save", () => {
		const chatSource = readWorkspaceFile("packages/backend/convex/chat.ts");
		const internalsSource = readWorkspaceFile(
			"packages/backend/convex/ai/tripAgentInternals.ts"
		);

		assert.match(chatSource, prepareStepPattern);
		assert.match(chatSource, finalStepPattern);
		assert.match(chatSource, missingReplyPattern);
		assert.doesNotMatch(internalsSource, tripPatchPattern);
	});
});
