import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip vault linked navigation contract", () => {
	it("keeps linked Vault file context navigable to the owning trip module", () => {
		const screenSource = readWorkspaceFile(
			"apps/native/src/features/vault/trip-vault-screen.tsx"
		);

		expect(screenSource).toContain("getVaultRelatedHref");
		expect(screenSource).toContain("VIYA_ROUTES.tripItinerary");
		expect(screenSource).toContain("VIYA_ROUTES.tripBookings");
		expect(screenSource).toContain("VIYA_ROUTES.tripBudget");
		expect(screenSource).toContain("VIYA_ROUTES.tripNotes");
		expect(screenSource).toContain("VIYA_ROUTES.tripRisks");
		expect(screenSource).toContain("editingHref");
		expect(screenSource).toContain("Open linked item");
		expect(screenSource).toContain("router.push(editingHref)");
	});
});
