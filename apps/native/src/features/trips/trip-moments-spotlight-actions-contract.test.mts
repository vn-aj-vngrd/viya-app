import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip moments spotlight actions contract", () => {
	it("keeps the spotlight moment summary actionable", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-moments-screen.tsx"
		);

		expect(source).toContain("toggleMomentHighlight");
		expect(source).toContain("Highlight");
		expect(source).toContain("Open Maps");
		expect(source).toContain("Open itinerary");
		expect(source).toContain("openEditSheet(moment)");
	});
});
