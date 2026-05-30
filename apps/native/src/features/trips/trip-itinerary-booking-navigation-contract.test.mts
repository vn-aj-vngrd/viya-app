import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip itinerary booking navigation contract", () => {
	it("keeps itinerary stops with linked bookings navigable to Booking Hub", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-itinerary-screen.tsx"
		);

		expect(source).toContain("VIYA_ROUTES.tripBookings");
		expect(source).toContain("asChild");
		expect(source).toContain("Open booking");
	});
});
