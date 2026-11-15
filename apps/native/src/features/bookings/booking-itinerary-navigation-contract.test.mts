import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("booking itinerary navigation contract", () => {
	it("keeps scheduled booking targets navigable to the itinerary module", () => {
		const screenSource = readWorkspaceFile(
			"apps/native/src/features/bookings/booking-hub-screen.tsx"
		);

		expect(screenSource).toContain("VIYA_ROUTES.tripItinerary");
		expect(screenSource).toContain("itineraryHref");
		expect(screenSource).toContain("itineraryHref");
		expect(screenSource).toContain("Open itinerary");
		expect(screenSource).toContain("asChild");
	});
});
