import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip places empty assignment itinerary action contract", () => {
	it("keeps the no-days assignment state connected to itinerary planning", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-places-screen.tsx"
		);

		expect(source).toContain("Add itinerary days first");
		expect(source).toContain("itineraryHref");
		expect(source).toContain("Plan itinerary days");
		expect(source).toContain(
			"itineraryHref={VIYA_ROUTES.tripItinerary(tripId)}"
		);
	});
});
