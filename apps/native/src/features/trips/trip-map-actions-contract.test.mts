import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip map action contract", () => {
	it("keeps location-bearing module cards connected to native Maps", () => {
		const placesSource = readWorkspaceFile(
			"apps/native/src/features/trips/trip-places-screen.tsx"
		);
		const itinerarySource = readWorkspaceFile(
			"apps/native/src/features/trips/trip-itinerary-screen.tsx"
		);
		const bookingSource = readWorkspaceFile(
			"apps/native/src/features/bookings/booking-target-card.tsx"
		);
		const travelModeSource = readWorkspaceFile(
			"apps/native/src/features/trips/trip-travel-mode-screen.tsx"
		);
		const momentsSource = readWorkspaceFile(
			"apps/native/src/features/trips/trip-moments-screen.tsx"
		);

		for (const source of [
			placesSource,
			itinerarySource,
			bookingSource,
			travelModeSource,
			momentsSource,
		]) {
			expect(source).toContain("getTripMapSearchUrl");
			expect(source).toContain("hasTripMapSearchTarget");
			expect(source).toContain("Open Maps");
		}
	});
});
