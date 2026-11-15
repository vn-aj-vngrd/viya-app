import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("readiness category navigation contract", () => {
	it("keeps readiness tasks navigable to their owning trip module", () => {
		const screenSource = readWorkspaceFile(
			"apps/native/src/features/readiness/readiness-screen.tsx"
		);

		expect(screenSource).toContain("getReadinessCategoryHref");
		expect(screenSource).toContain("VIYA_ROUTES.tripVault");
		expect(screenSource).toContain("VIYA_ROUTES.tripBookings");
		expect(screenSource).toContain("VIYA_ROUTES.tripBudget");
		expect(screenSource).toContain("VIYA_ROUTES.tripItinerary");
		expect(screenSource).toContain("VIYA_ROUTES.tripCompanions");
		expect(screenSource).toContain("categoryLink");
		expect(screenSource).toContain("Open Vault");
		expect(screenSource).toContain("Link asChild");
	});
});
