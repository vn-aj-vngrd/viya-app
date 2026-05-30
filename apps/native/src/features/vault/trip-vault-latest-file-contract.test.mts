import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip vault latest file contract", () => {
	it("keeps the latest file summary actionable", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/vault/trip-vault-screen.tsx"
		);

		expect(source).toContain("latestFileRelatedHref");
		expect(source).toContain("Open latest file");
		expect(source).toContain("Edit latest file");
		expect(source).toContain("Open latest link");
		expect(source).toContain("openEditSheet(latestFile)");
	});
});
