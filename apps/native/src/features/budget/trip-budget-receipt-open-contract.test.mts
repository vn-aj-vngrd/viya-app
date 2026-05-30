import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip budget receipt open contract", () => {
	it("keeps linked Vault receipts openable from recent expenses", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/budget/trip-budget-screen.tsx"
		);

		expect(source).toContain("Linking.openURL");
		expect(source).toContain("receiptUrlById");
		expect(source).toContain("handleOpenReceipt");
		expect(source).toContain("Open receipt");
		expect(source).toContain("item.url");
	});
});
