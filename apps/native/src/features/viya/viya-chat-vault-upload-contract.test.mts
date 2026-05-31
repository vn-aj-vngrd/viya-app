import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const readWorkspaceFile = (path: string) =>
	readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");

describe("Viya chat vault upload contract", () => {
	it("keeps trip chat uploads connected to Vault extraction and trip context sync", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/viya/viya-chat-screen.tsx"
		);

		expect(source).toContain("useVaultUpload");
		expect(source).toContain("pickDocument");
		expect(source).toContain("api.vault.confirmTripSyncReview");
		expect(source).toContain("TripSyncReviewSheet");
		expect(source).toContain("Upload a file to this trip Vault");
		expect(source).toContain("Upload a file for Viya");
		expect(source).toContain("Saved to Vault. Viya extracted the details");
	});
});
