import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("readiness top gap actions contract", () => {
	it("keeps the top readiness gap summary actionable", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/readiness/readiness-screen.tsx"
		);

		expect(source).toContain("NextUpRow");
		expect(source).toContain("Next up");
		expect(source).toContain("Open Vault");
		expect(source).toContain("Open travelers");
		expect(source).toContain("Mark done");
		expect(source).toContain('openSheet({ kind: "task", taskId: nextUp._id })');
	});
});
