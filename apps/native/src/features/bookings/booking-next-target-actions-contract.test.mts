import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("booking next target actions contract", () => {
	it("keeps the next booking target summary actionable", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/bookings/booking-hub-screen.tsx"
		);

		expect(source).toContain("NextBookingTargetSummary");
		expect(source).toContain("Review next target");
		expect(source).toContain("Open next Maps");
		expect(source).toContain("Open next itinerary");
		expect(source).toContain("Open next proof");
		expect(source).toContain("openEditSheet(nextBooking)");
	});
});
