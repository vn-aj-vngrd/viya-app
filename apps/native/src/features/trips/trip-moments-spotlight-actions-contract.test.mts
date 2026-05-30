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

		expect(source).toContain("SpotlightMomentSummary");
		expect(source).toContain("spotlightItineraryHref");
		expect(source).toContain("Review spotlight");
		expect(source).toContain("Open spotlight Maps");
		expect(source).toContain("Open spotlight day");
		expect(source).toContain("openEditSheet(spotlightMoment)");
	});
});
