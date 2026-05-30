import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip places itinerary navigation contract", () => {
	it("keeps itinerary-backed places navigable to the itinerary module", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-places-screen.tsx"
		);

		expect(source).toContain("VIYA_ROUTES.tripItinerary");
		expect(source).toContain("itineraryHref");
		expect(source).toContain("Open itinerary");
		expect(source).toContain("asChild");
	});
});
