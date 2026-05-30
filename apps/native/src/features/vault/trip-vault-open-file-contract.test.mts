import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip vault open file contract", () => {
	it("keeps saved Vault files openable from the trip Vault screen", () => {
		const screenSource = readWorkspaceFile(
			"apps/native/src/features/vault/trip-vault-screen.tsx"
		);
		const cardSource = readWorkspaceFile(
			"apps/native/src/features/vault/vault-preview-card.tsx"
		);

		expect(screenSource).toContain("Linking.openURL");
		expect(screenSource).toContain("onOpenFile");
		expect(screenSource).toContain("url={item.url");
		expect(cardSource).toContain("onOpenFile");
		expect(cardSource).toContain("Open file");
	});
});
