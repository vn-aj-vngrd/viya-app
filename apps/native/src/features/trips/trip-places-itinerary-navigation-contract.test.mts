import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");
const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip places itinerary navigation contract", () => {
	it("keeps places inside the itinerary screen as the Places segment", () => {
		const route = readWorkspaceFile(
			"apps/native/app/(app)/trips/[tripId]/places.tsx"
		);
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-itinerary-screen.tsx"
		);

		expect(route).toContain('initialSegment="places"');
		expect(source).toContain("PlacesContent");
		expect(source).toContain("PlacesSheets");
	});
});
