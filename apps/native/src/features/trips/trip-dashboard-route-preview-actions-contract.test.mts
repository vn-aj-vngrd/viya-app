import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip dashboard route preview actions contract", () => {
	it("keeps itinerary and places preview rows connected to route modules", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-dashboard-tabs.tsx"
		);

		expect(source).toContain('actionLabel="Open itinerary item"');
		expect(source).toContain('actionLabel="Open saved place"');
		expect(source).toContain('actionLabel="Open itinerary stop"');
		expect(source).toContain("href={VIYA_ROUTES.tripItinerary(model.tripId)}");
		expect(source).toContain("href={VIYA_ROUTES.tripPlaces(model.tripId)}");
	});
});
