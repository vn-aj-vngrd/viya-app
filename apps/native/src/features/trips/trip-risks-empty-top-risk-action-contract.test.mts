import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip risks empty top risk action contract", () => {
	it("keeps the empty risks list connected to risk capture", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/readiness/readiness-screen.tsx"
		);

		expect(source).toContain("No risks for this trip");
		expect(source).toContain("onAddRisk");
		expect(source).toContain('label: "Add risk"');
		expect(source).toContain('openSheet({ kind: "risk" })');
	});
});
