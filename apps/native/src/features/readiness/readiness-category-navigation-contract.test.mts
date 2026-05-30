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
		const rowSource = readWorkspaceFile(
			"apps/native/src/features/readiness/readiness-item-row.tsx"
		);
		const cardSource = readWorkspaceFile(
			"apps/native/src/features/readiness/readiness-category-card.tsx"
		);

		expect(screenSource).toContain("getReadinessCategoryHref");
		expect(screenSource).toContain("VIYA_ROUTES.tripVault");
		expect(screenSource).toContain("VIYA_ROUTES.tripBookings");
		expect(screenSource).toContain("VIYA_ROUTES.tripBudget");
		expect(screenSource).toContain("VIYA_ROUTES.tripItinerary");
		expect(screenSource).toContain("VIYA_ROUTES.tripCompanions");
		expect(screenSource).toContain("VIYA_ROUTES.tripRisks");
		expect(rowSource).toContain("categoryHref");
		expect(rowSource).toContain("Open category");
		expect(rowSource).toContain("Link asChild");
		expect(cardSource).toContain("categoryHref");
		expect(cardSource).toContain("Open module");
		expect(cardSource).toContain("Link asChild");
	});
});
