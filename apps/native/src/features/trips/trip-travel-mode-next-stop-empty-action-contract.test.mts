import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip travel mode next stop empty action contract", () => {
	it("keeps the empty next-stop state connected to itinerary planning", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-travel-mode-screen.tsx"
		);

		expect(source).toContain("No upcoming item found.");
		expect(source).toContain("Plan next stop");
		expect(source).toContain("href={VIYA_ROUTES.tripItinerary(tripId)}");
	});
});
