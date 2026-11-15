import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip travel mode empty document actions contract", () => {
	it("keeps empty travel-day booking and document panels connected to setup", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-travel-mode-screen.tsx"
		);

		expect(source).toContain('title="Bookings"');
		expect(source).toContain('title="Documents"');
		expect(source).toContain("router.push(VIYA_ROUTES.tripBookings(tripId))");
		expect(source).toContain("router.push(VIYA_ROUTES.tripVault(tripId))");
	});
});
