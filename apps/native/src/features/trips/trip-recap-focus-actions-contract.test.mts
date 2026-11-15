import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip recap focus actions contract", () => {
	it("keeps wrap-up rows connected to their source modules", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-recap-screen.tsx"
		);

		expect(source).toContain("router.push(VIYA_ROUTES.tripPlaces(tripId))");
		expect(source).toContain("router.push(VIYA_ROUTES.tripItinerary(tripId))");
		expect(source).toContain("VIYA_ROUTES.tripVault(tripId)");
		expect(source).toContain("router.push(VIYA_ROUTES.tripBudget(tripId))");
		expect(source).toContain("<WrapUpRow");
	});
});
