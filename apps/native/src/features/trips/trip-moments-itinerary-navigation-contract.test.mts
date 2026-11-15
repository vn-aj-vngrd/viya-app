import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip moments itinerary navigation contract", () => {
	it("keeps day-linked moments navigable to the itinerary module", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-moments-screen.tsx"
		);

		expect(source).toContain("VIYA_ROUTES.tripItinerary");
		expect(source).toContain("itineraryHref");
		expect(source).toContain("Open itinerary");
		expect(source).toContain("router.push(VIYA_ROUTES.tripItinerary(tripId))");
	});
});
