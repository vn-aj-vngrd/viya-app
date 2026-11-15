import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip travel mode empty risks action contract", () => {
	it("keeps the empty travel-day risks panel connected to backup planning", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-travel-mode-screen.tsx"
		);

		expect(source).toContain('title="Risks"');
		expect(source).toContain('title="Add a risk"');
		expect(source).toContain("router.push(VIYA_ROUTES.tripRisks(tripId))");
	});
});
