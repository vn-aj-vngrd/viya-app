import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const rootPath = resolve(import.meta.dirname, "../../..");
const createAssigneeArgPattern =
	/assignedToMemberId: v\.optional\(v\.string\(\)\),/;
const createAssigneePatchPattern =
	/\.\.\.\(await getReadinessAssigneePatch\(\s*ctx,\s*args\.assignedToMemberId,\s*args\.tripId\s*\)\)/;
const companionMismatchPattern =
	/throw new ConvexError\("COMPANION_TRIP_MISMATCH"\)/;
const explicitAssigneeUpdatePattern =
	/const shouldUpdateAssignee = hasOwnObjectProperty\(\s*args,\s*"assignedToMemberId"\s*\)/;
const staleCreateThenUpdatePattern =
	/const createdItem = await createReadinessItem/;
const atomicCreateAssigneePattern =
	/await createReadinessItem\(\{\s*\.\.\.taskPatch,\s*assignedToMemberId,\s*tripId,\s*\}\)/;
const backendSortReadinessPattern =
	/sortReadinessItemsForReview\(\s*items\s*\)/;
const workspaceSortReadinessPattern =
	/sortedReadinessItems\s*=\s*sortReadinessItemsForReview\(readinessItems\)/;
const workspaceReturnsSortedReadinessPattern =
	/readinessItems:\s*sortedReadinessItems/;
const screenSortReadinessPattern =
	/sortedReadinessItems\s*=\s*sortReadinessItemsForReview\(readinessItems\)/;
const screenMapsSortedReadinessPattern =
	/sortedReadinessItems\.map\(\(item\) =>/;

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip readiness contract", () => {
	it("validates and normalizes checklist assignees against trip companions", () => {
		const source = readWorkspaceFile("packages/backend/convex/readiness.ts");

		assert.match(
			source,
			createAssigneeArgPattern,
			"createReadinessItem should accept an optional assignee"
		);
		assert.match(
			source,
			createAssigneePatchPattern,
			"createReadinessItem should normalize assignees before insert"
		);
		assert.match(
			source,
			companionMismatchPattern,
			"readiness assignees should be validated against the trip"
		);
		assert.match(
			source,
			explicitAssigneeUpdatePattern,
			"updateReadinessItemDetails should distinguish omitted assignees from clear requests"
		);
	});

	it("creates assigned checklist tasks in a single mutation from the native UI", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/readiness/readiness-screen.tsx"
		);

		assert.doesNotMatch(
			source,
			staleCreateThenUpdatePattern,
			"readiness task creation should not create and then patch the assignee"
		);
		assert.match(
			source,
			atomicCreateAssigneePattern,
			"readiness task creation should include the assignee in createReadinessItem"
		);
	});

	it("orders checklist gaps by review urgency across query, workspace, and screen", () => {
		const readinessSource = readWorkspaceFile(
			"packages/backend/convex/readiness.ts"
		);
		const workspaceSource = readWorkspaceFile(
			"packages/backend/convex/tripWorkspace.ts"
		);
		const screenSource = readWorkspaceFile(
			"apps/native/src/features/readiness/readiness-screen.tsx"
		);

		assert.match(
			readinessSource,
			backendSortReadinessPattern,
			"listReadinessItems should use the shared readiness review order"
		);
		assert.match(
			workspaceSource,
			workspaceSortReadinessPattern,
			"getTripWorkspace should sort readiness items for dashboard previews"
		);
		assert.match(
			workspaceSource,
			workspaceReturnsSortedReadinessPattern,
			"getTripWorkspace should return sorted readiness items"
		);
		assert.match(
			screenSource,
			screenSortReadinessPattern,
			"ReadinessScreen should keep its visible checklist in shared review order"
		);
		assert.match(
			screenSource,
			screenMapsSortedReadinessPattern,
			"ReadinessScreen should render the sorted checklist"
		);
	});
});
