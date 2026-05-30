import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip places route board actions contract", () => {
	it("keeps the route board overview actionable", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-places-screen.tsx"
		);

		expect(source).toContain("RouteBoardActions");
		expect(source).toContain("Add route place");
		expect(source).toContain("Open route itinerary");
		expect(source).toContain("onAddPlace={openCreateSheet}");
		expect(source).toContain(
			"itineraryHref={VIYA_ROUTES.tripItinerary(tripId)}"
		);
	});
});
