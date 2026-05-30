import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip vault grouped file contract", () => {
	it("keeps the chip filters connected to the saved file list", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/vault/trip-vault-screen.tsx"
		);

		expect(source).toContain("vaultGroupOptions");
		expect(source).toContain("VaultGroupChip");
		expect(source).toContain("filteredVaultItems");
		expect(source).toContain("selectedVaultGroup");
		expect(source).toContain("setSelectedVaultGroup(option.id)");
	});
});
