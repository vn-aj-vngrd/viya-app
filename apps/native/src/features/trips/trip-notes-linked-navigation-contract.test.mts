import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip notes linked navigation contract", () => {
	it("keeps linked note context navigable to the owning trip module", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-notes-screen.tsx"
		);

		expect(source).toContain("getNoteRelatedHref");
		expect(source).toContain("Open linked item");
		expect(source).toContain("VIYA_ROUTES.tripItinerary");
		expect(source).toContain("VIYA_ROUTES.tripBookings");
		expect(source).toContain("VIYA_ROUTES.tripVault");
		expect(source).toContain("VIYA_ROUTES.tripBudget");
		expect(source).toContain("VIYA_ROUTES.tripRisks");
	});
});
