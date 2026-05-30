import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip vault add sheet contract", () => {
	it("keeps the header add action connected to document upload", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/vault/trip-vault-screen.tsx"
		);

		expect(source).toContain("VaultAddSheet");
		expect(source).toContain("isUploading");
		expect(source).toContain("Add to vault");
		expect(source).toContain('accessibilityLabel="Add file to vault"');
		expect(source).toContain('pickDocument({ kind: "document", tripId })');
	});
});
