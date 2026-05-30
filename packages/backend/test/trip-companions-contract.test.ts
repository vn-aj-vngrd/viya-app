import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const rootPath = resolve(import.meta.dirname, "../../..");
const companionListSortPattern =
	/sortTripCompanionsForCoordination\(\s*companions\s*\)/;
const workspaceCompanionSortPattern =
	/sortedCompanions\s*=\s*sortTripCompanionsForCoordination\(companions\)/;
const workspaceReturnsSortedCompanionsPattern =
	/companions:\s*sortedCompanions/;

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip companion contract", () => {
	it("keeps companion coordination order consistent across query and workspace", () => {
		const companionsSource = readWorkspaceFile(
			"packages/backend/convex/companions.ts"
		);
		const workspaceSource = readWorkspaceFile(
			"packages/backend/convex/tripWorkspace.ts"
		);

		assert.match(
			companionsSource,
			companionListSortPattern,
			"listTripCompanions should prioritize organizers and emergency contacts"
		);
		assert.match(
			workspaceSource,
			workspaceCompanionSortPattern,
			"getTripWorkspace should use the shared companion coordination order"
		);
		assert.match(
			workspaceSource,
			workspaceReturnsSortedCompanionsPattern,
			"getTripWorkspace should return sorted companions"
		);
	});
});
